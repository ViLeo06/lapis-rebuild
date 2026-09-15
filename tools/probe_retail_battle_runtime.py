#!/usr/bin/env python3
"""Verify recovered battle-runtime facts in statically decompressed NeoDark.exe.

This is a byte-level evidence probe only. It never executes or loads the game.
It expects the hash-pinned UPX-decompressed image produced from client 2.2 and
checks exact strings/instruction signatures used by the reconstruction docs.
"""
from __future__ import annotations
import argparse, hashlib, json, struct
from dataclasses import dataclass
from pathlib import Path

EXPECTED_SHA256 = "432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7"

@dataclass(frozen=True)
class Section:
    name: str
    va: int
    vsize: int
    raw: int
    rsize: int


def parse_sections(data: bytes) -> tuple[int, list[Section]]:
    if data[:2] != b"MZ":
        raise ValueError("not MZ")
    pe = struct.unpack_from("<I", data, 0x3C)[0]
    if data[pe : pe + 4] != b"PE\0\0":
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
        off = table + index * 40
        name = data[off : off + 8].split(b"\0", 1)[0].decode("ascii", "replace")
        vsize, rva, rsize, raw = struct.unpack_from("<IIII", data, off + 8)
        out.append(Section(name, image_base + rva, vsize, raw, rsize))
    return image_base, out


def va_offset(va: int, sections: list[Section]) -> int:
    for section in sections:
        size = max(section.vsize, section.rsize)
        if section.va <= va < section.va + size:
            offset = section.raw + (va - section.va)
            if offset >= section.raw + section.rsize:
                raise ValueError(f"VA 0x{va:x} is not file-backed")
            return offset
    raise ValueError(f"VA 0x{va:x} not mapped")


def cstr(data: bytes, offset: int, limit: int = 256) -> bytes:
    end = data.find(b"\0", offset, min(len(data), offset + limit))
    return data[offset : (end if end >= 0 else min(len(data), offset + limit))]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("image", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    data = args.image.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED_SHA256:
        raise ValueError(f"unpacked image hash mismatch: {digest}")
    image_base, sections = parse_sections(data)

    strings = {
        "ODDEFENCE": 0x004F447C,
        "ODATTACK": 0x004F4488,
        "ODNORMAL": 0x004F4494,
        "SOILDER": 0x004F44BC,
        "AREA": 0x004F44C4,
        "MAGIC": 0x004F44CC,
        "ATTACK": 0x004F44D4,
        "REST": 0x004F44DC,
        "stamina_prefix": 0x004F87A4,
        "battle_map_format": 0x004F8D84,
        "default_ai": 0x004FA104,
    }
    expected = {
        "ODDEFENCE": b"ODDEFENCE",
        "ODATTACK": b"ODATTACK",
        "ODNORMAL": b"ODNORMAL",
        "SOILDER": b"SOILDER",
        "AREA": b"AREA",
        "MAGIC": b"MAGIC",
        "ATTACK": b"ATTACK",
        "REST": b"REST",
        "stamina_prefix": b"[STAMINA] ",
        "battle_map_format": b"sz-%04d.mmf",
        "default_ai": b"ODNORMAL REST(20),ATTACK(80)",
    }
    string_rows = []
    for name, va in strings.items():
        offset = va_offset(va, sections)
        raw = cstr(data, offset)
        if not raw.startswith(expected[name]):
            raise ValueError(f"{name} mismatch at 0x{va:08x}: {raw[:64]!r}")
        string_rows.append(
            {
                "name": name,
                "va": f"0x{va:08x}",
                "file_offset": offset,
                "prefix": expected[name].decode("ascii"),
                "verified": True,
            }
        )

    signatures = {
        "ai_random_mod_100": (0x00402E56, bytes.fromhex("e8bed60b0099b964000000f7f9")),
        "ai_order_threshold_dispatch": (0x00402E8A, bytes.fromhex("8b4f0483f904750cb814000000be28000000")),
        "ai_weight_inclusive_compare": (0x00402F32, bytes.fromhex("8b4ffc8b44242803d93bc30f8f")),
        "hp_absolute_overwrite": (0x00405C1A, bytes.fromhex("0fbf4424308b56348bc82bca894634898e48010000")),
        "battle_entry_mode1_decoder": (0x004901D0, bytes.fromhex("83ec208b44242856578a0880f901")),
        "battle_zone_format_call": (0x0048ED75, bytes.fromhex("578d54243468848d4f0052")),
        "battle_zone_store": (0x0048ED91, bytes.fromhex("893db4484f00")),
        "battle_geometry_scale_axes": (0x0049C817, bytes.fromhex("c1e704c1e204c1e605c1e005")),
    }
    signature_rows = []
    for name, (va, want) in signatures.items():
        offset = va_offset(va, sections)
        got = data[offset : offset + len(want)]
        if got != want:
            raise ValueError(
                f"{name} signature mismatch at 0x{va:08x}: {got.hex()} != {want.hex()}"
            )
        signature_rows.append(
            {
                "name": name,
                "va": f"0x{va:08x}",
                "file_offset": offset,
                "hex": want.hex(),
                "verified": True,
            }
        )

    payload = {
        "schema": 1,
        "evidence": "VERIFIED_STATIC_UNPACKED_BYTE_SIGNATURES",
        "scope": "Hash-pinned UPX-decompressed NeoDark 2.2 image; no original program execution. Byte signatures prove the listed machine-code/string facts, not server-side formulas or live behavior.",
        "input": {
            "file": args.image.name,
            "size": len(data),
            "sha256": digest,
            "image_base": f"0x{image_base:08x}",
        },
        "strings": string_rows,
        "signatures": signature_rows,
        "interpretation_boundaries": [
            "AI parser/executor is present client-side, but per-unit programs can be supplied by battle roster/network state.",
            "HP consumer stores an incoming absolute HP value; exact retail hit/damage/critical arithmetic remains server-authority evidence, not recovered client formula.",
            "Battle entry loads sz-%04d.mmf from a supplied zone value; the retail field encounter that chooses that zone is not inferred here.",
        ],
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "sha256": digest,
                "strings": len(string_rows),
                "signatures": len(signature_rows),
                "output": str(args.out),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
