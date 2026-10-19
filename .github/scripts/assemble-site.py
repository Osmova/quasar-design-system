#!/usr/bin/env python3
"""Assemble only the three verified static builds; never rebuild here."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil


def assemble(gallery, histoire, storybook, output, sha, run_id, repository):
    if not re.fullmatch(r"[0-9a-f]{40}", sha) or not re.fullmatch(r"[0-9]+", str(run_id)):
        raise ValueError("Invalid release identity")
    if output.exists():
        raise ValueError("Output must not already exist")
    for source in (gallery, histoire, storybook):
        if source.is_symlink() or not source.is_dir():
            raise ValueError("Missing build directory")
        for path in source.rglob("*"):
            if path.is_symlink() or not (path.is_file() or path.is_dir()):
                raise ValueError("Build contains non-regular entry")
            if any(part.startswith(".") for part in path.relative_to(source).parts):
                raise ValueError("Build contains hidden entry")
            if "\\" in str(path) or any(ord(c) < 32 or ord(c) == 127 for c in str(path)):
                raise ValueError("Unsafe build path")
    if any((gallery / name).exists() for name in ("histoire", "storybook", "release.json", "SHA256SUMS")):
        raise ValueError("Build collides with reserved site paths")
    shutil.copytree(gallery, output)
    shutil.copytree(histoire, output / "histoire")
    shutil.copytree(storybook, output / "storybook")
    for name in ("index.html", "histoire/index.html", "storybook/index.html",
                 "conformance.html", "conformance-layered.html"):
        if not (output / name).is_file():
            raise ValueError("Missing required page: " + name)
    (output / "release.json").write_text(json.dumps({
        "sha": sha, "run_id": str(run_id), "repository": repository,
    }, sort_keys=True) + "\n", encoding="utf-8")
    lines = []
    for path in sorted(output.rglob("*")):
        if path.is_file():
            lines.append(hashlib.sha256(path.read_bytes()).hexdigest() + "  " + path.relative_to(output).as_posix())
    (output / "SHA256SUMS").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sha", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--gallery", default="examples/gallery/dist")
    parser.add_argument("--histoire", default=".histoire/dist")
    parser.add_argument("--storybook", default="examples/storybook/storybook-static")
    parser.add_argument("--output", default="site")
    args = parser.parse_args()
    assemble(Path(args.gallery), Path(args.histoire), Path(args.storybook), Path(args.output),
             args.sha, args.run_id, args.repository)
