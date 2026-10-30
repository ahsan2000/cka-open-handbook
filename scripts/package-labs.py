"""Rebuild the public lab download using only the Python standard library."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
files = sorted(p for p in (root / "labs").iterdir() if p.is_file())
if not files:
    raise SystemExit("No lab files found")
with ZipFile(root / "dist" / "labs.zip", "w", ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, "cka-labs/" + path.name)
print(f"Packaged {len(files)} lab files into dist/labs.zip")
