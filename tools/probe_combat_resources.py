#!/usr/bin/env python3
"""Probe combat-specific original resources without executing client code.

This tool is evidence-oriented. It recognizes the already-recovered TIP container,
records exact hashes/rectangles/run kinds for CombatMap.Tip, emits optional
run-kind diagnostic PNGs, and profiles CombatSelect.Tdg conservatively without
asserting a format that has not been recovered yet.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
import zlib
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "convert"))
from tip import parse_tip, summarize  # noqa: E402

TARGETS = ("NRes/CombatMap.Tip", "Dlg/CombatSelect.Tdg")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def entropy(data: bytes) -> float:
    if not data:
        return 0.0
    counts = Counter(data)
    n = len(data)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def ascii_strings(data: bytes, min_len: int = 4, limit: int = 40) -> list[str]:
    strings = []
    for match in re.finditer(rb"[\x20-\x7e]{%d,}" % min_len, data):
        text = match.group().decode("ascii", errors="strict")
        strings.append(text[:160])
        if len(strings) >= limit:
            break
    return strings


def tdg_profile(path: Path) -> dict[str, object]:
    data = path.read_bytes()
    return {
        "path": "Dlg/CombatSelect.Tdg",
        "size": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "first_64_bytes_hex": data[:64].hex(),
        "last_32_bytes_hex": data[-32:].hex(),
        "zero_ratio": round(data.count(0) / len(data), 6) if data else 0.0,
        "entropy_bits_per_byte": round(entropy(data), 4),
        "ascii_strings": ascii_strings(data),
        "format_status": "UNRECOVERED",
        "warning": "Byte profile/string presence is not evidence of record boundaries or runtime semantics.",
    }


def rgb565(word: int) -> tuple[int, int, int]:
    r = (word >> 11) & 0x1F
    g = (word >> 5) & 0x3F
    b = word & 0x1F
    return ((r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2))


def png_chunk(tag: bytes, payload: bytes) -> bytes:
    return len(payload).to_bytes(4, "big") + tag + payload + zlib.crc32(tag + payload).to_bytes(4, "big")


def write_png(path: Path, width: int, height: int, rgba: bytes) -> None:
    if len(rgba) != width * height * 4:
        raise ValueError("invalid RGBA buffer length")
    rows = bytearray()
    stride = width * 4
    for y in range(height):
        rows.append(0)
        rows.extend(rgba[y * stride : (y + 1) * stride])
    ihdr = width.to_bytes(4, "big") + height.to_bytes(4, "big") + bytes((8, 6, 0, 0, 0))
    blob = b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", ihdr) + png_chunk(b"IDAT", zlib.compress(bytes(rows), 9)) + png_chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(blob)


def diagnostic_frame_rgba(frame) -> bytes:
    """Render a semantic diagnostic, not an asserted original TIP rendering.

    kind 0 = transparent; kind 1 = literal RGB565 diagnostic interpretation;
    kinds 2/3/4 = fixed marker colors so their geometry remains visible without
    pretending their blend/alpha semantics are known.
    """
    width, height = frame.width, frame.height
    out = bytearray(width * height * 4)
    marker = {2: (255, 215, 0, 255), 3: (255, 0, 255, 255), 4: (0, 255, 255, 255)}
    for y, row in enumerate(frame.rows):
        x = 0
        for run in row.runs:
            if run.kind == 0:
                x += run.length
                continue
            if run.kind == 1:
                for word in run.payload:
                    r, g, b = rgb565(word)
                    i = (y * width + x) * 4
                    out[i : i + 4] = bytes((r, g, b, 255))
                    x += 1
                continue
            color = marker.get(run.kind, (255, 255, 255, 255))
            for _ in range(run.length):
                i = (y * width + x) * 4
                out[i : i + 4] = bytes(color)
                x += 1
        if x != width:
            raise ValueError(f"diagnostic row width mismatch {x} != {width}")
    return bytes(out)


def tip_profile(path: Path, preview_dir: Path | None) -> dict[str, object]:
    lib = parse_tip(path)
    result = summarize(lib)
    result["path"] = "NRes/CombatMap.Tip"
    result["sha256"] = sha256(path)
    result["frames"] = [
        {
            "index": f.index,
            "left": f.left,
            "top": f.top,
            "right": f.right,
            "bottom": f.bottom,
            "width": f.width,
            "height": f.height,
            "run_counts": {str(k): v for k, v in sorted(Counter(run.kind for row in f.rows for run in row.runs).items())},
        }
        for f in lib.frames
    ]
    result["rendering_status"] = "STRUCTURE_VERIFIED_VISUAL_SEMANTICS_PARTIAL"
    result["diagnostic_note"] = "Preview PNGs use RGB565 only for kind1 and marker colors for kinds2/3/4; they are not original-render claims."
    if preview_dir is not None:
        preview_dir.mkdir(parents=True, exist_ok=True)
        for frame in lib.frames:
            write_png(preview_dir / f"combat-map-frame-{frame.index:02d}-diagnostic.png", frame.width, frame.height, diagnostic_frame_rgba(frame))
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--client-root", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--preview-dir", type=Path)
    args = ap.parse_args()
    root = args.client_root.resolve()
    if not root.is_dir():
        raise ValueError(f"not a client directory: {root}")
    missing = [rel for rel in TARGETS if not (root / rel).is_file()]
    if missing:
        raise FileNotFoundError(", ".join(missing))

    payload = {
        "schema": 1,
        "evidence": "VERIFIED_STATIC_COMBAT_RESOURCE_PROBE",
        "scope": "Hash exact extracted 2.2 resources; no original executable run.",
        "combat_map_tip": tip_profile(root / "NRes/CombatMap.Tip", args.preview_dir),
        "combat_select_tdg": tdg_profile(root / "Dlg/CombatSelect.Tdg"),
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "combat_map_frames": payload["combat_map_tip"]["frame_count"],
        "combat_map_canvas": payload["combat_map_tip"]["canvas"],
        "combat_select_size": payload["combat_select_tdg"]["size"],
        "output": str(args.out),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
