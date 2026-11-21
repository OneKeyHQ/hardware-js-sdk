"""Install the OneKey runtime beside Electrum's external plugin zip."""
import json
import os
from pathlib import Path
import shutil
import sys
from zipfile import BadZipFile, ZipFile


def plugins_dir(testnet=False):
    override = os.environ.get("ELECTRUMDIR")
    if override:
        root = Path(override)
    elif sys.platform == "win32":
        root = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming")) / "Electrum"
    else:
        root = Path.home() / ".electrum"
    # Electrum appends the network directory under the same root. Mainnet has none.
    if testnet:
        root = root / "testnet"
    return root / "plugins"


def parse_install_args(argv):
    testnet = "--testnet" in argv
    args = [item for item in argv if item != "--testnet"]
    if len(args) > 2 or any(item.startswith("-") for item in args):
        raise RuntimeError("Unrecognized installer option")
    source = Path(args[0]) if len(args) > 0 else Path(__file__).resolve().parent
    # An explicit destination is used as given. --testnet only changes the default.
    destination = Path(args[1]) if len(args) > 1 else plugins_dir(testnet=testnet)
    return source, destination


def _manifest_name(path):
    try:
        with ZipFile(path) as archive:
            data = json.loads(archive.read("onekey/manifest.json"))
    except (OSError, ValueError, KeyError, json.JSONDecodeError, BadZipFile):
        return None
    name = data.get("name") if type(data) is dict else None
    return name if type(name) is str else None


def _discard(path):
    if not path.exists():
        return
    if path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()


def _stage_runtime(source, target):
    parent = target.parent
    incoming = parent / ".onekey-runtime.incoming"
    backup = parent / ".onekey-runtime.backup"
    _discard(incoming)
    _discard(backup)
    try:
        shutil.copytree(source, incoming, symlinks=False)
        if not (incoming / "runtime.json").is_file():
            raise RuntimeError("The package must contain onekey-runtime and exactly one plugin zip")
    except Exception:
        _discard(incoming)
        raise
    try:
        if target.exists():
            os.replace(target, backup)
        os.replace(incoming, target)
    except Exception:
        if not target.exists() and backup.exists():
            os.replace(backup, target)
        _discard(incoming)
        raise
    return backup if backup.exists() else None


def _restore_runtime(target, backup):
    if target.exists():
        shutil.rmtree(target)
    if backup is not None and backup.exists():
        os.replace(backup, target)


def _replace_file(source, target):
    temporary = target.with_name("." + target.name + ".incoming")
    shutil.copyfile(source, temporary)
    try:
        os.replace(temporary, target)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def _remove_other_onekey_zips(destination, plugin):
    # Electrum loads the first onekey manifest it sees. Remove older copies
    # only after the new zip is already in place. .zip.disabled is not a zip.
    installed = plugin.resolve()
    for path in sorted(destination.glob("*.zip")):
        if path.resolve() == installed:
            continue
        if _manifest_name(path) == "onekey":
            path.unlink()


def install(source, destination):
    source = Path(source)
    runtime = source / "onekey-runtime"
    zips = sorted(path for path in source.glob("onekey-*.zip") if not path.name.startswith("onekey-electrum-"))
    if not (runtime / "runtime.json").is_file() or len(zips) != 1:
        raise RuntimeError("The package must contain onekey-runtime and exactly one plugin zip")
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    target = destination / "onekey-runtime"
    plugin = destination / zips[0].name
    replaced = plugin.is_file() and plugin.read_bytes() != zips[0].read_bytes()
    backup = _stage_runtime(runtime, target)
    try:
        if not plugin.is_file() or replaced:
            _replace_file(zips[0], plugin)
    except Exception:
        _restore_runtime(target, backup)
        raise
    if backup is not None and backup.exists():
        shutil.rmtree(backup)
    _remove_other_onekey_zips(destination, plugin)
    return plugin, target, replaced


def main():
    source, destination = parse_install_args(sys.argv[1:])
    plugin, runtime, replaced = install(source, destination)
    print(plugin)
    print(runtime)
    if replaced:
        print("Plugin zip changed. Enable OneKey in Electrum again so it can authorize the new file.")
    else:
        print("Enable OneKey in Electrum and authorize the plugin zip if it asks.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError):
        sys.exit("Could not install the OneKey runtime next to the Electrum plugin.")
