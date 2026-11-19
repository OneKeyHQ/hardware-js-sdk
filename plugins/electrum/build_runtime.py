"""Build an explicitly source-tree-only runtime. No npm release is assumed to exist."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

from onekey.ipc import SDK_SOURCE, SDK_VERSION


ROOT = Path(__file__).resolve().parents[2]
PLUGIN = ROOT / "plugins" / "electrum"


def run(args, **kwargs):
    executable = shutil.which(args[0])
    if executable is None:
        raise RuntimeError("Required build tool is missing")
    return subprocess.run([executable, *args[1:]], cwd=ROOT, check=True, **kwargs)


def build_runtime():
    destination = PLUGIN / ".runtime"
    destination.mkdir(exist_ok=True)
    (destination / "runtime.json").unlink(missing_ok=True)
    (destination / "runtime.sha256").unlink(missing_ok=True)
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node 22.21.1 is required")
    if run([node, "--version"], capture_output=True, text=True).stdout.strip() != "v22.21.1":
        raise RuntimeError("Use the pinned Node 22.21.1 build for this platform/CPU")
    if run(["yarn", "--version"], capture_output=True, text=True).stdout.strip() != "1.22.22":
        raise RuntimeError("Yarn 1.22.22 is required")
    # Shared source validation covers root configs and untracked/ignored effective inputs.
    pin = PLUGIN / "helper" / "pin.cjs"
    before = json.loads(run([node, str(pin), "--check-source", str(ROOT)],
                            capture_output=True, text=True).stdout)
    run(["yarn", "install", "--frozen-lockfile", "--non-interactive", "--cache-folder", str(ROOT / ".cache" / "yarn")])
    # Topological build includes only the real common entry and its transitive SDK workspaces.
    run(["yarn", "lerna", "run", "build", "--scope=@onekeyfe/hd-common-connect-sdk", "--include-dependencies"])
    for name in ("entry.cjs", "runtime.cjs", "pin.cjs"):
        shutil.copyfile(PLUGIN / "helper" / name, destination / name)
    data = json.loads(run([node, str(pin), "--snapshot", str(ROOT)], capture_output=True, text=True).stdout)
    if data["inputs"] != before or data["sdkSource"] != SDK_SOURCE or data["sdkVersion"] != SDK_VERSION:
        raise RuntimeError("Build inputs changed during installation/build")
    output = destination / "runtime.json"
    receipt = (json.dumps(data, indent=2) + "\n").encode()
    receipt_hash = hashlib.sha256(receipt).hexdigest()
    output.write_bytes(receipt)
    output.with_suffix(".sha256").write_text(receipt_hash + "\n")
    try:
        # Validate the complete receipt BEFORE importing real SDK/native code; no hardware init.
        smoke = run([node, str(destination / "entry.cjs"), "--manifest", str(output),
                     "--manifest-sha256", receipt_hash, "--smoke"], capture_output=True, text=True)
        if json.loads(smoke.stdout) != {"v": 1, "imports": True, "sdkVersion": SDK_VERSION}:
            raise RuntimeError("Real SDK/native USB import smoke failed")
    except BaseException:
        output.unlink(missing_ok=True)
        output.with_suffix(".sha256").unlink(missing_ok=True)
        raise
    return output


if __name__ == "__main__":
    try:
        print(build_runtime())
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError):
        sys.exit("Runtime build/import verification failed. No usable runtime manifest was produced.")
