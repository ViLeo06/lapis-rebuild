#!/usr/bin/env python3
"""Strict parser/decoder for old NeoDark/YBCS .sgr resource files.

Version-100 SGR files contain three partitions in sequence: compact DIB
records, middle grid/run-RGB565 image records, and extended DIB records.
Unknown auxiliary fields are preserved without assigning unsupported business
semantics.
"""
from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path


class SgrError(ValueError):
    pass


class Cursor:
    def __init__(self, data: bytes, source: str = "<memory>"):
        self.data = data
        self.pos = 0
        self.source = source

    def u8(self, label="u8"):
        if self.pos >= len(self.data):
            raise SgrError(f"{self.source}: truncated {label} at 0x{self.pos:x}")
        value = self.data[self.pos]
        self.pos += 1
        return value

    def u32(self, label="u32"):
        if self.pos + 4 > len(self.data):
            raise SgrError(f"{self.source}: truncated {label} at 0x{self.pos:x}")
        value = struct.unpack_from("<I", self.data, self.pos)[0]
        self.pos += 4
        return value

    def take(self, size, label="bytes"):
        if size > len(self.data) - self.pos:
            raise SgrError(f"{self.source}: truncated {label} at 0x{self.pos:x}, size={size}")
        offset = self.pos
        self.pos += size
        return offset, self.data[offset : self.pos]


def _ascii(raw: bytes, source: str, label: str) -> str:
    try:
        return raw.decode("ascii")
    except UnicodeDecodeError as exc:
        raise SgrError(f"{source}: non-ASCII {label}") from exc


def _dib(prefix: bytes, source: str, offset: int) -> dict:
    if len(prefix) < 40:
        raise SgrError(f"{source}: short DIB prefix")
    size, width, height, planes, bpp, compression, image_size, xppm, yppm, colors_used, colors_important = struct.unpack_from("<IiiHHIIiiII", prefix, 0)
    if size != 40 or width <= 0 or height == 0 or abs(height) > 4096 or width > 4096:
        raise SgrError(f"{source}: invalid DIB header")
    if planes != 1 or bpp not in (1, 4, 8, 16, 24, 32) or compression not in (0, 1, 2, 3):
        raise SgrError(f"{source}: unsupported DIB")
    palette_entries = colors_used or ((1 << bpp) if bpp <= 8 else 0)
    mask_count = 3 if bpp > 8 and compression == 3 else 0
    pixel_offset = 40 + palette_entries * 4 + mask_count * 4
    if pixel_offset != len(prefix):
        raise SgrError(f"{source}: DIB prefix size mismatch")
    row_stride = ((width * bpp + 31) // 32) * 4
    required = image_size or row_stride * abs(height)
    return {"width": width, "height": height, "bits_per_pixel": bpp, "compression": compression, "image_size": image_size, "palette_entries": palette_entries, "pixel_offset": pixel_offset, "row_stride": row_stride, "required_pixel_bytes": required, "prefix_offset": offset, "prefix_size": len(prefix)}


def _parse_dib_record(cursor: Cursor, index: int, family: str, extended: bool = False) -> dict:
    record_offset = cursor.pos
    record_type = None
    if not extended:
        record_type = cursor.u32("record type")
        name_size = cursor.u32("name size")
        _, raw_name = cursor.take(name_size, "name")
        name = _ascii(raw_name, cursor.source, "name")
        major = minor = None
    else:
        name_size = cursor.u32("extended name size")
        _, raw_name = cursor.take(name_size, "extended name")
        name = _ascii(raw_name, cursor.source, "extended name")
        major = cursor.u32("extended major count")
        minor = cursor.u32("extended minor count")
    auxiliary_size = cursor.u32("aux size")
    auxiliary_offset, _ = cursor.take(auxiliary_size, "aux")
    prefix_size = cursor.u32("DIB prefix size")
    prefix_offset, prefix = cursor.take(prefix_size, "DIB prefix")
    dib = _dib(prefix, cursor.source, prefix_offset)
    frames = []
    if not extended:
        top_count = cursor.u32("top count")
        for top in range(top_count):
            leaf_count = cursor.u32("repeated leaf count")
            child_count = cursor.u32("child count")
            if max(leaf_count, child_count) > 0x10000:
                raise SgrError("unreasonable DIB directory")
            for child in range(child_count):
                child_metadata = cursor.u32("child metadata")
                for leaf in range(leaf_count):
                    frame_count = cursor.u32("frame count")
                    if frame_count > 0x10000:
                        raise SgrError("unreasonable frame count")
                    for frame_index in range(frame_count):
                        length_offset = cursor.pos
                        segment_size = cursor.u32("segment size")
                        segment_offset, _ = cursor.take(segment_size, "segment")
                        if segment_size < dib["required_pixel_bytes"]:
                            raise SgrError("short DIB segment")
                        frames.append({"directory_path": [index, top, child, leaf], "frame_index": frame_index, "child_metadata": child_metadata, "segment_length_offset": length_offset, "segment_offset": segment_offset, "segment_size": segment_size})
    else:
        group_count = cursor.u32("extended group count")
        if max(major or 0, minor or 0, group_count) > 0x10000:
            raise SgrError("unreasonable extended dimensions")
        for group in range(group_count):
            for major_index in range(major or 0):
                for minor_index in range(minor or 0):
                    frame_count = cursor.u32("extended frame count")
                    if frame_count > 0x10000:
                        raise SgrError("unreasonable extended frame count")
                    for frame_index in range(frame_count):
                        length_offset = cursor.pos
                        segment_size = cursor.u32("extended segment size")
                        segment_offset, _ = cursor.take(segment_size, "extended segment")
                        if segment_size < dib["required_pixel_bytes"]:
                            raise SgrError("short extended DIB segment")
                        frames.append({"directory_path": [index, group, major_index, minor_index], "frame_index": frame_index, "segment_length_offset": length_offset, "segment_offset": segment_offset, "segment_size": segment_size})
    return {"family": family, "record_index": index, "record_offset": record_offset, "record_type": record_type, "name": name, "major_count": major, "minor_count": minor, "auxiliary_offset": auxiliary_offset, "auxiliary_size": auxiliary_size, "dib": dib, "frames": frames, "end_offset": cursor.pos}


def _parse_middle(cursor: Cursor, index: int) -> dict:
    record_offset = cursor.pos
    name_size = cursor.u32("middle name size")
    _, raw_name = cursor.take(name_size, "middle name")
    name = _ascii(raw_name, cursor.source, "middle name")
    grid_width = cursor.u32("grid width")
    grid_height = cursor.u32("grid height")
    if grid_width > 0x10000 or grid_height > 0x10000:
        raise SgrError("unreasonable middle grid")
    four_count = cursor.u8("four-byte count")
    four = []
    for i in range(four_count):
        offset, raw = cursor.take(4, "four-byte record")
        four.append({"index": i, "offset": offset, "values": list(raw)})
    marked_count = cursor.u32("marked count")
    marked = []
    for _ in range(marked_count):
        _, raw = cursor.take(8, "marked pair")
        marked.append(list(struct.unpack("<II", raw)))
    marked_set = {tuple(row) for row in marked}
    cells = []
    for y in range(grid_height):
        for x in range(grid_width):
            offset, raw = cursor.take(8, "grid cell")
            value0, value1 = struct.unpack("<II", raw)
            cells.append({"x": x, "y": y, "offset": offset, "value0": value0, "value1": value1, "occlusion": (x, y) in marked_set})
    auxiliary14_count = cursor.u32("aux14 count")
    auxiliary14 = []
    for i in range(auxiliary14_count):
        offset, raw = cursor.take(14, "aux14")
        value0, value4, value8, value12 = struct.unpack("<IIHI", raw)
        auxiliary14.append({"index": i, "offset": offset, "value0": value0, "value4": value4, "value8": value8, "value12": value12})
    sections = []
    for section in range(2):
        count = cursor.u32("image count")
        if count > 0x100000:
            raise SgrError("unreasonable image count")
        images = []
        for i in range(count):
            offset = cursor.pos
            serialized_height = cursor.u32("serialized height")
            payload_size = cursor.u32("payload size")
            _, rect = cursor.take(16, "RECT")
            bounds = list(struct.unpack("<4i", rect))
            payload_offset, _ = cursor.take(payload_size, "image payload")
            images.append({"section": section, "index": i, "record_offset": offset, "serialized_height": serialized_height, "payload_size": payload_size, "bounds": bounds, "payload_offset": payload_offset})
        sections.append(images)
    return {"record_index": index, "record_offset": record_offset, "name": name, "grid_width": grid_width, "grid_height": grid_height, "four_byte_records": four, "marked_cells": marked, "grid_cells": cells, "auxiliary14_records": auxiliary14, "images": sections, "end_offset": cursor.pos}


def parse_sgr_bytes(data: bytes, source="<memory>") -> dict:
    cursor = Cursor(data, source)
    version = cursor.u32("version")
    compact_count = cursor.u32("compact count")
    if compact_count > 0x10000:
        raise SgrError("unreasonable compact count")
    compact = [_parse_dib_record(cursor, i, "compact", False) for i in range(compact_count)]
    middle_count = cursor.u32("middle count")
    if middle_count > 0x10000:
        raise SgrError("unreasonable middle count")
    middle = [_parse_middle(cursor, i) for i in range(middle_count)]
    extended_count = cursor.u32("extended count")
    if extended_count > 0x10000:
        raise SgrError("unreasonable extended count")
    extended = [_parse_dib_record(cursor, i, "extended", True) for i in range(extended_count)]
    if cursor.pos != len(data):
        raise SgrError(f"{source}: {len(data) - cursor.pos} trailing bytes")
    return {"source": source, "file_size": len(data), "version": version, "compact_records": compact, "middle_records": middle, "extended_records": extended, "end_offset": cursor.pos}


def parse_sgr(path: str | Path) -> dict:
    path = Path(path)
    return parse_sgr_bytes(path.read_bytes(), str(path))


def decode_dib_frame(data: bytes, record: dict, frame: dict) -> tuple[int, int, bytes]:
    dib = record["dib"]
    if dib["bits_per_pixel"] != 8 or dib["compression"] != 0:
        raise SgrError("only 8-bit BI_RGB DIB decoding implemented")
    prefix = data[dib["prefix_offset"] : dib["prefix_offset"] + dib["prefix_size"]]
    palette = [prefix[40 + i * 4 : 43 + i * 4] for i in range(dib["palette_entries"])]
    raw = data[frame["segment_offset"] : frame["segment_offset"] + dib["required_pixel_bytes"]]
    width, height = dib["width"], abs(dib["height"])
    out = bytearray(width * height * 4)
    for y in range(height):
        source_y = height - 1 - y if dib["height"] > 0 else y
        base = source_y * dib["row_stride"]
        for x in range(width):
            palette_index = raw[base + x]
            if palette_index >= len(palette):
                raise SgrError("palette index out of range")
            b, g, r = palette[palette_index]
            offset = (y * width + x) * 4
            out[offset : offset + 4] = bytes((r, g, b, 255))
    return width, height, bytes(out)


def decode_middle_image(data: bytes, image: dict) -> tuple[int, int, bytes]:
    left, top, right, bottom = image["bounds"]
    width, height = right - left, bottom - top
    if width <= 0 or height <= 0 or image["serialized_height"] != height:
        raise SgrError("invalid middle image geometry")
    pos = image["payload_offset"]
    end = pos + image["payload_size"]
    out = bytearray(width * height * 4)

    def u16():
        nonlocal pos
        if pos + 2 > end:
            raise SgrError("truncated middle image")
        value = struct.unpack_from("<H", data, pos)[0]
        pos += 2
        return value

    for y in range(height):
        run_count = u16()
        x = 0
        for _ in range(run_count):
            x += u16()
            pixel_count = u16()
            if pixel_count == 0 or x + pixel_count > width:
                raise SgrError("invalid middle run")
            for pixel_x in range(x, x + pixel_count):
                value = u16()
                r = ((value >> 11) & 31) * 255 // 31
                g = ((value >> 5) & 63) * 255 // 63
                b = (value & 31) * 255 // 31
                offset = (y * width + pixel_x) * 4
                out[offset : offset + 4] = bytes((r, g, b, 255))
            x += pixel_count
    if pos != end:
        raise SgrError(f"middle image has {end - pos} unconsumed bytes")
    return width, height, bytes(out)


def summary(model: dict) -> dict:
    return {"source": model["source"], "file_size": model["file_size"], "version": model["version"], "compact_record_count": len(model["compact_records"]), "middle_record_count": len(model["middle_records"]), "extended_record_count": len(model["extended_records"]), "dib_frame_count": sum(len(row["frames"]) for row in model["compact_records"] + model["extended_records"]), "middle_image_count": sum(len(section) for row in model["middle_records"] for section in row["images"])}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sgr", type=Path)
    parser.add_argument("--json", type=Path)
    args = parser.parse_args()
    model = parse_sgr(args.sgr)
    payload = {"summary": summary(model), "model": model}
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
