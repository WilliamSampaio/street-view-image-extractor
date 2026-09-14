#!/usr/bin/env python3
"""Gera a extensão pronta para o navegador em dist/.

Saídas:
  dist/<nome>/              pasta para "Carregar sem compactação" em chrome://extensions
  dist/<nome>-<versão>.zip  pacote para a Chrome Web Store (manifest.json na raiz)

Uso:
  python3 build.py                   # usa a versão do manifest.json
  python3 build.py --version 1.0.42  # sobrescreve a versão no pacote gerado
"""

import argparse
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"

# Arquivos e pastas que fazem parte da extensão.
INCLUDE = [
    "manifest.json",
    "popup.html",
    "popup.js",
    "extractor.html",
    "extractor.js",
    "styles.css",
    "lib",
    "icons",
]

REFERENCE_PATTERNS = {
    ".html": re.compile(r'(?:src|href)="([^"#?]+)"'),
    ".js": re.compile(r"""(?:from|import)\s*['"]([^'"]+)['"]"""),
}


def fail(message):
    print(f"erro: {message}", file=sys.stderr)
    sys.exit(1)


def copy_sources(target):
    for entry in INCLUDE:
        source = ROOT / entry
        if not source.exists():
            fail(f"arquivo não encontrado: {entry}")
        if source.is_dir():
            shutil.copytree(source, target / entry)
        else:
            shutil.copy2(source, target / entry)


def check_references(target):
    """Garante que todo arquivo local referenciado no HTML/JS foi incluído."""
    missing = []
    for path in sorted(target.rglob("*")):
        pattern = REFERENCE_PATTERNS.get(path.suffix)
        if not pattern:
            continue
        for ref in pattern.findall(path.read_text(encoding="utf-8")):
            if re.match(r"^[a-z]+:", ref):
                continue
            if not (path.parent / ref).resolve().is_file():
                missing.append(f"{path.relative_to(target)} -> {ref}")
    if missing:
        fail("referências quebradas:\n  " + "\n  ".join(missing))


def check_manifest(manifest, target):
    referenced = [manifest.get("action", {}).get("default_popup")]
    referenced += manifest.get("icons", {}).values()
    referenced += manifest.get("action", {}).get("default_icon", {}).values()
    for ref in filter(None, referenced):
        if not (target / ref).is_file():
            fail(f"arquivo do manifest não encontrado: {ref}")


def make_zip(source_dir, zip_path):
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(source_dir.rglob("*")):
            if path.is_file():
                info = zipfile.ZipInfo(path.relative_to(source_dir).as_posix(), (2020, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, path.read_bytes())


def parse_args():
    parser = argparse.ArgumentParser(description="Gera a extensão em dist/.")
    parser.add_argument("--version", help="versão do pacote (1 a 4 inteiros separados por ponto)")
    return parser.parse_args()


def main():
    args = parse_args()
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    if args.version:
        if not re.fullmatch(r"\d+(\.\d+){0,3}", args.version):
            fail(f"versão inválida para o Chrome: {args.version}")
        manifest["version"] = args.version
    slug = re.sub(r"[^a-z0-9]+", "-", manifest["name"].lower()).strip("-")
    version = manifest["version"]

    shutil.rmtree(DIST, ignore_errors=True)
    unpacked = DIST / slug
    unpacked.mkdir(parents=True)

    copy_sources(unpacked)
    (unpacked / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    check_manifest(manifest, unpacked)
    check_references(unpacked)

    zip_path = DIST / f"{slug}-{version}.zip"
    make_zip(unpacked, zip_path)

    files = sum(1 for p in unpacked.rglob("*") if p.is_file())
    print(f"Build {manifest['name']} v{version}: {files} arquivos")
    print(f"  pasta: {unpacked.relative_to(ROOT)}/")
    print(f"  zip:   {zip_path.relative_to(ROOT)} ({zip_path.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
