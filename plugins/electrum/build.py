import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile


def build(root=None, *, legacy_runtime=False):
    root = Path(root) if root is not None else Path(__file__).resolve().parent
    plugin = root / "onekey"
    manifest = json.loads((plugin / "manifest.json").read_text())
    output = root / "dist" / f"onekey-{manifest['version']}.zip"
    output.parent.mkdir(exist_ok=True)
    receipt = root / "dist" / "onekey-runtime" / "runtime.json"
    pin = (hashlib.sha256(receipt.read_bytes()).hexdigest() + "\n") if legacy_runtime and receipt.is_file() else None
    with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
        for source in sorted(plugin.rglob("*")):
            if not source.is_file() or "__pycache__" in source.parts:
                continue
            if source.suffix in (".py", ".json", ".svg", ".rules") or source.name == "LICENCE":
                archive.write(source, source.relative_to(root))
        # Binds the sibling runtime to this zip. Electrum authorizes the zip, not the directory.
        if pin is not None:
            archive.writestr("onekey/runtime_pin.txt", pin)
    return output


def build_distribution(root=None):
    root = Path(root) if root is not None else Path(__file__).resolve().parent
    manifest = json.loads((root / "onekey" / "manifest.json").read_text())
    plugin_zip = build(root, legacy_runtime=True)
    runtime = root / "dist" / "onekey-runtime"
    if not (runtime / "runtime.json").is_file():
        raise RuntimeError("Build the runtime first: python3 plugins/electrum/build_runtime.py")
    # Electrum rejects plugin zips over 10 MB, so this outer archive is the redistributable.
    output = root / "dist" / f"onekey-electrum-{manifest['version']}.zip"
    temporary = output.with_suffix(".partial")
    with ZipFile(temporary, "w") as archive:
        archive.write(plugin_zip, plugin_zip.name, compress_type=ZIP_DEFLATED)
        archive.write(root / "install_runtime.py", "install.py", compress_type=ZIP_DEFLATED)
        for source in sorted(runtime.rglob("*")):
            if not source.is_file():
                continue
            relative = Path("onekey-runtime") / source.relative_to(runtime)
            stored = "nodes" in source.relative_to(runtime).parts
            archive.write(source, relative, compress_type=ZIP_STORED if stored else ZIP_DEFLATED)
    temporary.replace(output)
    return output


if __name__ == "__main__":
    print(build())
