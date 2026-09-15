#!/usr/bin/env python3
"""Inspect known MVP MagicRes ANI/SPR pairs without assigning unverified semantics.

The script only records file identity, parsed ANI fields, SPR frame counts and which
ANI direction rows are fully in-range for the paired SPR. It does not assume that
FOCUS layers use eight directional rows the same way as Body_ character animations.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "convert"))
from ani import parse_ani  # type: ignore
from spr import parse_spr  # type: ignore

DEFAULT_IDS = (1, 2, 3, 35, 36, 37, 38)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def find_one(root: Path, filename: str) -> Path:
    wanted = filename.lower()
    hits = [p for p in root.rglob("*") if p.is_file() and p.name.lower() == wanted]
    if len(hits) != 1:
        raise FileNotFoundError(f"expected exactly one {filename} below {root}, got {len(hits)}")
    return hits[0]


def inspect_pair(root: Path, resource_id: int) -> dict:
    stem = f"magic-{resource_id:03d}"
    ani_path = find_one(root, stem + ".ani")
    spr_path = find_one(root, stem + ".spr")
    ani = parse_ani(ani_path)
    spr = parse_spr(spr_path)

    rows = []
    for direction, frames in enumerate(ani.directions):
        in_range = [frame < spr.frame_count for frame in frames]
        rows.append(
            {
                "direction_slot": direction,
                "frames": frames,
                "all_in_range": all(in_range),
                "in_range_count": sum(in_range),
                "max_frame": max(frames) if frames else None,
            }
        )

    return {
        "resource_id": resource_id,
        "ani": {
            "path": ani_path.relative_to(root).as_posix(),
            "sha256": sha256(ani_path),
            "description": ani.description,
            "layer_count": ani.layer_count,
            "layer_name": ani.layer_name,
            "frames_per_direction": ani.frames_per_direction,
            "raw_timing": ani.raw_timing,
        },
        "spr": {
            "path": spr_path.relative_to(root).as_posix(),
            "sha256": sha256(spr_path),
            "frame_count": spr.frame_count,
        },
        "rows": rows,
        "fully_in_range_rows": [row["direction_slot"] for row in rows if row["all_in_range"]],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--client-root", type=Path, required=True, help="Extracted client directory")
    ap.add_argument("--ids", nargs="*", type=int, default=list(DEFAULT_IDS))
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()

    root = args.client_root.resolve()
    result = {
        "schema": 1,
        "evidence": "VERIFIED_FILE_STRUCTURE_ONLY",
        "warning": "Do not interpret FOCUS rows as Body_ directions without separate evidence.",
        "resources": [inspect_pair(root, rid) for rid in args.ids],
    }
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
