"""In-process distribution checks; no Node, USB or Electrum installation needed."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile

from build import build


class TestPythonDistribution(unittest.TestCase):
    def test_default_cli_builds_the_python_zip_without_a_node_runtime(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = Path(__file__).parents[1]
            shutil.copytree(source / 'onekey', root / 'onekey')
            shutil.copyfile(source / 'build.py', root / 'build.py')
            result = subprocess.run([sys.executable, str(root / 'build.py')], capture_output=True, text=True)
            self.assertEqual(0, result.returncode, result.stderr)
            output = Path(result.stdout.strip())
            self.assertEqual('onekey-0.1.0.zip', output.name)
            self.assertLess(output.stat().st_size, 10_000_000)
            with ZipFile(output) as archive:
                self.assertIsNone(archive.testzip())
                self.assertFalse(any('runtime/' in name or name.endswith(('.cjs', '.exe'))
                                     or name == 'install.py' for name in archive.namelist()))
                for name in ('device.py', 'codec.py', 'frame.py', 'validate.py', 'usb.py', 'link.py', 'qt.py'):
                    self.assertIn('onekey/' + name, archive.namelist())
            # Load the actual protocol from the zip, independent of this source directory.
            env = dict(os.environ, PYTHONPATH=str(output))
            load_dir = root / 'isolated-load'
            load_dir.mkdir()
            loaded = subprocess.run([sys.executable, '-c',
                'from onekey.ipc import Helper; from onekey.device import Session; '
                'assert Helper().process is None; '
                'assert Helper.__module__ == "onekey.ipc"; '
                'import onekey.ipc, sys; from pathlib import Path; '
                'assert Path(onekey.ipc.__loader__.archive) == Path(sys.argv[1])',
                str(output)], cwd=load_dir, env=env, capture_output=True, text=True)
            self.assertEqual(0, loaded.returncode, loaded.stderr)

    def test_python_zip_does_not_pin_an_unused_stale_node_runtime(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'onekey').mkdir()
            (root / 'onekey' / 'manifest.json').write_text('{"version":"0.1.0"}')
            runtime = root / 'dist' / 'onekey-runtime'
            runtime.mkdir(parents=True)
            (runtime / 'runtime.json').write_text('{}')
            with ZipFile(build(root)) as archive:
                self.assertNotIn('onekey/runtime_pin.txt', archive.namelist())
