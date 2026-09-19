#!/usr/bin/env python3
"""Statically parse NeoDark/YBCS *.Tdg dialog graphics libraries.

The fixed-hash 2.2 client shows that TDG uses the same recovered container,
offset table, frame descriptors and row/run framing as TIP, with the magic
"DIALOG LIBRARY.\0". Run kinds 2/3/4 keep the same visual-semantics caveat as
TIP. This module never executes retail code.
"""
from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path

try:
    from .tip import (
        ALLOWED_FLAGS, HEADER_SIZE, MARKER_A, MARKER_B,
        TipFrame, TipLibrary, TipRow, TipRun, _payload_words, summarize,
    )
except ImportError:
    from tip import (
        ALLOWED_FLAGS, HEADER_SIZE, MARKER_A, MARKER_B,
        TipFrame, TipLibrary, TipRow, TipRun, _payload_words, summarize,
    )

MAGIC = b"DIALOG LIBRARY.\0"


def parse_tdg(path: str | Path) -> TipLibrary:
    path = Path(path)
    data = path.read_bytes()
    if len(data) < HEADER_SIZE + 4:
        raise ValueError("TDG shorter than header")
    if data[:len(MAGIC)] != MAGIC:
        raise ValueError("invalid TDG magic")
    flag = struct.unpack_from("<H", data, 0x10)[0]
    if flag not in ALLOWED_FLAGS:
        raise ValueError(f"unsupported TDG flag 0x{flag:04x}")
    if any(data[0x12:0x1b]):
        raise ValueError("nonzero TDG reserved header bytes")
    width, height = struct.unpack_from("<HH", data, 0x1b)
    if not width or not height:
        raise ValueError("invalid TDG canvas dimensions")
    if data[0x1f] != MARKER_A or data[0x20] != MARKER_B:
        raise ValueError("unsupported TDG header markers")
    frame_count = struct.unpack_from("<I", data, 0x21)[0]
    if not 1 <= frame_count <= 100000:
        raise ValueError("invalid TDG frame count")

    table_end = HEADER_SIZE + 4 * (frame_count + 1)
    if table_end > len(data):
        raise ValueError("truncated TDG offset table")
    offsets = struct.unpack_from("<" + "I" * (frame_count + 1), data, HEADER_SIZE)
    if offsets[0] != 0 or any(b < a for a, b in zip(offsets, offsets[1:])):
        raise ValueError("invalid TDG frame offsets")

    pixel_start = table_end
    tail_start = pixel_start + offsets[-1] * 2
    expected_size = tail_start + 4 + 16 * frame_count
    if expected_size != len(data):
        raise ValueError(f"TDG size mismatch expected={expected_size} got={len(data)}")
    repeated_count = struct.unpack_from("<I", data, tail_start)[0]
    if repeated_count != frame_count:
        raise ValueError("TDG repeated frame count mismatch")

    descriptors = []
    pos = tail_start + 4
    for index in range(frame_count):
        left, top, bottom, right = struct.unpack_from("<4i", data, pos)
        pos += 16
        if not (0 <= left < right <= width and 0 <= top < bottom <= height):
            raise ValueError(
                f"TDG frame {index} rectangle outside canvas: {(left, top, bottom, right)}"
            )
        descriptors.append((left, top, right, bottom))

    frames = []
    for index, ((word_start, word_end), rect) in enumerate(
        zip(zip(offsets, offsets[1:]), descriptors)
    ):
        left, top, right, bottom = rect
        word_count = word_end - word_start
        byte_start = pixel_start + word_start * 2
        words = (
            struct.unpack_from("<" + "H" * word_count, data, byte_start)
            if word_count else ()
        )
        cursor = 0
        rows = []
        frame_width = right - left
        frame_height = bottom - top
        for row_index in range(frame_height):
            if cursor >= len(words):
                raise ValueError(f"TDG frame {index} row {row_index}: missing span count")
            span_count = words[cursor]
            cursor += 1
            x = 0
            runs = []
            for _ in range(span_count):
                if cursor >= len(words):
                    raise ValueError(f"TDG frame {index} row {row_index}: missing run code")
                code = words[cursor]
                cursor += 1
                kind = code >> 12
                length = code & 0x0fff
                if length == 0:
                    raise ValueError(f"TDG frame {index} row {row_index}: zero-length run")
                payload_count = _payload_words(kind, length)
                if cursor + payload_count > len(words):
                    raise ValueError(
                        f"TDG frame {index} row {row_index}: truncated kind {kind} payload"
                    )
                payload = tuple(words[cursor:cursor + payload_count])
                cursor += payload_count
                x += length
                if x > frame_width:
                    raise ValueError(f"TDG frame {index} row {row_index}: runs exceed row width")
                runs.append(TipRun(kind, length, payload))
            if x != frame_width:
                raise ValueError(
                    f"TDG frame {index} row {row_index}: run width {x} != {frame_width}"
                )
            rows.append(TipRow(tuple(runs)))
        if cursor != len(words):
            raise ValueError(f"TDG frame {index}: {len(words) - cursor} trailing stream words")
        frames.append(TipFrame(index, left, top, right, bottom, tuple(rows)))

    return TipLibrary(str(path), flag, width, height, tuple(frames), tuple(offsets))


def summarize_tdg(lib: TipLibrary) -> dict:
    out = summarize(lib)
    out["container_magic"] = "DIALOG LIBRARY."
    out["format_evidence"] = "VERIFIED_STATIC_STRUCTURE"
    out["rendering_caveat"] = (
        "Container/frame/run framing is verified; run kinds 2/3/4 visual semantics "
        "remain inferred/unverified."
    )
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("tdg", type=Path)
    ap.add_argument("--json", type=Path)
    args = ap.parse_args()
    text_value = json.dumps(summarize_tdg(parse_tdg(args.tdg)), ensure_ascii=False, indent=2) + "\n"
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(text_value, encoding="utf-8")
    else:
        print(text_value, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
