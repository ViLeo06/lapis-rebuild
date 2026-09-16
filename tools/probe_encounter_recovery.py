#!/usr/bin/env python3
"""Static probe for the fixed-hash YBCS 2.2 encounter/battle-entry boundary.

The probe never executes the retail program. It reads the deterministic
UPX-decompressed NeoDark.exe image, validates its hash, checks small instruction
signatures, and reports only bounded protocol/control-flow facts.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
from dataclasses import dataclass
from pathlib import Path

EXPECTED_SHA256 = "432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7"
PACKED_NEODARK_SHA256 = "c1be05eb2977a8aae8cbe8b716bc1e3957263edde8187d5269d554b327f13cbd"
INSTALLER_SHA256 = "c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88"


@dataclass(frozen=True)
class Section:
    name: str
    va: int
    vsize: int
    raw: int
    rsize: int


def parse_sections(data: bytes) -> tuple[int, list[Section]]:
    if len(data) < 0x100 or data[:2] != b"MZ":
        raise ValueError("not MZ")
    pe = struct.unpack_from("<I", data, 0x3C)[0]
    if pe + 24 > len(data) or data[pe : pe + 4] != b"PE\0\0":
        raise ValueError("not PE")
    coff = pe + 4
    count = struct.unpack_from("<H", data, coff + 2)[0]
    opt_size = struct.unpack_from("<H", data, coff + 16)[0]
    opt = coff + 20
    if opt + opt_size > len(data) or struct.unpack_from("<H", data, opt)[0] != 0x10B:
        raise ValueError("not PE32")
    image_base = struct.unpack_from("<I", data, opt + 28)[0]
    table = opt + opt_size
    sections: list[Section] = []
    for index in range(count):
        off = table + index * 40
        if off + 40 > len(data):
            raise ValueError("truncated section table")
        name = data[off : off + 8].split(b"\0", 1)[0].decode("ascii", "replace")
        vsize, rva, rsize, raw = struct.unpack_from("<IIII", data, off + 8)
        if raw + rsize > len(data):
            raise ValueError(f"section {name} exceeds file")
        sections.append(Section(name, image_base + rva, vsize, raw, rsize))
    return image_base, sections


def va_offset(va: int, sections: list[Section]) -> int:
    for section in sections:
        size = max(section.vsize, section.rsize)
        if section.va <= va < section.va + size:
            offset = section.raw + (va - section.va)
            if offset >= section.raw + section.rsize:
                raise ValueError(f"VA 0x{va:x} is not file-backed")
            return offset
    raise ValueError(f"VA 0x{va:x} not mapped")


def read_cstr(data: bytes, sections: list[Section], va: int, limit: int = 128) -> bytes:
    offset = va_offset(va, sections)
    end = data.find(b"\0", offset, min(len(data), offset + limit))
    if end < 0:
        raise ValueError(f"unterminated string at 0x{va:08x}")
    return data[offset:end]


def verify_signature(
    data: bytes,
    sections: list[Section],
    name: str,
    va: int,
    hex_bytes: str,
) -> dict[str, object]:
    want = bytes.fromhex(hex_bytes.replace(" ", ""))
    offset = va_offset(va, sections)
    got = data[offset : offset + len(want)]
    if got != want:
        raise ValueError(
            f"{name} mismatch at 0x{va:08x}: {got.hex()} != {want.hex()}"
        )
    return {
        "name": name,
        "va": f"0x{va:08x}",
        "file_offset": offset,
        "hex": want.hex(),
        "verified": True,
    }


def find_rel32_callers(data: bytes, sections: list[Section], target_va: int) -> list[int]:
    callers: list[int] = []
    for section in sections:
        raw = data[section.raw : section.raw + section.rsize]
        for index in range(0, max(0, len(raw) - 4)):
            if raw[index] != 0xE8:
                continue
            call_va = section.va + index
            rel = struct.unpack_from("<i", raw, index + 1)[0]
            if call_va + 5 + rel == target_va:
                callers.append(call_va)
    return sorted(callers)


def verify_callers(
    data: bytes,
    sections: list[Section],
    name: str,
    target_va: int,
    expected: list[int],
) -> dict[str, object]:
    got = find_rel32_callers(data, sections, target_va)
    if got != expected:
        raise ValueError(
            f"{name} callers for 0x{target_va:08x}: "
            f"{[hex(v) for v in got]} != {[hex(v) for v in expected]}"
        )
    return {
        "name": name,
        "target_va": f"0x{target_va:08x}",
        "callers": [f"0x{va:08x}" for va in got],
        "verified": True,
    }


def build_report(data: bytes, require_hash: bool = True) -> dict[str, object]:
    digest = hashlib.sha256(data).hexdigest()
    if require_hash and digest != EXPECTED_SHA256:
        raise ValueError(f"unpacked image hash mismatch: {digest}")
    image_base, sections = parse_sections(data)

    specs = [
        # World/network entity parsing: first 16-bit word -> +0xb4; type -> +0xf8;
        # following signed i16 -> +0x1c; small state byte -> +0x7d.
        ("entity_record_id_word_store", 0x004B56CA, "668b028d7a03668985b4000000"),
        ("entity_record_type_store", 0x004B5700, "33c08bcd8a4413ff508985f8000000"),
        ("entity_record_i16_attribute_store", 0x004B571B, "33d20fbf4c3bfe43894d1c"),
        ("entity_record_state_byte_store", 0x004B5757, "8a043b434333c988457d"),
        # Selected world-entity action path.
        ("world_action_runtime_words", 0x004984EB, "8b86b8000000668b8eb400000085c0"),
        ("world_action_state_gate_lt_10", 0x00498500, "807e7d0a0f8304010000"),
        (
            "world_action_type_gate_101_103",
            0x0049850A,
            "8b86f800000083f8650f8cda00000083f8670f8fd1000000",
        ),
        ("world_action_manhattan_lt_4", 0x004985B8, "03f883ff045f7d4e"),
        ("world_action_49_21_value_from_plus_1c", 0x004985C0, "668b461c"),
        (
            "world_action_49_21_01_packet",
            0x004985D0,
            "c644241849c644241921c644241a01668944241b",
        ),
        (
            "world_action_08_fallback_uses_plus_b4_word",
            0x004985F3,
            "8d54240466894c2405526a03b91897a400c644240c08e8c2e90000",
        ),
        # Selected scene-object action path.
        (
            "scene_action_49_04_packet_from_plus_80",
            0x0049120B,
            "526a06668b8880000000c64424084966894c240cb91897a400c64424090466c744240a0200",
        ),
        (
            "scene_action_manhattan_lt_9_and_call",
            0x00498937,
            "03f083fe097d1c51b9a899a300e8b788ffff",
        ),
        ("scene_runtime_id_lookup_plus_80", 0x0048AFF8, "8b7c24108bce8b1939bb8000000074104283c104"),
        ("scene_runtime_id_compare_creator_arg", 0x0048AC35, "8b6c242439af800000007407403bc27c"),
        ("scene_runtime_id_assignment_plus_80", 0x0048ACBD, "89a980000000"),
        # Server-authored battle entry.
        (
            "battle_entry_mode1_dispatch",
            0x0048D699,
            "458d8c249800000055518bcbe8262b0000",
        ),
        ("battle_entry_mode1_decoder", 0x004901D0, "83ec208b44242856578a0880f901"),
        (
            "battle_zone_constructor_uses_zone_arg",
            0x0048ED5A,
            "8b7c2430a1b4484f003bc70f84bb000000",
        ),
        ("battle_zone_format_call", 0x0048ED75, "578d54243468848d4f0052"),
        ("battle_zone_store", 0x0048ED91, "893db4484f00"),
        ("battle_geometry_scale_16_32", 0x0049C817, "c1e704c1e204c1e605c1e005"),
    ]
    signatures = [verify_signature(data, sections, *spec) for spec in specs]

    if read_cstr(data, sections, 0x004F8D84) != b"sz-%04d.mmf":
        raise ValueError("battle map format string mismatch")

    xrefs = [
        verify_callers(data, sections, "scene_action_sender", 0x00491200, [0x00498944]),
        verify_callers(data, sections, "battle_mode1_decoder", 0x004901D0, [0x0048D6A5]),
        verify_callers(
            data,
            sections,
            "battle_session_constructor",
            0x0048ECB0,
            [0x0048D5E6, 0x0048D655, 0x0048D6E7, 0x0048D746],
        ),
    ]

    return {
        "schema": 1,
        "evidence": "VERIFIED",
        "scope": (
            "Fixed-hash YBCS 2.2 NeoDark.exe, statically UPX-decompressed. "
            "Byte inspection only; the retail executable and installer are never executed."
        ),
        "input": {
            "size": len(data),
            "sha256": digest,
            "expected_sha256": EXPECTED_SHA256,
            "packed_neodark_sha256": PACKED_NEODARK_SHA256,
            "installer_sha256": INSTALLER_SHA256,
            "image_base": f"0x{image_base:08x}",
        },
        "signatures": signatures,
        "direct_call_xrefs": xrefs,
        "facts": {
            "world_entity_action": {
                "evidence": "VERIFIED",
                "entity_record_fields": {
                    "+0xb4": "first 16-bit entity-record word; reused by the 0x08 action path",
                    "+0xf8": "entity type byte",
                    "+0x1c": "following signed 16-bit entity-record attribute",
                    "+0x7d": "small state byte used by the action gate",
                },
                "typed_near_action": {
                    "entity_types": [101, 102, 103],
                    "distance": "Manhattan distance < 4",
                    "packet": "49 21 01 <u16 bits copied from entity +0x1c>",
                    "length": 5,
                    "distance_failure": "returns without sending this request",
                },
                "other_type_fallback": {
                    "packet": "08 <u16 bits copied from entity +0xb4>",
                    "length": 3,
                    "note": "reached only after the earlier selected-entity/state gates",
                },
                "semantic_boundary": (
                    "The native bytes prove an interaction/action path, not that 49/21 is an "
                    "encounter-start request. Treat encounter semantics as UNVERIFIED."
                ),
            },
            "scene_object_action": {
                "evidence": "VERIFIED",
                "distance": "Manhattan distance < 9",
                "packet": "49 04 02 00 <u16 runtime scene-object id from +0x80>",
                "length": 6,
                "sender_direct_callers": ["0x00498944"],
                "runtime_id": (
                    "scene manager lookup and object creation both compare/assign +0x80; "
                    "the 49/04 sender serializes its low 16 bits"
                ),
                "static_resource_join": (
                    "UNVERIFIED: no proof in this probe that runtime +0x80 equals an SMF "
                    "static object id"
                ),
            },
            "battle_entry": {
                "evidence": "VERIFIED",
                "downlink": "0x98 mode 1",
                "decoder": "0x004901D0",
                "session_constructor": "0x0048ECB0",
                "battle_zone": (
                    "server/session-supplied battle-entry word is consumed by the session "
                    "constructor and formats sz-%04d.mmf"
                ),
                "optional_geometry": (
                    "battle-entry extended geometry is consumed client-side; native scaling "
                    "uses 32 pixels on one isometric axis and 16 on the other"
                ),
                "constructor_direct_callers": [
                    "0x0048d5e6",
                    "0x0048d655",
                    "0x0048d6e7",
                    "0x0048d746",
                ],
            },
            "authority_boundary": {
                "evidence": "VERIFIED",
                "client_side": [
                    "select an entity/object and enforce local proximity/state gates",
                    "emit an interaction/action uplink",
                    "consume battle-entry state and load the supplied battle zone",
                ],
                "server_session_side": (
                    "The checked client path contains no proved universal fieldMapId -> "
                    "battleZoneId decision between the action uplink and 0x98 battle entry."
                ),
            },
        },
        "unverified": [
            "49/21 being specifically an encounter-start opcode",
            "49/04 being specifically an encounter-start opcode",
            "runtime scene-object +0x80 being identical to a static SMF object id",
            "a universal retail fieldMapId -> battleZoneId table or formula",
            "retired-server conditions deciding whether an interaction starts battle",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path, help="statically decompressed NeoDark.exe image")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()

    payload = build_report(args.image.read_bytes(), require_hash=True)
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
