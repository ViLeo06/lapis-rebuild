#!/usr/bin/env python3
"""Parse old NeoDark/YBCS MMF+SMF+IMF map bundles without executing the client."""

from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path


def _archive_string(data: bytes, pos: int) -> tuple[bytes, int]:
    if pos >= len(data):
        raise ValueError("truncated archive string")
    first = data[pos]
    pos += 1
    if first < 0xFF:
        size = first
    else:
        if pos + 2 > len(data):
            raise ValueError("truncated archive marker")
        marker = struct.unpack_from("<H", data, pos)[0]
        pos += 2
        if marker == 0xFFFE:
            raise ValueError("wide archive strings unsupported")
        if marker == 0xFFFF:
            if pos + 4 > len(data):
                raise ValueError("truncated archive length")
            size = struct.unpack_from("<I", data, pos)[0]
            pos += 4
        else:
            size = marker
    if pos + size > len(data):
        raise ValueError("archive string exceeds file")
    return data[pos : pos + size], pos + size


def parse_mmf(path: str | Path) -> dict:
    path = Path(path)
    data = path.read_bytes()
    pos = 0

    def i32() -> int:
        nonlocal pos
        if pos + 4 > len(data):
            raise ValueError("truncated MMF")
        value = struct.unpack_from("<i", data, pos)[0]
        pos += 4
        return value

    version = i32()
    resource_count = i32()
    if not 0 <= resource_count <= 0x10000:
        raise ValueError("invalid MMF resource count")
    resources = []
    for _ in range(resource_count):
        resource_id = i32()
        groups = []
        if version <= -300:
            for _ in range(2):
                count = i32()
                if not 0 <= count <= 0x100000:
                    raise ValueError("invalid MMF string count")
                values = []
                for _ in range(count):
                    raw, pos = _archive_string(data, pos)
                    values.append(raw.decode("ascii", "replace"))
                groups.append(values)
        resources.append({"resource_id": resource_id, "string_groups": groups})

    width = i32()
    height = i32()
    if width <= 0 or height <= 0:
        raise ValueError("invalid MMF dimensions")
    cell_data_offset = pos
    cells = []
    declared_ids = {row["resource_id"] for row in resources}
    for index in range(width * height):
        if pos + 4 > len(data):
            raise ValueError(f"truncated MMF cell {index}")
        packed = struct.unpack_from("<I", data, pos)[0]
        pos += 4
        extension = None
        if packed & 1:
            if pos + 4 > len(data):
                raise ValueError(f"truncated MMF extension {index}")
            extension = struct.unpack_from("<I", data, pos)[0]
            pos += 4
        resource_index = (packed >> 23) & 0x3F
        resource_id = resources[resource_index]["resource_id"] if resource_index < len(resources) else None
        if extension is None:
            directory_path = [(packed >> 15) & 0xFF, (packed >> 11) & 0x0F, (packed >> 5) & 0x3F, (packed >> 1) & 0x0F]
            storage_form = "compact-8-4-6-4"
        else:
            directory_path = [extension & 0xFF, (packed >> 5) & 0x3F, (extension >> 8) & 0xFFF, (extension >> 20) & 0xFFF]
            storage_form = "extended-8-6-12-12"
        cells.append({
            "packed": packed,
            "extension": extension,
            "resource_index": resource_index,
            "resource_id": resource_id,
            "resource_declared": resource_id in declared_ids if resource_id is not None else False,
            "storage_form": storage_form,
            "directory_path": directory_path,
            "high_flags": (packed >> 29) & 7,
        })
    if pos != len(data):
        raise ValueError(f"MMF trailing bytes: {len(data) - pos}")
    return {"source": str(path), "version": version, "resource_count": resource_count, "resources": resources, "width": width, "height": height, "cell_data_offset": cell_data_offset, "cells": cells}


def parse_smf(path: str | Path) -> dict:
    path = Path(path)
    data = path.read_bytes()
    pos = 0

    def take(size: int) -> bytes:
        nonlocal pos
        if pos + size > len(data):
            raise ValueError(f"truncated SMF at 0x{pos:x}")
        result = data[pos : pos + size]
        pos += size
        return result

    def unpack(fmt: str):
        return struct.unpack(fmt, take(struct.calcsize(fmt)))

    version, width, height = unpack("<3i")
    if version != -200:
        raise ValueError(f"unsupported SMF version {version}")
    if len(data) == 12:
        return {"source": str(path), "version": version, "width": width, "height": height, "records": []}
    extent_x, extent_y = unpack("<HH")
    if min(width, height, extent_x, extent_y) <= 0:
        raise ValueError("invalid SMF dimensions")
    records = []
    while pos < len(data):
        record_offset = pos
        x, y, kind, object_id = unpack("<iiHi")
        raw_name, pos = _archive_string(data, pos)
        if not raw_name or any(value > 0x7F for value in raw_name):
            raise ValueError(f"invalid SMF name at 0x{record_offset:x}")
        layer, flags = unpack("<hB")
        records.append({"x": x, "y": y, "file_offset": record_offset, "kind": kind, "object_id": object_id, "name": raw_name.decode("ascii"), "layer": layer, "flags": flags, "extent_x": extent_x, "extent_y": extent_y})
        if pos < len(data):
            extent_x, extent_y = unpack("<HH")
    return {"source": str(path), "version": version, "width": width, "height": height, "records": records}


def parse_imf(path: str | Path) -> dict:
    path = Path(path)
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b"\x70\xfe\xff\xff":
        raise ValueError("invalid IMF header")
    width, height = struct.unpack_from("<II", data, 4)
    if not width or not height:
        raise ValueError("invalid IMF dimensions")
    grid_end = 12 + width * height * 2
    if grid_end + 8 > len(data):
        raise ValueError("truncated IMF grid")
    count = struct.unpack_from("<I", data, grid_end)[0]
    expected = grid_end + 4 + count * 6 + 4
    if expected != len(data):
        raise ValueError(f"IMF size mismatch expected={expected} got={len(data)}")
    sparse = [struct.unpack_from("<HHH", data, grid_end + 4 + i * 6) for i in range(count)]
    if struct.unpack_from("<I", data, len(data) - 4)[0] != 0:
        raise ValueError("nonzero IMF terminator")
    if any(x >= width or y >= height for x, y, _ in sparse):
        raise ValueError("IMF sparse record out of bounds")
    disk_grid = [struct.unpack_from("<H", data, 12 + i * 2)[0] for i in range(width * height)]
    grid = [0] * (width * height)
    even_columns = (width + 1) // 2
    compact_seconds = (height + 1) // 2
    for compact_second in range(compact_seconds):
        for source_column in range(width):
            first = source_column * 2 if source_column < even_columns else (source_column - even_columns) * 2 + 1
            second = compact_second * 2 + (first & 1)
            if second < height:
                grid[first * height + second] = disk_grid[compact_second * width + source_column]
    return {"source": str(path), "width": width, "height": height, "grid_order": "first-major", "grid": grid, "sparse_records": [{"x": x, "y": y, "resource_id": resource_id} for x, y, resource_id in sparse]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stem", type=Path, help="bundle path without .mmf/.smf/.imf suffix")
    parser.add_argument("--json", type=Path)
    args = parser.parse_args()
    result = {"map_stem": str(args.stem), "mmf": parse_mmf(args.stem.with_suffix(".mmf")), "smf": parse_smf(args.stem.with_suffix(".smf")), "imf": parse_imf(args.stem.with_suffix(".imf"))}
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
