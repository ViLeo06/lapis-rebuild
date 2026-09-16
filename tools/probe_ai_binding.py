#!/usr/bin/env python3
"""Verify how fixed retail battle-roster records bind AI behavior programs.

This is static byte inspection of the deterministic UPX-decompressed 2.2 image.
It never executes or loads the game program as code.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
from dataclasses import dataclass
from pathlib import Path

EXPECTED_SHA256 = "432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7"


@dataclass(frozen=True)
class Section:
    va: int
    vsize: int
    raw: int
    rsize: int


def parse_sections(data: bytes) -> list[Section]:
    pe = struct.unpack_from("<I", data, 0x3C)[0]
    if data[:2] != b"MZ" or data[pe : pe + 4] != b"PE\0\0":
        raise ValueError("not PE")
    coff = pe + 4
    count = struct.unpack_from("<H", data, coff + 2)[0]
    opt_size = struct.unpack_from("<H", data, coff + 16)[0]
    opt = coff + 20
    if struct.unpack_from("<H", data, opt)[0] != 0x10B:
        raise ValueError("not PE32")
    image_base = struct.unpack_from("<I", data, opt + 28)[0]
    table = opt + opt_size
    out: list[Section] = []
    for index in range(count):
        pos = table + index * 40
        vsize, rva, rsize, raw = struct.unpack_from("<IIII", data, pos + 8)
        if raw + rsize > len(data):
            raise ValueError("section exceeds file")
        out.append(Section(image_base + rva, vsize, raw, rsize))
    return out


def va_offset(va: int, sections: list[Section]) -> int:
    for section in sections:
        if section.va <= va < section.va + max(section.vsize, section.rsize):
            offset = section.raw + va - section.va
            if offset < section.raw + section.rsize:
                return offset
    raise ValueError(f"unmapped VA 0x{va:x}")


def verify(data: bytes, sections: list[Section], name: str, va: int, hex_bytes: str) -> dict:
    want = bytes.fromhex(hex_bytes)
    offset = va_offset(va, sections)
    got = data[offset : offset + len(want)]
    if got != want:
        raise ValueError(f"{name}: {got.hex()} != {want.hex()}")
    return {"name": name, "va": f"0x{va:08x}", "hex": want.hex(), "verified": True}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("image", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    data = args.image.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED_SHA256:
        raise ValueError(f"unpacked image hash mismatch: {digest}")
    sections = parse_sections(data)

    specs = [
        (
            "battle_record_ctor_has_behavior_string_at_c4",
            0x004AF810,
            "8bc18b0de4bc4f008988ac0000008b15e4bc4f008990b00000008b0de4bc4f008988c4000000c3",
        ),
        (
            "roster_category_copied_to_unit_2c8",
            0x004B3D70,
            "0fbf8db8000000898ec80200008b0da43aa700",
        ),
        (
            "roster_category_dispatch_0_to_8",
            0x004B3E73,
            "8b86c802000083f8080f8713050000ff2485c0434b00",
        ),
        (
            "roster_categories_7_8_share_ai_parser",
            0x004B43C0,
            "893e4b00873f4b00943f4b00a13f4b00ae3f4b00d93f4b0095434b001c404b001c404b00",
        ),
        (
            "roster_ai_string_default_when_empty",
            0x004B401C,
            "6810010000e83d9901008b95c400000081c5c40000008bf883c4048b42f885c0750c6804a14f008bcde8159d01008d4c2418",
        ),
        (
            "battle_roster_record_array_stride_c8",
            0x004AFC64,
            "8b451033ff85c07e7b8d752856b9f892a300e8c53e000083f8ff7e168b4e4c8b5648518b0e525150b9f892a300e8ca4900008b45104781c6c80000003bf87ccc5f5e5d",
        ),
    ]
    signatures = [verify(data, sections, *spec) for spec in specs]
    payload = {
        "schema": 1,
        "evidence": "VERIFIED_STATIC_ORIGINAL_FIXED_HASH",
        "input_sha256": digest,
        "signatures": signatures,
        "facts": {
            "battle_roster_record": {
                "stride_bytes": 200,
                "behavior_string_offset": 196,
                "category_word_offset": 184,
            },
            "ai_binding": {
                "category_values_using_behavior_parser": [7, 8],
                "empty_behavior_fallback": "ODNORMAL REST(20),ATTACK(80)",
                "conclusion": (
                    "The retail client battle-roster record can carry a per-unit AI behavior "
                    "string. Unit categories 7 and 8 route through the AI parser; an empty "
                    "behavior string is replaced by the retail default program."
                ),
            },
        },
        "boundary": (
            "This verifies the client-side per-unit binding mechanism, not which retired-server "
            "encounter assigned which behavior string to a specific monster."
        ),
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"signatures": len(signatures), "output": str(args.out)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
