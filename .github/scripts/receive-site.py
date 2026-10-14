#!/usr/bin/env python3
"""Root-owned forced-command receiver; uploads are data, never commands.

Provision /var/www/qds/releases for the dedicated unprivileged deploy user.
Keep this executable and its parent directories outside that user's write access.
Health-check rollback is operator-owned; previous releases are never removed.
"""
import fcntl
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import sys
import tarfile
import tempfile
import uuid

BASE = Path("/var/www/qds")
COMPRESSED_LIMIT = 128 * 1024 * 1024
EXPANDED_LIMIT = 256 * 1024 * 1024
MEMBER_LIMIT = 10000
SITE_BYTE_LIMIT = 256 * 1024 * 1024
SITE_ENTRY_LIMIT = 10000
REPOSITORY = "Osmova/quasar-design-system"
REQUIRED = {"index.html", "histoire/index.html", "conformance.html", "conformance-layered.html"}


def parse_command(command):
    match = re.fullmatch(r"deploy ([0-9a-f]{40}) ([0-9]+)", command)
    if not match:
        raise ValueError("Only deploy <sha> <run-id> is accepted")
    return match.groups()


def safe_path(name):
    if not name or name.startswith("/") or "\\" in name or any(ord(c) < 32 or ord(c) == 127 for c in name):
        raise ValueError("Unsafe archive path")
    parts = name.split("/")
    if ".." in parts or any(p.startswith(".") and p != "." for p in parts):
        raise ValueError("Unsafe archive path")
    return PurePosixPath(name).as_posix()


def bounded_copy(source, target, limit):
    total = 0
    while True:
        block = source.read(min(1024 * 1024, limit - total + 1))
        if not block:
            return total
        total += len(block)
        if total > limit:
            raise ValueError("Upload exceeds size limit")
        target.write(block)


def extract(stream, stage):
    files, entries = set(), {}
    file_bytes = 0
    # Bound the whole decompressed stream, including PAX headers and padding.
    with tempfile.TemporaryFile() as compressed, tempfile.TemporaryFile() as expanded:
        bounded_copy(stream, compressed, COMPRESSED_LIMIT)
        compressed.seek(0)
        with gzip.GzipFile(fileobj=compressed) as archive:
            bounded_copy(archive, expanded, EXPANDED_LIMIT)
        expanded.seek(0)
        with tarfile.open(fileobj=expanded, mode="r:") as archive:
            for count, member in enumerate(archive, 1):
                if count > MEMBER_LIMIT:
                    raise ValueError("Too many archive members")
                name = safe_path(member.name)
                if not (member.isdir() or member.type in (tarfile.REGTYPE, tarfile.AREGTYPE)) or member.sparse is not None:
                    raise ValueError("Only regular files and directories allowed")
                file_bytes += member.size
                if member.size < 0 or file_bytes > EXPANDED_LIMIT:
                    raise ValueError("Expanded files exceed size limit")
                if name in entries or (name == "." and not member.isdir()):
                    raise ValueError("Duplicate or invalid archive entry")
                parents = PurePosixPath(name).parents
                if any(entries.get(str(parent)) == "file" for parent in parents):
                    raise ValueError("File/directory collision")
                if member.isreg() and any(p.startswith(name + "/") for p in entries):
                    raise ValueError("File/directory collision")
                entries[name] = "dir" if member.isdir() else "file"
                target = stage / name
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True, mode=0o755)
                else:
                    target.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
                    with archive.extractfile(member) as source, target.open("xb") as dest:
                        if bounded_copy(source, dest, member.size) != member.size:
                            raise ValueError("Truncated file")
                    target.chmod(0o644)
                    files.add(name)
    for directory, _, _ in os.walk(stage):
        Path(directory).chmod(0o755)
    return files


def read_manifest(stage):
    path = stage / "SHA256SUMS"
    if path.is_symlink() or not path.is_file():
        raise ValueError("Unsafe checksum manifest")
    with path.open("rb") as source:
        data = source.read(EXPANDED_LIMIT + 1)
    if len(data) > EXPANDED_LIMIT:
        raise ValueError("Checksum manifest exceeds size limit")
    manifest = {}
    for line in data.decode("utf-8").splitlines():
        match = re.fullmatch(r"([0-9a-f]{64})  (.+)", line)
        if not match:
            raise ValueError("Malformed checksum entry")
        digest, name = match.groups()
        if safe_path(name) != name or name in manifest:
            raise ValueError("Invalid or duplicate checksum path")
        manifest[name] = digest
        if len(manifest) > MEMBER_LIMIT:
            raise ValueError("Too many checksum entries")
    return manifest


def validate(stage, files, sha, run_id):
    if not REQUIRED.issubset(files) or not {"release.json", "SHA256SUMS"}.issubset(files):
        raise ValueError("Missing required site files")
    manifest = read_manifest(stage)
    if set(manifest) != files - {"SHA256SUMS"}:
        raise ValueError("Checksum file set mismatch")
    for name, digest in manifest.items():
        with (stage / name).open("rb") as source:
            if hashlib.file_digest(source, "sha256").hexdigest() != digest:
                raise ValueError("Checksum mismatch")
    release = json.loads((stage / "release.json").read_text(encoding="utf-8"))
    if release != {"sha": sha, "run_id": run_id, "repository": REPOSITORY}:
        raise ValueError("Release identity mismatch")


def previous_release(base):
    current = base / "current"
    if not current.is_symlink():
        if current.exists():
            raise ValueError("Current must be a release symlink")
        return None
    previous = current.resolve(strict=True)
    if previous.parent != (base / "releases").resolve(strict=True) or not previous.is_dir():
        raise ValueError("Current target is not a child release")
    return previous


def stage_budget(stage):
    paths, total = {"."}, 0
    for directory, dirs, names in os.walk(stage, followlinks=False):
        for name in dirs + names:
            path = Path(directory) / name
            info = path.lstat()
            if not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)):
                raise ValueError("Unsafe staged entry")
            paths.add(path.relative_to(stage).as_posix())
            if stat.S_ISREG(info.st_mode):
                total += info.st_size
            if total > SITE_BYTE_LIMIT or len(paths) > SITE_ENTRY_LIMIT:
                raise ValueError("Aggregate site budget exceeded")
    return paths, total


def preserve_assets(previous, stage):
    paths, total = stage_budget(stage)
    if previous is None:
        return
    planned = []
    # The previous artifact manifest excludes inherited assets, bounding retention
    # to the incoming and immediately previous artifact rather than a growing union.
    for name, digest in read_manifest(previous).items():
        if not name.startswith(("assets/", "histoire/assets/")):
            continue
        source = previous / name
        for parent in PurePosixPath(name).parents:
            if not stat.S_ISDIR((previous / parent).lstat().st_mode):
                raise ValueError("Unsafe previous asset directory")
        info = source.lstat()
        if not stat.S_ISREG(info.st_mode):
            raise ValueError("Unsafe previous asset entry")
        target = stage / name
        if target.exists():
            continue
        total += info.st_size
        paths.add(name)
        paths.update(str(parent) for parent in PurePosixPath(name).parents)
        if total > SITE_BYTE_LIMIT or len(paths) > SITE_ENTRY_LIMIT:
            raise ValueError("Aggregate site budget exceeded")
        planned.append((source, target, info.st_size, digest))
    # Preflight the entire union before copying even the first old asset.
    for source, target, size, digest in planned:
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
        with source.open("rb") as src, target.open("xb") as dst:
            if bounded_copy(src, dst, size) != size:
                raise ValueError("Previous asset size changed")
        target.chmod(0o644)
        with target.open("rb") as copied:
            if hashlib.file_digest(copied, "sha256").hexdigest() != digest:
                raise ValueError("Previous asset checksum mismatch")
    stage_budget(stage)


def receive(command, stream, base=BASE):
    sha, run_id = parse_command(command)
    releases = base / "releases"
    if releases.is_symlink() or not releases.is_dir():
        raise ValueError("Releases must be a provisioned real directory")
    stage = Path(tempfile.mkdtemp(prefix=".incoming-", dir=releases))
    link = base / (".current-" + uuid.uuid4().hex)
    try:
        files = extract(stream, stage)
        validate(stage, files, sha, run_id)
        with (base / ".deploy.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            previous = previous_release(base)
            preserve_assets(previous, stage)
            for directory, _, _ in os.walk(stage):
                Path(directory).chmod(0o755)
            release = releases / (sha + "-" + run_id + "-" + uuid.uuid4().hex)
            os.replace(stage, release)
            link.symlink_to(Path("releases") / release.name)
            os.replace(link, base / "current")
            return release
    finally:
        if stage.exists():
            shutil.rmtree(stage)
        if link.is_symlink():
            link.unlink()


if __name__ == "__main__":
    try:
        if len(sys.argv) != 1:
            raise ValueError("CLI arguments are not accepted")
        receive(os.environ.get("SSH_ORIGINAL_COMMAND", ""), sys.stdin.buffer)
    except (ValueError, OSError, EOFError, tarfile.TarError) as error:
        print("Deployment rejected: " + str(error), file=sys.stderr)
        sys.exit(1)
