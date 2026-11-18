import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


def build():
    root = Path(__file__).resolve().parent
    plugin = root / "onekey"
    manifest = json.loads((plugin / "manifest.json").read_text())
    output = root / "dist" / f"onekey-{manifest['version']}.zip"
    output.parent.mkdir(exist_ok=True)
    with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
        for source in sorted(plugin.rglob("*")):
            if not source.is_file() or "__pycache__" in source.parts:
                continue
            if source.suffix in (".py", ".json", ".svg", ".rules") or source.name == "LICENCE":
                archive.write(source, source.relative_to(root))
    return output


if __name__ == "__main__":
    print(build())
