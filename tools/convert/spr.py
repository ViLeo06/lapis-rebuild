#!/usr/bin/env python3
"""Parse and export NeoDark/Lapis .spr frames to transparent PNG files."""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
import zlib
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SprFrame:
    index: int
    left: int
    top: int
    right: int
    bottom: int
    payload_size: int
    rgba: bytes

    @property
    def width(self) -> int:
        return self.right - self.left

    @property
    def height(self) -> int:
        return self.bottom - self.top


@dataclass(frozen=True)
class SprData:
    path: str
    sha256: str
    frame_count: int
    frames: list[SprFrame]


def _rgb565_to_rgba(value: int) -> bytes:
    r = ((value >> 11) & 0x1F) * 255 // 31
    g = ((value >> 5) & 0x3F) * 255 // 63
    b = (value & 0x1F) * 255 // 31
    return bytes((r, g, b, 255))


def parse_spr(path: str | Path, *, strict: bool = True) -> SprData:
    path = Path(path)
    data = path.read_bytes()
    if len(data) < 4:
        raise ValueError(f"truncated .spr: {path}")
    frame_count = struct.unpack_from("<I", data, 0)[0]
    bounds_end = 4 + frame_count * 16
    if bounds_end > len(data):
        raise ValueError(f"frame table exceeds file size: {path}")

    bounds = [struct.unpack_from("<4i", data, 4 + i * 16) for i in range(frame_count)]
    pos = bounds_end
    frames: list[SprFrame] = []

    for index, (left, top, right, bottom) in enumerate(bounds):
        width, height = right - left, bottom - top
        if width <= 0 or height <= 0:
            raise ValueError(f"invalid bounds for frame {index}: {(left, top, right, bottom)}")
        if pos + 6 > len(data):
            raise ValueError(f"truncated frame header {index}: {path}")

        payload_size = struct.unpack_from("<I", data, pos)[0]
        pos += 4
        payload_start = pos
        row_count = struct.unpack_from("<H", data, pos)[0]
        pos += 2
        if strict and row_count != height:
            raise ValueError(f"frame {index}: row_count={row_count}, height={height}")

        rgba = bytearray(width * height * 4)
        for y in range(row_count):
            if pos + 2 > len(data):
                raise ValueError(f"truncated row {y} in frame {index}")
            span_count = struct.unpack_from("<H", data, pos)[0]
            pos += 2
            for _ in range(span_count):
                if pos + 4 > len(data):
                    raise ValueError(f"truncated span header in frame {index}, row {y}")
                x, pixel_count = struct.unpack_from("<HH", data, pos)
                pos += 4
                if strict and x + pixel_count > width:
                    raise ValueError(f"frame {index}, row {y}: span x={x}, count={pixel_count}, width={width}")
                if pos + pixel_count * 2 > len(data):
                    raise ValueError(f"truncated pixels in frame {index}, row {y}")
                for dx in range(pixel_count):
                    pixel = struct.unpack_from("<H", data, pos)[0]
                    pos += 2
                    if y < height and x + dx < width:
                        out = (y * width + x + dx) * 4
                        rgba[out : out + 4] = _rgb565_to_rgba(pixel)

        consumed = pos - payload_start
        if strict and consumed != payload_size:
            raise ValueError(f"frame {index}: payload consumed={consumed}, declared={payload_size}")
        frames.append(SprFrame(index, left, top, right, bottom, payload_size, bytes(rgba)))

    if strict and pos != len(data):
        raise ValueError(f"unexpected trailing bytes: {len(data) - pos}: {path}")
    return SprData(str(path), hashlib.sha256(data).hexdigest(), frame_count, frames)


def _png_chunk(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)


def write_png(path: str | Path, width: int, height: int, rgba: bytes) -> None:
    path = Path(path)
    if len(rgba) != width * height * 4:
        raise ValueError("RGBA byte count does not match dimensions")
    scanlines = b"".join(b"\x00" + rgba[y * width * 4 : (y + 1) * width * 4] for y in range(height))
    png = b"\x89PNG\r\n\x1a\n"
    png += _png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += _png_chunk(b"IDAT", zlib.compress(scanlines, 9))
    png += _png_chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def export_spr(spr: SprData, output_dir: str | Path) -> dict:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    metadata = []
    for frame in spr.frames:
        filename = f"frame-{frame.index:03d}.png"
        write_png(output_dir / filename, frame.width, frame.height, frame.rgba)
        metadata.append({
            "index": frame.index,
            "png": filename,
            "left": frame.left,
            "top": frame.top,
            "right": frame.right,
            "bottom": frame.bottom,
            "width": frame.width,
            "height": frame.height,
            "payload_size": frame.payload_size,
            "rgba_sha256": hashlib.sha256(frame.rgba).hexdigest(),
        })
    result = {"source": spr.path, "sha256": spr.sha256, "frame_count": spr.frame_count, "frames": metadata}
    (output_dir / "index.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("spr", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--no-strict", action="store_true")
    args = parser.parse_args()
    spr = parse_spr(args.spr, strict=not args.no_strict)
    result = export_spr(spr, args.output_dir)
    print(json.dumps({"frame_count": result["frame_count"], "output_dir": str(args.output_dir)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
