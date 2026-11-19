"""Install the OneKey runtime beside Electrum's external plugin zip."""
import os
from pathlib import Path
import shutil
import sys


def plugins_dir():
    override = os.environ.get("ELECTRUMDIR")
    if override:
        return Path(override) / "plugins"
    if sys.platform == "win32":
        root = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming")) / "Electrum"
    else:
        root = Path.home() / ".electrum"
    return root / "plugins"


def install(source, destination):
    source = Path(source)
    runtime = source / "onekey-runtime"
    zips = sorted(path for path in source.glob("onekey-*.zip") if not path.name.startswith("onekey-electrum-"))
    if not (runtime / "runtime.json").is_file() or len(zips) != 1:
        raise RuntimeError("The package must contain onekey-runtime and exactly one plugin zip")
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    target = destination / "onekey-runtime"
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(runtime, target, symlinks=False)
    plugin = destination / zips[0].name
    replaced = plugin.is_file() and plugin.read_bytes() != zips[0].read_bytes()
    if not plugin.is_file() or replaced:
        shutil.copyfile(zips[0], plugin)
    return plugin, target, replaced


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent
    destination = Path(sys.argv[2]) if len(sys.argv) > 2 else plugins_dir()
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
