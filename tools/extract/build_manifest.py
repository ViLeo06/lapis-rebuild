#!/usr/bin/env python3
"""Build a deterministic CSV manifest for an extracted client tree."""

from __future__ import annotations

import argparse
import csv
import hashlib
from pathlib import Path


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    paths = sorted(root.rglob("*"), key=lambda p: p.relative_to(root).as_posix().lower())
    with args.output.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(["path", "type", "size", "sha256"])
        for path in paths:
            rel = path.relative_to(root).as_posix()
            if path.is_dir():
                writer.writerow([rel + "/", "dir", 0, ""])
            elif path.is_file():
                writer.writerow([rel, "file", path.stat().st_size, sha256(path)])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
