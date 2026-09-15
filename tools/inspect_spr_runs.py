#!/usr/bin/env python3
"""Inspect SPR row/span headers without exporting original pixel payloads.

Static archaeology helper used to distinguish absolute span x values from
relative transparent-skip semantics. It never executes the original client and
intentionally omits RGB565 pixel values from its JSON output.
"""
from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path

TARGETS = {
    "B100_01.spr": (3, 4, 5, 6, 7, 8),
    "B109_01.spr": (3, 4, 5, 6, 7, 8),
}


def inspect(path: Path, selected: tuple[int, ...]) -> dict:
    data = path.read_bytes()
    if len(data) < 4:
        raise ValueError(f"truncated SPR: {path}")
    count = struct.unpack_from("<I", data, 0)[0]
    table_end = 4 + count * 16
    bounds = [struct.unpack_from("<4i", data, 4 + i * 16) for i in range(count)]
    pos = table_end
    frames = []
    for index, (left, top, right, bottom) in enumerate(bounds):
        payload_size = struct.unpack_from("<I", data, pos)[0]
        pos += 4
        payload_start = pos
        row_count = struct.unpack_from("<H", data, pos)[0]
        pos += 2
        rows = []
        for y in range(row_count):
            span_count = struct.unpack_from("<H", data, pos)[0]
            pos += 2
            spans = []
            for _ in range(span_count):
                a, n = struct.unpack_from("<HH", data, pos)
                pos += 4
                spans.append([a, n])
                pos += n * 2
            if index in selected:
                rows.append({"y": y, "spans": spans})
        if pos - payload_start != payload_size:
            raise ValueError(f"frame {index}: payload boundary mismatch")
        if index in selected:
            frames.append({
                "index": index,
                "bounds": [left, top, right, bottom],
                "width": right - left,
                "height": bottom - top,
                "rows": rows,
            })
    if pos != len(data):
        raise ValueError(f"trailing bytes: {len(data)-pos}")
    return {"source": path.name, "frame_count": count, "frames": frames}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--client-root", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    char = args.client_root / "Char"
    result = {name: inspect(char / name, selected) for name, selected in TARGETS.items()}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
