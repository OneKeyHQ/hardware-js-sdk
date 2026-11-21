import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest
import zipfile
from unittest import mock

from electrum.zip_importer import MemoryZipImporter

from onekey.ipc import DESKTOP_PLATFORMS, Helper, HelperError, SDK_SOURCE, SDK_VERSION, desktop_platform, runtime_command


ROOT = Path(__file__).resolve().parents[1]


class TestHelperIPC(unittest.TestCase):
    def test_main_thread_cannot_block_qt(self):
        with self.assertRaisesRegex(HelperError, "GUI_THREAD"):
            Helper().call("search", {})

    def test_runtime_requires_pin_and_asset_hashes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            data = dict(schema=1, sdkSource=SDK_SOURCE, sdkVersion=SDK_VERSION,
                        node=shutil.which("node"), assets={})
            for name in ("entry.cjs", "runtime.cjs", "pin.cjs"):
                content = (ROOT / "helper" / name).read_bytes()
                (root / name).write_bytes(content)
                data["assets"][name] = hashlib.sha256(content).hexdigest()
            manifest = root / "runtime.json"
            manifest.write_text(json.dumps(data))
            manifest.with_suffix(".sha256").write_text(hashlib.sha256(manifest.read_bytes()).hexdigest())
            with mock.patch.dict(os.environ, {"ONEKEY_ELECTRUM_RUNTIME": str(manifest)}):
                self.assertEqual(str(root / "entry.cjs"), runtime_command()[1])
                (root / "entry.cjs").write_text("tampered")
                with self.assertRaisesRegex(HelperError, "RUNTIME_INVALID"):
                    runtime_command()
                data["sdkSource"] = "wrong"
                manifest.write_text(json.dumps(data))
                with self.assertRaisesRegex(HelperError, "RUNTIME_INVALID"):
                    runtime_command()

    def test_bundle_runtime_is_beside_the_installed_plugin_zip(self):
        self.assertEqual(DESKTOP_PLATFORMS, ("darwin-arm64", "darwin-x64", "linux-arm64", "linux-x64",
                                             "win32-arm64", "win32-x64"))
        target = desktop_platform()
        self.assertIsNotNone(target)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            runtime = root / "onekey-runtime"
            data = dict(schema=2, mode="bundle", sdkSource=SDK_SOURCE, sdkVersion=SDK_VERSION,
                        assets={}, platforms={})
            for name in DESKTOP_PLATFORMS:
                executable = "node.exe" if name.startswith("win32-") else "node"
                payload = b"current-node" if name == target else name.encode()
                path = runtime / "nodes" / name / executable
                path.parent.mkdir(parents=True)
                path.write_bytes(payload)
                data["platforms"][name] = {"node": f"nodes/{name}/{executable}",
                                           "nodeSha256": hashlib.sha256(payload).hexdigest()}
            for name in ("entry.cjs", "runtime.cjs", "pin.cjs"):
                content = name.encode()
                (runtime / name).write_bytes(content)
                data["assets"][name] = hashlib.sha256(content).hexdigest()
            manifest = runtime / "runtime.json"
            manifest.write_text(json.dumps(data))
            manifest.with_suffix(".sha256").write_text(hashlib.sha256(manifest.read_bytes()).hexdigest())
            pin = hashlib.sha256(manifest.read_bytes()).hexdigest()
            archive = root / "onekey-0.1.0.zip"
            with zipfile.ZipFile(archive, "w") as zipped:
                zipped.writestr("onekey/__init__.py", "")
                zipped.writestr("onekey/ipc.py", "")
                zipped.writestr("onekey/runtime_pin.txt", pin + "\n")
            importer = MemoryZipImporter(archive.read_bytes(), root_name="onekey_pin",
                                         prefix="onekey", archive_path=str(archive))
            synthetic = f"{archive}/onekey/ipc.py"
            current = runtime / "nodes" / target / ("node.exe" if target.startswith("win32-") else "node")
            with mock.patch.dict(os.environ, {"ONEKEY_ELECTRUM_RUNTIME": ""}):
                with mock.patch("onekey.ipc.__file__", synthetic), mock.patch("onekey.ipc.__loader__", importer):
                    self.assertEqual(runtime_command()[0], str(current.resolve()))
                    windows_path = str(archive).replace("/", "\\")
                    windows_importer = MemoryZipImporter(
                        archive.read_bytes(), root_name="onekey_pin_win",
                        prefix="onekey", archive_path=windows_path)
                    with mock.patch("onekey.ipc.__file__", windows_path + "/onekey/ipc.py"), \
                            mock.patch("onekey.ipc.__loader__", windows_importer):
                        self.assertEqual(runtime_command()[0], str(current.resolve()))
                    current.write_bytes(b"tampered")
                    with self.assertRaisesRegex(HelperError, "RUNTIME_INVALID"):
                        runtime_command()
                    current.write_bytes(b"current-node")
                    manifest.write_text(json.dumps(data, indent=2))
                    manifest.with_suffix(".sha256").write_text(
                        hashlib.sha256(manifest.read_bytes()).hexdigest() + "\n")
                    with self.assertRaisesRegex(HelperError, "RUNTIME_INVALID"):
                        runtime_command()
            bare = root / "onekey-unpinned.zip"
            with zipfile.ZipFile(bare, "w") as zipped:
                zipped.writestr("onekey/__init__.py", "")
                zipped.writestr("onekey/ipc.py", "")
            bare_importer = MemoryZipImporter(bare.read_bytes(), root_name="onekey_bare",
                                              prefix="onekey", archive_path=str(bare))
            manifest.write_text(json.dumps(data))
            manifest.with_suffix(".sha256").write_text(hashlib.sha256(manifest.read_bytes()).hexdigest())
            with mock.patch.dict(os.environ, {"ONEKEY_ELECTRUM_RUNTIME": ""}):
                with mock.patch("onekey.ipc.__file__", f"{bare}/onekey/ipc.py"), \
                        mock.patch("onekey.ipc.__loader__", bare_importer):
                    with self.assertRaisesRegex(HelperError, "RUNTIME_INVALID"):
                        runtime_command()


if __name__ == "__main__":
    unittest.main()
