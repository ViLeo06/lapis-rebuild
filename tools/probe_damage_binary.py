#!/usr/bin/env python3
"""Verify fixed-hash NeoDark damage-boundary and presentation facts.

Static byte inspection only. The probe intentionally does not infer a retail
hit, critical, defence, elemental, or damage formula from authored fields.
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


def sections(data: bytes) -> list[Section]:
    pe = struct.unpack_from("<I", data, 0x3C)[0]
    if data[pe : pe + 4] != b"PE\0\0":
        raise ValueError("not PE")
    coff = pe + 4
    count = struct.unpack_from("<H", data, coff + 2)[0]
    optional_size = struct.unpack_from("<H", data, coff + 16)[0]
    optional = coff + 20
    image_base = struct.unpack_from("<I", data, optional + 28)[0]
    table = optional + optional_size
    out = []
    for index in range(count):
        pos = table + index * 40
        vsize, rva, rsize, raw = struct.unpack_from("<IIII", data, pos + 8)
        out.append(Section(image_base + rva, vsize, raw, rsize))
    return out


def va_offset(va: int, section_rows: list[Section]) -> int:
    for section in section_rows:
        if section.va <= va < section.va + max(section.vsize, section.rsize):
            offset = section.raw + va - section.va
            if offset >= section.raw + section.rsize:
                raise ValueError(f"VA not file-backed: 0x{va:x}")
            return offset
    raise ValueError(f"VA not mapped: 0x{va:x}")


def verify_signature(
    data: bytes,
    section_rows: list[Section],
    name: str,
    va: int,
    hex_bytes: str,
) -> dict[str, object]:
    want = bytes.fromhex(hex_bytes)
    offset = va_offset(va, section_rows)
    got = data[offset : offset + len(want)]
    if got != want:
        raise ValueError(
            f"{name} mismatch at 0x{va:x}: {got.hex()} != {want.hex()}"
        )
    return {"name": name, "va": f"0x{va:08x}", "hex": want.hex(), "verified": True}


def cstr(data: bytes, section_rows: list[Section], va: int) -> bytes:
    offset = va_offset(va, section_rows)
    end = data.find(b"\0", offset, offset + 1024)
    if end < 0:
        raise ValueError(f"unterminated cstr 0x{va:x}")
    return data[offset:end]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("image", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    data = args.image.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED_SHA256:
        raise ValueError(f"hash mismatch: {digest}")
    section_rows = sections(data)

    filenames = {
        "ability.atr": 0x004F9814,
        "solskill.atr": 0x004F98CC,
        "Magicptn.atr": 0x004F9954,
        "Magictbl.atr": 0x004F999C,
        "itemtbl.atr": 0x004F9A88,
    }
    for text, va in filenames.items():
        if cstr(data, section_rows, va) != text.encode("ascii"):
            raise ValueError(f"{text} string mismatch")

    ability_format = cstr(data, section_rows, 0x004F9784).decode("ascii")
    conversion_count = (
        ability_format.count("%d")
        + ability_format.count("%x")
        + ability_format.count("%s")
    )
    if conversion_count != 46:
        raise ValueError(f"ability conversion count {conversion_count}")

    signature_rows = [
        verify_signature(
            data, section_rows, "ability_filename_ref", 0x004A060F, "6814984f00"
        ),
        verify_signature(
            data, section_rows, "magictbl_filename_ref", 0x004A1118, "689c994f00"
        ),
        verify_signature(
            data, section_rows, "magicptn_filename_ref", 0x004A12D0, "6854994f00"
        ),
        verify_signature(
            data, section_rows, "solskill_filename_ref", 0x004A16CA, "68cc984f00"
        ),
        verify_signature(
            data, section_rows, "itemtbl_filename_ref", 0x004A22A6, "68889a4f00"
        ),
        verify_signature(
            data,
            section_rows,
            "damage_presentation_reads_ability_plus_68",
            0x00405B81,
            "8b4368c74424240000000083f8057778ff2485e45c4000",
        ),
        verify_signature(
            data,
            section_rows,
            "damage_presentation_rng_mod_9",
            0x00405B98,
            "6a00e89ca90b0050e867a90b0083c408e86ca90b0099b909000000f7f98bfa",
        ),
        verify_signature(
            data,
            section_rows,
            "damage_presentation_rng_mod_5",
            0x00405C61,
            "6a00e8d3a80b0050e89ea80b0083c408e8a3a80b0099b905000000f7f98bfa",
        ),
        verify_signature(
            data,
            section_rows,
            "absolute_hp_overwrite_and_visual_delta",
            0x00405C1A,
            "0fbf4424308b56348bc82bca894634898e48010000",
        ),
    ]

    payload = {
        "schema": 1,
        "evidence": "VERIFIED_STATIC_ORIGINAL_FIXED_HASH",
        "input_sha256": digest,
        "table_loader": {
            "filenames": filenames,
            "ability_format": ability_format,
            "ability_conversion_count": conversion_count,
            "ability_record_mapping": (
                "fields 1..40 are written sequentially to +0x04..+0xa0; "
                "field 26 (row index 25) therefore maps to +0x68"
            ),
        },
        "signatures": signature_rows,
        "facts": {
            "authoritative_hp": (
                "incoming signed absolute HP is written directly to live HP; old/new "
                "difference is retained as presentation delta"
            ),
            "post_hp_presentation": (
                "when HP decreases, client reads ability record +0x68 (ability field "
                "26 / row index 25) and dispatches one of values 0..5; some presentation "
                "cases use local RNG modulo 9 or 5"
            ),
            "rng_boundary": (
                "the verified modulo-9/modulo-5 RNG occurs after the incoming absolute "
                "HP has already determined that damage happened; it is evidence for "
                "presentation variation, not evidence for retail hit/damage/critical RNG"
            ),
            "formula_status": "NOT_RECOVERED_FROM_THIS_CLIENT_PATH",
        },
        "non_claims": [
            "No physical damage formula is inferred.",
            "No hit/evasion formula is inferred.",
            "No critical formula is inferred.",
            "No magic/elemental formula is inferred.",
        ],
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "sha256": digest,
                "signatures": len(signature_rows),
                "output": str(args.out),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
