"""Create portable GitHub source and ready-to-upload static ZIPs; omit hosting identity."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
output = root / 'outputs'
output.mkdir(exist_ok=True)
with ZipFile(output / 'github-pages-static.zip', 'w', ZIP_DEFLATED) as archive:
    for path in sorted((root / 'dist').rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(root / 'dist'))
with ZipFile(output / 'github-source.zip', 'w', ZIP_DEFLATED) as archive:
    for name in ['.github', 'dist', 'labs', 'scripts', '.gitignore', 'README.md',
                 'GITHUB-PAGES.md', 'REVIEW.md', 'HANDBOOK.md', 'LICENSE', 'ATTRIBUTION.md']:
        item = root / name
        paths = sorted(item.rglob('*')) if item.is_dir() else [item]
        for path in paths:
            if path.is_file() and '__pycache__' not in path.parts:
                archive.write(path, path.relative_to(root))
print('Created outputs/github-pages-static.zip and outputs/github-source.zip')
