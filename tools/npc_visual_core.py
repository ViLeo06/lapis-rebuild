#!/usr/bin/env python3
"""Shared static helpers for S16 NPC visual recovery.

The module never executes original client code. Rendering of TIP run kinds 3/4
uses a deliberately named *inferred* 5-bit alpha policy for human inspection;
that rendering policy is not promoted to VERIFIED retail semantics.
"""
from __future__ import annotations

import hashlib
import json
import math
import struct
import zlib
from collections import Counter
from pathlib import Path
from typing import Iterable, Mapping, Sequence

BODY_DIRECTIONS = ("S", "SW", "W", "NW", "N", "NE", "E", "SE")
TIP_RENDER_POLICY = "INFERRED_STATIC_RENDERING_RGB565_PLUS_ALPHA5"

ACTION_SEMANTICS = {
    0: ("idle", "RECOVERED_SECONDARY"),
    1: ("walk", "RECOVERED_SECONDARY"),
    2: ("attack-or-cast", "RECOVERED_SECONDARY"),
    3: ("hit-reaction", "VERIFIED_STATIC_ORIGINAL"),
    5: ("special", "UNVERIFIED"),
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def rgb565(value: int) -> tuple[int, int, int]:
    return (
        ((value >> 11) & 0x1F) * 255 // 31,
        ((value >> 5) & 0x3F) * 255 // 63,
        (value & 0x1F) * 255 // 31,
    )


def alpha5(value: int) -> int:
    if not 0 <= value <= 31:
        raise ValueError(f"TIP inferred alpha5 value outside 0..31: {value}")
    return round(value * 255 / 31)


def decode_tip_frame_inferred(frame) -> bytes:
    """Render one parsed TIP frame for visual archaeology only.

    Structure/payload sizes come from the verified TIP parser. Visual meanings:
    kind 0 transparent; kind 1 literal RGB565; kind 2 repeated RGB565;
    kind 3 literal RGB565+alpha5; kind 4 repeated RGB565+alpha5.
    Kinds 2/3/4 remain INFERRED rendering semantics.
    """
    width, height = frame.width, frame.height
    rgba = bytearray(width * height * 4)
    for y, row in enumerate(frame.rows):
        x = 0
        for run in row.runs:
            if run.kind == 0:
                x += run.length
                continue
            if run.kind == 1:
                pixels = [(v, 255) for v in run.payload]
            elif run.kind == 2:
                pixels = [(run.payload[0], 255)] * run.length
            elif run.kind == 3:
                if len(run.payload) != run.length * 2:
                    raise ValueError("TIP kind 3 payload length mismatch")
                pixels = [
                    (run.payload[i * 2], alpha5(run.payload[i * 2 + 1]))
                    for i in range(run.length)
                ]
            elif run.kind == 4:
                if len(run.payload) != 2:
                    raise ValueError("TIP kind 4 payload length mismatch")
                pixels = [(run.payload[0], alpha5(run.payload[1]))] * run.length
            else:
                raise ValueError(f"unsupported TIP run kind {run.kind}")
            if len(pixels) != run.length:
                raise ValueError("TIP rendered run length mismatch")
            for value, alpha in pixels:
                if alpha:
                    r, g, b = rgb565(value)
                    off = (y * width + x) * 4
                    rgba[off:off + 4] = bytes((r, g, b, alpha))
                x += 1
        if x != width:
            raise ValueError(f"TIP rendered row width mismatch: {x} != {width}")
    return bytes(rgba)


def png_chunk(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(
        ">I", zlib.crc32(kind + payload) & 0xFFFFFFFF
    )


def write_rgba_png(path: Path, width: int, height: int, rgba: bytes) -> None:
    if len(rgba) != width * height * 4:
        raise ValueError("RGBA byte count does not match dimensions")
    scanlines = b"".join(
        b"\x00" + rgba[y * width * 4:(y + 1) * width * 4]
        for y in range(height)
    )
    data = b"\x89PNG\r\n\x1a\n"
    data += png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    data += png_chunk(b"IDAT", zlib.compress(scanlines, 9))
    data += png_chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def alpha_blit(dst: bytearray, dw: int, dh: int, src: bytes, sw: int, sh: int, dx: int, dy: int) -> None:
    """Straight-alpha source-over composite."""
    for sy in range(sh):
        ty = dy + sy
        if ty < 0 or ty >= dh:
            continue
        for sx in range(sw):
            tx = dx + sx
            if tx < 0 or tx >= dw:
                continue
            si = (sy * sw + sx) * 4
            sa = src[si + 3]
            if sa == 0:
                continue
            di = (ty * dw + tx) * 4
            if sa == 255:
                dst[di:di + 4] = src[si:si + 4]
                continue
            da = dst[di + 3]
            out_a = sa + (da * (255 - sa) + 127) // 255
            if out_a == 0:
                continue
            for c in range(3):
                numer = src[si + c] * sa * 255 + dst[di + c] * da * (255 - sa)
                dst[di + c] = min(255, (numer + out_a * 127) // (out_a * 255))
            dst[di + 3] = out_a


def make_tip_contact_sheet(lib, output: Path, *, columns: int = 10, gap: int = 4) -> dict:
    frames = list(lib.frames)
    if not frames:
        raise ValueError("TIP library has no frames")
    cell_w = max(f.width for f in frames)
    cell_h = max(f.height for f in frames)
    rows = math.ceil(len(frames) / columns)
    width = columns * cell_w + (columns + 1) * gap
    height = rows * cell_h + (rows + 1) * gap
    out = bytearray(width * height * 4)
    for i, frame in enumerate(frames):
        rgba = decode_tip_frame_inferred(frame)
        col, row = i % columns, i // columns
        dx = gap + col * (cell_w + gap) + (cell_w - frame.width) // 2
        dy = gap + row * (cell_h + gap) + (cell_h - frame.height) // 2
        alpha_blit(out, width, height, rgba, frame.width, frame.height, dx, dy)
    write_rgba_png(output, width, height, bytes(out))
    return {
        "png": output.name,
        "width": width,
        "height": height,
        "columns": columns,
        "cell_width": cell_w,
        "cell_height": cell_h,
        "frame_count": len(frames),
        "render_policy": TIP_RENDER_POLICY,
        "sha256": sha256_file(output),
    }


def fast_spr_metadata(path: Path) -> dict:
    data = path.read_bytes()
    if len(data) < 4:
        raise ValueError(f"truncated SPR: {path}")
    count = struct.unpack_from("<I", data, 0)[0]
    end = 4 + count * 16
    if end > len(data):
        raise ValueError(f"SPR frame table exceeds file: {path}")
    bounds = [struct.unpack_from("<4i", data, 4 + i * 16) for i in range(count)]
    if any(r < l or b < t for l, t, r, b in bounds):
        raise ValueError(f"SPR inverted frame bounds: {path}")
    nonempty = [(l, t, r, b) for l, t, r, b in bounds if r > l and b > t]
    empty_frame_count = len(bounds) - len(nonempty)
    widths = [r - l for l, t, r, b in nonempty]
    heights = [b - t for l, t, r, b in nonempty]
    return {
        "frame_count": count,
        "size": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "empty_frame_count": empty_frame_count,
        "bounds_union": {
            "left": min((x[0] for x in nonempty), default=0),
            "top": min((x[1] for x in nonempty), default=0),
            "right": max((x[2] for x in nonempty), default=0),
            "bottom": max((x[3] for x in nonempty), default=0),
        },
        "max_frame_width": max(widths, default=0),
        "max_frame_height": max(heights, default=0),
    }


def body_action_semantic(action: int) -> dict:
    semantic, evidence = ACTION_SEMANTICS.get(action, (f"action-{action:02d}", "UNVERIFIED"))
    return {"action": action, "semantic": semantic, "evidence": evidence}


def visual_fingerprint(actions: Mapping[int, Mapping[str, object]]) -> str:
    stable = [
        (int(action), str(meta.get("ani_sha256", "")), str(meta.get("spr_sha256", "")))
        for action, meta in sorted(actions.items())
    ]
    return hashlib.sha256(json.dumps(stable, separators=(",", ":")).encode()).hexdigest()


def choose_gallery_ids(ids: Sequence[int], limit: int = 220) -> list[int]:
    """Deterministic broad sample; this is selection policy, not NPC classification."""
    buckets = (
        (1001, 1036),
        (2000, 3999),
        (4000, 4199),
        (4200, 4599),
        (4600, 4999),
        (5000, 5199),
        (5200, 5457),
        (6000, 6999),
    )
    available = sorted(set(ids))
    chosen: list[int] = []
    per_bucket = max(1, limit // len(buckets))
    for lo, hi in buckets:
        pool = [x for x in available if lo <= x <= hi]
        if not pool:
            continue
        if len(pool) <= per_bucket:
            chosen.extend(pool)
            continue
        step = (len(pool) - 1) / (per_bucket - 1) if per_bucket > 1 else 0
        chosen.extend(pool[round(i * step)] for i in range(per_bucket))
    seen = set(chosen)
    for value in available:
        if len(chosen) >= limit:
            break
        if value >= 1000 and value not in seen:
            chosen.append(value)
            seen.add(value)
    return sorted(set(chosen))[:limit]


def build_action_atlas(ani, spr, output: Path) -> dict:
    """Pack 8 authored ANI rows into one fixed-cell PNG for browser animation."""
    referenced = sorted({idx for row in ani.directions for idx in row})
    if not referenced:
        raise ValueError("ANI has no referenced frames")
    if referenced[-1] >= spr.frame_count:
        raise ValueError("ANI references frame outside paired SPR")
    frames = [spr.frames[i] for i in referenced]
    left = min(f.left for f in frames)
    top = min(f.top for f in frames)
    right = max(f.right for f in frames)
    bottom = max(f.bottom for f in frames)
    cell_w, cell_h = right - left, bottom - top
    cols = max(len(row) for row in ani.directions)
    rows = len(ani.directions)
    width, height = cell_w * cols, cell_h * rows
    atlas = bytearray(width * height * 4)
    for row_index, indices in enumerate(ani.directions):
        for col, frame_index in enumerate(indices):
            frame = spr.frames[frame_index]
            dx = col * cell_w + frame.left - left
            dy = row_index * cell_h + frame.top - top
            alpha_blit(atlas, width, height, frame.rgba, frame.width, frame.height, dx, dy)
    write_rgba_png(output, width, height, bytes(atlas))
    return {
        "png": output.name,
        "columns": cols,
        "rows": rows,
        "cell_width": cell_w,
        "cell_height": cell_h,
        "anchor_x": -left,
        "anchor_y": -top,
        "frame_counts_by_direction": [len(row) for row in ani.directions],
        "raw_timing": ani.raw_timing,
        "timing_policy": "VERIFIED_CONSUMER_DEFAULT_1000_DIV_RAW_TIMING_WITH_KNOWN_EXCEPTIONS",
        "sha256": sha256_file(output),
    }
