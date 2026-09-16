#!/usr/bin/env python3
"""Build a private S5 visual-validation pack from extracted original resources.

The output is for manual inspection only and should stay in private CI/Drive
artifacts because it contains decoded original pixels. Character sheets preserve
the verified Body_ raw row order. MagicRes sheets deliberately show ANI row 0 as
a diagnostic sequence and do not label FOCUS rows as directions.
"""
from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "convert"))

CHAR_STEMS = (
    "B100_00", "B100_02", "B100_03", "B100_05",
    "B109_00", "B109_02", "B109_03", "B109_05",
)
MAGIC_IDS = (1, 2, 3, 35, 36, 37, 38)
BODY_ROW_LABELS = ("S", "SW", "W", "NW", "N", "NE", "E", "SE")


def find_one(root: Path, filename: str) -> Path:
    wanted = filename.lower()
    hits = [p for p in root.rglob("*") if p.is_file() and p.name.lower() == wanted]
    if len(hits) != 1:
        raise FileNotFoundError(f"expected exactly one {filename} below {root}, got {len(hits)}")
    return hits[0]


def alpha_blit(target: bytearray, tw: int, th: int, source: bytes, sw: int, sh: int, x0: int, y0: int) -> None:
    for y in range(sh):
        ty = y0 + y
        if not 0 <= ty < th:
            continue
        for x in range(sw):
            tx = x0 + x
            if not 0 <= tx < tw:
                continue
            so = (y * sw + x) * 4
            a = source[so + 3]
            if a == 0:
                continue
            to = (ty * tw + tx) * 4
            if a == 255:
                target[to : to + 4] = source[so : so + 4]
                continue
            inv = 255 - a
            sr, sg, sb = source[so : so + 3]
            dr, dg, db, da = target[to : to + 4]
            target[to : to + 4] = bytes(
                (
                    (sr * a + dr * inv) // 255,
                    (sg * a + dg * inv) // 255,
                    (sb * a + db * inv) // 255,
                    min(255, a + da * inv // 255),
                )
            )


def draw_cross(target: bytearray, width: int, height: int, x: int, y: int) -> None:
    for dx, dy in ((-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (0, -2), (0, -1), (0, 1), (0, 2)):
        px, py = x + dx, y + dy
        if 0 <= px < width and 0 <= py < height:
            off = (py * width + px) * 4
            target[off : off + 4] = b"\xff\xff\xff\xff" if (dx + dy) % 2 == 0 else b"\x00\x00\x00\xff"


def compose_sheet(spr, rows: list[list[int]], out: Path, *, anchor_overlay: bool = True, pad: int = 5) -> dict:
    from spr import write_png  # type: ignore

    frame_indices = [i for row in rows for i in row]
    frames = [spr.frames[i] for i in frame_indices]
    min_left = min(f.left for f in frames)
    min_top = min(f.top for f in frames)
    max_right = max(f.right for f in frames)
    max_bottom = max(f.bottom for f in frames)
    cell_w = max_right - min_left + pad * 2
    cell_h = max_bottom - min_top + pad * 2
    columns = max(len(row) for row in rows)
    width = max(1, columns * cell_w)
    height = max(1, len(rows) * cell_h)
    rgba = bytearray(width * height * 4)
    anchor_x = pad - min_left
    anchor_y = pad - min_top

    for row_index, row in enumerate(rows):
        for col, frame_index in enumerate(row):
            frame = spr.frames[frame_index]
            cell_x = col * cell_w
            cell_y = row_index * cell_h
            alpha_blit(
                rgba,
                width,
                height,
                frame.rgba,
                frame.width,
                frame.height,
                cell_x + anchor_x + frame.left,
                cell_y + anchor_y + frame.top,
            )
            if anchor_overlay:
                draw_cross(rgba, width, height, cell_x + anchor_x, cell_y + anchor_y)

    out.parent.mkdir(parents=True, exist_ok=True)
    write_png(out, width, height, bytes(rgba))
    return {
        "png": out.name,
        "width": width,
        "height": height,
        "rows": len(rows),
        "columns": columns,
        "cell": {"width": cell_w, "height": cell_h, "anchor_x": anchor_x, "anchor_y": anchor_y},
        "union_bounds": {"left": min_left, "top": min_top, "right": max_right, "bottom": max_bottom},
    }


def main() -> int:
    from ani import parse_ani  # type: ignore
    from spr import parse_spr  # type: ignore

    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--client-root", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    root = args.client_root.resolve()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)

    entries: list[dict] = []
    for stem in CHAR_STEMS:
        ani_path = find_one(root, stem + ".ani")
        spr_path = find_one(root, stem + ".spr")
        ani = parse_ani(ani_path)
        spr = parse_spr(spr_path)
        rows = [list(row) for row in ani.directions]
        sheet = compose_sheet(spr, rows, out / f"{stem}-body-8rows.png")
        entries.append(
            {
                "kind": "Body_",
                "stem": stem,
                "ani": ani_path.relative_to(root).as_posix(),
                "spr": spr_path.relative_to(root).as_posix(),
                "frames_per_direction": ani.frames_per_direction,
                "raw_timing": ani.raw_timing,
                "raw_rows": BODY_ROW_LABELS,
                "sheet": sheet,
                "note": "Body_ rows use the already-verified S,SW,W,NW,N,NE,E,SE order; anchor cross is diagnostic overlay.",
            }
        )

    for rid in MAGIC_IDS:
        stem = f"magic-{rid:03d}"
        ani_path = find_one(root, stem + ".ani")
        spr_path = find_one(root, stem + ".spr")
        ani = parse_ani(ani_path)
        spr = parse_spr(spr_path)
        row0 = [i for i in ani.directions[0] if i < spr.frame_count]
        if not row0:
            continue
        sheet = compose_sheet(spr, [row0], out / f"{stem}-focus-row0.png")
        entries.append(
            {
                "kind": ani.layer_name or "<empty>",
                "stem": stem,
                "ani": ani_path.relative_to(root).as_posix(),
                "spr": spr_path.relative_to(root).as_posix(),
                "frames_per_direction": ani.frames_per_direction,
                "raw_timing": ani.raw_timing,
                "unique_direction_rows": len({tuple(row) for row in ani.directions}),
                "row0": row0,
                "sheet": sheet,
                "note": "FOCUS row 0 diagnostic only. No direction, placement, blend or stage semantics are assigned.",
            }
        )

    (out / "index.json").write_text(json.dumps({"schema": 1, "entries": entries}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    cards = []
    for e in entries:
        cards.append(
            "<section><h2>{}</h2><p>{}</p><p>frames/row={} raw_timing={} kind={}</p><img src=\"{}\" loading=\"lazy\"></section>".format(
                html.escape(e["stem"]), html.escape(e["note"]), e["frames_per_direction"], e["raw_timing"], html.escape(str(e["kind"])), html.escape(e["sheet"]["png"])
            )
        )
    page = """<!doctype html><meta charset=utf-8><title>S5 visual validation</title>
<style>body{font-family:system-ui;background:#17191d;color:#eee;margin:20px}section{margin:24px 0;padding:16px;background:#24272d;border-radius:8px}img{max-width:100%;image-rendering:pixelated;background:#555}code{white-space:pre-wrap}</style>
<h1>S5 private visual validation pack</h1>
<p>White/black crosses are diagnostic anchors. MagicRes images are ANI row-0 diagnostics only; they do not assert FOCUS direction/placement/blend semantics.</p>
""" + "\n".join(cards)
    (out / "index.html").write_text(page, encoding="utf-8")
    print(json.dumps({"out": str(out), "entries": len(entries)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
