"""Build the pinned SDK, then a desktop runtime with one official Node binary per target.

Electrum reads an external plugin zip fully into memory and rejects files over 10 MB,
so the Node binaries live in dist/onekey-runtime beside that zip, not inside it.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import urllib.request
from zipfile import ZipFile

from onekey.ipc import SDK_SOURCE, SDK_VERSION, desktop_platform


ROOT = Path(__file__).resolve().parents[2]
PLUGIN = ROOT / "plugins" / "electrum"


NODE_DIST = "https://nodejs.org/dist/v22.21.1"
# Linux archives are the official glibc builds. usb's musl prebuild is kept with the
# package, but Alpine cannot run these Node binaries.
NODE_TARGETS = (
    ("darwin-arm64", "node-v22.21.1-darwin-arm64.tar.gz", "node-v22.21.1-darwin-arm64/bin/node", "nodes/darwin-arm64/node"),
    ("darwin-x64", "node-v22.21.1-darwin-x64.tar.gz", "node-v22.21.1-darwin-x64/bin/node", "nodes/darwin-x64/node"),
    ("linux-arm64", "node-v22.21.1-linux-arm64.tar.gz", "node-v22.21.1-linux-arm64/bin/node", "nodes/linux-arm64/node"),
    ("linux-x64", "node-v22.21.1-linux-x64.tar.gz", "node-v22.21.1-linux-x64/bin/node", "nodes/linux-x64/node"),
    ("win32-arm64", "node-v22.21.1-win-arm64.zip", "node-v22.21.1-win-arm64/node.exe", "nodes/win32-arm64/node.exe"),
    ("win32-x64", "node-v22.21.1-win-x64.zip", "node-v22.21.1-win-x64/node.exe", "nodes/win32-x64/node.exe"),
)


def log(message):
    print(message, file=sys.stderr, flush=True)


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
    return assemble_bundle(data)


def package_name(source_root, folder):
    manifest = json.loads((source_root / "packages" / folder / "package.json").read_text())
    name = manifest.get("name")
    if type(name) is not str or not name.startswith("@onekeyfe/"):
        raise RuntimeError("Workspace package is not an @onekeyfe package")
    return name


def map_artifact(source_root, relative):
    parts = relative.split("/")
    if parts[0] == "node_modules":
        return relative
    if parts[0] != "packages" or len(parts) < 2:
        raise RuntimeError("Runtime artifact is outside the packaged closure")
    rest = "/".join(parts[2:])
    mapped = f"node_modules/{package_name(source_root, parts[1])}"
    return f"{mapped}/{rest}" if rest else mapped


def download(url, dest, expected):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.is_file() and hashlib.sha256(dest.read_bytes()).hexdigest() == expected:
        return
    temporary = dest.with_suffix(dest.suffix + ".partial")
    digest = hashlib.sha256()
    request = urllib.request.Request(url, headers={"User-Agent": "onekey-electrum-runtime-build"})
    with urllib.request.urlopen(request, timeout=180) as response, temporary.open("wb") as output:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
            output.write(chunk)
    if digest.hexdigest() != expected:
        temporary.unlink(missing_ok=True)
        raise RuntimeError("Node archive checksum did not match nodejs.org")
    temporary.replace(dest)


def extract_node(archive, member, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if archive.name.endswith(".zip"):
        with ZipFile(archive) as zipped:
            with zipped.open(member) as source, dest.open("wb") as output:
                shutil.copyfileobj(source, output)
    else:
        with tarfile.open(archive, "r:gz") as tar:
            source = tar.extractfile(member)
            if source is None:
                raise RuntimeError("Node archive is missing its executable")
            with source, dest.open("wb") as output:
                shutil.copyfileobj(source, output)
    if not dest.name.endswith(".exe"):
        dest.chmod(0o755)


def install_nodes(bundle):
    log("Downloading official Node 22.21.1 binaries for every desktop target")
    sums = {}
    request = urllib.request.Request(f"{NODE_DIST}/SHASUMS256.txt",
                                     headers={"User-Agent": "onekey-electrum-runtime-build"})
    with urllib.request.urlopen(request, timeout=60) as response:
        for line in response.read().decode().splitlines():
            digest, name = line.split()
            sums[name] = digest
    cache = PLUGIN / ".cache" / "node-v22.21.1"
    for platform_name, filename, member, relative in NODE_TARGETS:
        expected = sums.get(filename)
        if expected is None:
            raise RuntimeError("nodejs.org has no official binary for this target")
        archive = cache / filename
        log(f"Node {platform_name}: {filename}")
        download(f"{NODE_DIST}/{filename}", archive, expected)
        extract_node(archive, member, bundle / relative)


def assemble_bundle(snapshot):
    bundle = PLUGIN / "dist" / "onekey-runtime"
    if bundle.exists():
        shutil.rmtree(bundle)
    bundle.mkdir(parents=True)
    for name in ("entry.cjs", "runtime.cjs", "pin.cjs"):
        shutil.copyfile(PLUGIN / "helper" / name, bundle / name)
    seen = {}
    for relative in snapshot["artifacts"]:
        dest_relative = map_artifact(ROOT, relative)
        if dest_relative in seen:
            raise RuntimeError("Runtime files would overwrite each other")
        seen[dest_relative] = relative
        dest = bundle / dest_relative
        if bundle.resolve() not in dest.resolve().parents:
            raise RuntimeError("Runtime file escapes the bundle")
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / relative, dest)
    install_nodes(bundle)
    node = shutil.which("node")
    receipt_data = json.loads(run([node, str(PLUGIN / "helper" / "pin.cjs"), "--bundle", str(bundle)],
                                  capture_output=True, text=True).stdout)
    output = bundle / "runtime.json"
    receipt = (json.dumps(receipt_data) + "\n").encode()
    receipt_hash = hashlib.sha256(receipt).hexdigest()
    output.write_bytes(receipt)
    output.with_suffix(".sha256").write_text(receipt_hash + "\n")
    host = desktop_platform()
    if host is None:
        raise RuntimeError("This build machine is not one of the desktop targets")
    bundled_node = bundle / receipt_data["platforms"][host]["node"]
    try:
        smoke = run([str(bundled_node), str(bundle / "entry.cjs"), "--manifest", str(output),
                     "--manifest-sha256", receipt_hash, "--smoke"], capture_output=True, text=True)
        if json.loads(smoke.stdout) != {"v": 1, "imports": True, "sdkVersion": SDK_VERSION}:
            raise RuntimeError("Bundled SDK/native USB import smoke failed")
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
