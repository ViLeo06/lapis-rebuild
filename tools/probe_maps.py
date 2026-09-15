#!/usr/bin/env python3
"""Render a bounded set of real client maps and record structural evidence.

This is a static probe: it parses resources and writes temporary PNGs. It never
executes the original client. The output is intended to choose the next Web map
from verified client data instead of guessing an ID or name.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "convert"))
sys.path.insert(0, str(ROOT / "tools" / "extract"))
from map_bundle import parse_imf  # type: ignore
from render_map import render  # type: ignore
from lib_archive import extract  # type: ignore


def find_ci(root: Path, name: str) -> Path:
    hits = [p for p in root.iterdir() if p.is_file() and p.name.lower() == name.lower()]
    if len(hits) != 1:
        raise FileNotFoundError(f"expected exactly one {name} in {root}, got {len(hits)}")
    return hits[0]


def load_zone_names(client: Path) -> dict[int, str]:
    archive = client / "NRes" / "Set.lib"
    if not archive.is_file():
        return {}
    with tempfile.TemporaryDirectory(prefix="lapis-setlib-") as td:
        out = Path(td)
        extract(archive, out)
        zone = next((p for p in out.iterdir() if p.name.lower() == "zone_name.txt"), None)
        if zone is None:
            return {}
        text = zone.read_bytes().decode("gb18030", errors="replace")
    names: dict[int, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(None, 1)
        if len(parts) != 2:
            continue
        try:
            names[int(parts[0])] = parts[1].strip()
        except ValueError:
            continue
    return names


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--client-root", type=Path, required=True)
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--count", type=int, default=12)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()
    if args.start < 0 or args.count < 1 or args.count > 100:
        raise ValueError("invalid probe range")

    client = args.client_root.resolve()
    sgres = client / "SGRes"
    names = load_zone_names(client)
    rows = []
    with tempfile.TemporaryDirectory(prefix="lapis-map-probe-") as td:
        tmp = Path(td)
        for map_id in range(args.start, args.start + args.count):
            row: dict = {"id": map_id, "name": names.get(map_id)}
            try:
                imf = parse_imf(find_ci(sgres, f"sz-{map_id:04d}.imf"))
                row.update(
                    {
                        "collision_width": imf["width"],
                        "collision_height": imf["height"],
                        "walkable_value_1": sum(1 for value in imf["grid"] if value == 1),
                    }
                )
                png = tmp / f"map-{map_id:04d}.png"
                rendered = render(sgres, map_id, png)
                row["render"] = {k: v for k, v in rendered.items() if k != "output"}
                row["png_sha256"] = hashlib.sha256(png.read_bytes()).hexdigest()
                row["png_size"] = png.stat().st_size
                row["ok"] = True
            except Exception as exc:
                row["ok"] = False
                row["error"] = f"{type(exc).__name__}: {exc}"
            rows.append(row)

    payload = {
        "schema": 1,
        "evidence": "VERIFIED_STATIC_PROBE",
        "range": {"start": args.start, "count": args.count},
        "maps": rows,
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
