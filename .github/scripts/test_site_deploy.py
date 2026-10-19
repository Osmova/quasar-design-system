"""Stdlib regression fixtures for the public artifact/forced-command boundary."""
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch


def load(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


receiver = load("receive-site")
assembler = load("assemble-site")
SHA = "a" * 40
RUN = "123"
COMMAND = "deploy " + SHA + " " + RUN


def fixture(sha=SHA, run_id=RUN, repository=receiver.REPOSITORY):
    files = {name: b"<!doctype html><html>fixture</html>" for name in receiver.REQUIRED}
    files.update({"assets/new-abc123.js": b"gallery", "histoire/assets/new-def456.js": b"catalog"})
    files["release.json"] = json.dumps({"sha": sha, "run_id": run_id, "repository": repository}).encode()
    manifest(files)
    return files


def manifest(files):
    files["SHA256SUMS"] = "".join(hashlib.sha256(data).hexdigest() + "  " + name + "\n"
                                 for name, data in sorted(files.items()) if name != "SHA256SUMS").encode()


def archive(files, extra=()):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as tar:
        root = tarfile.TarInfo(".")
        root.type = tarfile.DIRTYPE
        tar.addfile(root)
        for name, data in files.items():
            entry = tarfile.TarInfo("./" + name)
            entry.size = len(data)
            entry.mode = 0o777
            entry.uid = 0
            tar.addfile(entry, io.BytesIO(data))
        for entry, data in extra:
            tar.addfile(entry, io.BytesIO(data) if data is not None else None)
    buffer.seek(0)
    return buffer


class ReceiverTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        (self.base / "releases").mkdir()

    def receive(self, files=None, extra=(), command=COMMAND):
        return receiver.receive(command, archive(fixture() if files is None else files, extra), self.base)

    def reject(self, files=None, extra=(), command=COMMAND):
        with self.assertRaises((ValueError, OSError, tarfile.TarError, EOFError)):
            self.receive(files, extra, command)
        self.assertFalse((self.base / "current").exists())
        self.assertEqual(list((self.base / "releases").iterdir()), [])

    def test_valid_upload_and_permissions(self):
        release = self.receive()
        self.assertEqual((self.base / "current").resolve(), release)
        self.assertEqual(json.loads((release / "release.json").read_text())["sha"], SHA)
        for path in release.rglob("*"):
            self.assertEqual(path.stat().st_mode & 0o777, 0o755 if path.is_dir() else 0o644)
        self.assertEqual(release.stat().st_mode & 0o777, 0o755)

    def test_release_identity(self):
        for files in (fixture(sha="b" * 40), fixture(run_id="124"), fixture(repository="other/repo")):
            with self.subTest(identity=files["release.json"]):
                self.reject(files)

    def test_bad_checksum_and_missing_extra_entries(self):
        files = fixture()
        files["index.html"] = b"tampered"
        self.reject(files)
        files = fixture()
        files["extra.js"] = b"unlisted"
        self.reject(files)
        files = fixture()
        del files["assets/new-abc123.js"]
        self.reject(files)
        files = fixture()
        files["SHA256SUMS"] += hashlib.sha256(b"missing").hexdigest().encode() + b"  absent.js\n"
        self.reject(files)

    def test_malformed_duplicate_and_incomplete_manifest(self):
        for data in (b"bad\n", fixture()["SHA256SUMS"] * 2, b"", b"A" * 64 + b"  index.html\n"):
            with self.subTest(data=data[:80]):
                files = fixture()
                files["SHA256SUMS"] = data
                self.reject(files)
        files = fixture()
        files["SHA256SUMS"] = files["SHA256SUMS"].replace(b"  index.html", b"  ./index.html")
        self.reject(files)

    def test_required_pages(self):
        for name in receiver.REQUIRED | {"release.json", "SHA256SUMS"}:
            with self.subTest(name=name):
                files = fixture()
                del files[name]
                if name != "SHA256SUMS":
                    manifest(files)
                self.reject(files)

    def test_unsafe_paths_and_duplicate_normalized_paths(self):
        for name in ("../escape", "/absolute", "a/../../escape", "a\\b", "a\nb", "a\x7fb", ".ssh/key",
                     "./index.html", "index.html", "././index.html", "assets//new-abc123.js"):
            with self.subTest(name=name):
                entry = tarfile.TarInfo(name)
                entry.size = 1
                self.reject(extra=[(entry, b"x")])

    def test_links_and_special_entries(self):
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.CHRTYPE, tarfile.BLKTYPE,
                     tarfile.FIFOTYPE, tarfile.GNUTYPE_SPARSE):
            with self.subTest(kind=kind):
                entry = tarfile.TarInfo("special")
                entry.type = kind
                entry.linkname = "index.html"
                self.reject(extra=[(entry, None)])

    def test_file_directory_ancestor_collisions(self):
        for names in (("collision", "collision/child"), ("collision/child", "collision")):
            entries = []
            for name in names:
                entry = tarfile.TarInfo(name)
                entry.size = 1
                entries.append((entry, b"x"))
            self.reject(extra=entries)
        entry = tarfile.TarInfo("index.html/child")
        entry.type = tarfile.DIRTYPE
        self.reject(extra=[(entry, None)])

    def test_bounds(self):
        for constant, value in (("COMPRESSED_LIMIT", 32), ("EXPANDED_LIMIT", 1024), ("MEMBER_LIMIT", 2)):
            with self.subTest(limit=constant), patch.object(receiver, constant, value):
                self.reject()

    def test_malformed_commands(self):
        for command in ("", COMMAND + "\n", COMMAND + "; id", "rollback " + SHA + " 123",
                        "deploy " + "A" * 40 + " 1", "deploy " + SHA + " -1", "deploy 123 1"):
            with self.subTest(command=command):
                self.reject(command=command)
        result = subprocess.run([sys.executable, receiver.__file__, "--base", self.temp.name],
                                input=b"", capture_output=True, env={**os.environ, "SSH_ORIGINAL_COMMAND": COMMAND})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b"CLI arguments are not accepted", result.stderr)

    def test_atomic_promotion_preserves_previous_and_assets(self):
        previous = fixture()
        previous["assets/old-hash.js"] = b"old gallery"
        previous["histoire/assets/old-hash.js"] = b"old catalog"
        manifest(previous)
        old = self.receive(previous)
        incoming = fixture(sha="b" * 40, run_id="124")
        incoming["assets/new-abc123.js"] = b"new bytes win"
        manifest(incoming)
        new = self.receive(incoming, command="deploy " + "b" * 40 + " 124")
        self.assertTrue(old.is_dir())
        self.assertEqual((old / "assets/new-abc123.js").read_bytes(), b"gallery")
        self.assertEqual((self.base / "current").resolve(), new)
        self.assertEqual((new / "assets/new-abc123.js").read_bytes(), b"new bytes win")
        self.assertEqual((new / "assets/old-hash.js").read_bytes(), b"old gallery")
        self.assertEqual((new / "histoire/assets/old-hash.js").read_bytes(), b"old catalog")
        bad = fixture()
        bad["index.html"] = b"corrupt"
        with self.assertRaises(ValueError):
            self.receive(bad)
        self.assertEqual((self.base / "current").resolve(), new)

    def test_successive_releases_do_not_accumulate_inherited_assets(self):
        releases = []
        for number, letter in enumerate("abcd", 1):
            files = fixture(sha=letter * 40, run_id=str(number))
            del files["assets/new-abc123.js"]
            del files["histoire/assets/new-def456.js"]
            for prefix in ("assets", "histoire/assets"):
                files[prefix + "/" + letter + "-hash.js"] = letter.encode()
            manifest(files)
            release = self.receive(files, command="deploy " + letter * 40 + " " + str(number))
            releases.append(release)
            expected = set("abcd"[max(0, number - 2):number])
            for prefix in ("assets", "histoire/assets"):
                self.assertEqual({path.name for path in (release / prefix).iterdir()},
                                 {item + "-hash.js" for item in expected})
            self.assertEqual((self.base / "current").resolve(), release)
        self.assertTrue(all(release.is_dir() for release in releases))

    def test_aggregate_budget_rejection_keeps_current_before_copy(self):
        previous = fixture()
        previous["assets/deep/old-hash.js"] = b"old bytes"
        manifest(previous)
        old = self.receive(previous)
        incoming = fixture(sha="b" * 40, run_id="124")
        incoming_bytes = sum(len(data) for data in incoming.values())
        incoming_entries = len(incoming) + 5 # Site root, assets, histoire, histoire/assets, storybook.
        # This artifact fits each budget by itself; adding the old file (and its
        # implicit directory) exceeds it. No old bytes may be read/copied first.
        for constant, limit in (("SITE_BYTE_LIMIT", incoming_bytes + len(b"old bytes") - 1),
                                ("SITE_ENTRY_LIMIT", incoming_entries + 1)):
            original_open = Path.open
            def guarded_open(path, *args, **kwargs):
                if path == old / "assets/deep/old-hash.js":
                    self.fail("Oversize preservation attempted to open old asset")
                return original_open(path, *args, **kwargs)
            with self.subTest(budget=constant), patch.object(receiver, constant, limit), \
                    patch.object(Path, "open", guarded_open), self.assertRaisesRegex(ValueError, "Aggregate site budget"):
                self.receive(incoming, command="deploy " + "b" * 40 + " 124")
            self.assertEqual((self.base / "current").resolve(), old)
            self.assertEqual(list((self.base / "releases").iterdir()), [old])
            self.assertFalse(list(self.base.glob(".current-*")))

    def test_incoming_implicit_directory_count_is_budgeted(self):
        files = fixture()
        files["assets/a/b/c/d/e/f.js"] = b"x"
        manifest(files)
        old = self.receive()
        with patch.object(receiver, "SITE_ENTRY_LIMIT", len(files) + 3), \
                self.assertRaisesRegex(ValueError, "Aggregate site budget"):
            self.receive(files)
        self.assertEqual((self.base / "current").resolve(), old)
        self.assertEqual(list((self.base / "releases").iterdir()), [old])

    def test_promotion_failure_keeps_current(self):
        old = self.receive()
        original_replace = os.replace
        def fail_current(source, dest):
            if Path(dest) == self.base / "current":
                self.assertEqual((self.base / "current").resolve(), old)
                raise OSError("simulated promotion failure")
            return original_replace(source, dest)
        with patch.object(receiver.os, "replace", side_effect=fail_current), self.assertRaises(OSError):
            self.receive()
        self.assertEqual((self.base / "current").resolve(), old)
        self.assertFalse(list(self.base.glob(".current-*")))

    def test_current_target_and_old_symlinks_rejected(self):
        (self.base / "current").symlink_to(self.base)
        with self.assertRaises(ValueError):
            self.receive()
        (self.base / "current").unlink()
        old = self.receive()
        (old / "assets/new-abc123.js").unlink()
        (old / "assets/new-abc123.js").symlink_to(old / "index.html")
        with self.assertRaises(ValueError):
            self.receive()
        self.assertEqual((self.base / "current").resolve(), old)

    def test_old_asset_directory_symlink_rejected(self):
        old = self.receive()
        (old / "histoire/assets/new-def456.js").unlink()
        (old / "histoire/assets").rmdir()
        (old / "histoire/assets").symlink_to(old / "assets")
        with self.assertRaises(ValueError):
            self.receive()
        self.assertEqual((self.base / "current").resolve(), old)


class AssemblyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.gallery = self.root / "gallery"
        self.histoire = self.root / "catalog"
        self.storybook = self.root / "book"
        for source in (self.gallery, self.histoire, self.storybook):
            source.mkdir()
        for name, data in fixture().items():
            if name in ("release.json", "SHA256SUMS"):
                continue
            if name.startswith("histoire/"):
                target = self.histoire / name.removeprefix("histoire/")
            elif name.startswith("storybook/"):
                target = self.storybook / name.removeprefix("storybook/")
            else:
                target = self.gallery / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        self.output = self.root / "site"

    def assemble(self):
        assembler.assemble(self.gallery, self.histoire, self.storybook, self.output,
                           SHA, RUN, receiver.REPOSITORY)

    def test_exact_build_and_receiver_round_trip(self):
        self.assemble()
        files = {path.relative_to(self.output).as_posix(): path.read_bytes()
                 for path in self.output.rglob("*") if path.is_file()}
        self.assertEqual(set(files), set(fixture()))
        for name in set(files) - {"release.json", "SHA256SUMS"}:
            self.assertEqual(files[name], fixture()[name])
        base = self.root / "server"
        (base / "releases").mkdir(parents=True)
        receiver.receive(COMMAND, archive(files), base)
        self.assertTrue((base / "current/index.html").is_file())

    def test_symlink_hidden_and_reserved_build_paths(self):
        for name in (".secret", "release.json", "SHA256SUMS", "histoire", "storybook"):
            path = self.gallery / name
            path.write_bytes(b"unexpected")
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.assemble()
            path.unlink()
        (self.gallery / "link").symlink_to(self.gallery / "index.html")
        with self.assertRaises(ValueError):
            self.assemble()

    def test_missing_build_page_and_existing_output(self):
        (self.gallery / "conformance.html").unlink()
        with self.assertRaises(ValueError):
            self.assemble()
        with self.assertRaises(ValueError):
            self.assemble()

    def test_missing_storybook_surface_is_rejected(self):
        (self.storybook / "index.html").unlink()
        with self.assertRaises(ValueError):
            self.assemble()

    def test_receiver_rejects_archive_without_storybook(self):
        files = fixture()
        del files["storybook/index.html"]
        manifest(files)
        base = self.root / "server"
        (base / "releases").mkdir(parents=True)
        with self.assertRaises(ValueError):
            receiver.receive(COMMAND, archive(files), base)


if __name__ == "__main__":
    unittest.main()
