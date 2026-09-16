#!/usr/bin/env python3
"""Verify retail battle-instance -> AI-program binding and autonomy boundaries.

Static byte inspection only. The original game executable is never executed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
from dataclasses import dataclass
from pathlib import Path

EXPECTED_SHA256 = "432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7"
DEFAULT_PROGRAM = "ODNORMAL REST(20),ATTACK(80)"
LOCAL_AI_CATEGORIES = (7, 8)


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


def read_u8(data: bytes, sections: list[Section], va: int) -> int:
    return data[va_offset(va, sections)]


def read_u32(data: bytes, sections: list[Section], va: int) -> int:
    return struct.unpack_from("<I", data, va_offset(va, sections))[0]


def verify(data: bytes, sections: list[Section], name: str, va: int, hex_bytes: str) -> dict:
    want = bytes.fromhex(hex_bytes)
    offset = va_offset(va, sections)
    got = data[offset : offset + len(want)]
    if got != want:
        raise ValueError(f"{name}: {got.hex()} != {want.hex()}")
    return {
        "name": name,
        "status": "VERIFIED",
        "va": f"0x{va:08x}",
        "hex": want.hex(),
        "verified": True,
    }


def resolve_program_source(category: int, has_network_program: bool, roster_behavior: str) -> str:
    """Model the verified source-precedence branch at 0x00402D90."""
    if has_network_program:
        return "NETWORK_PROGRAM"
    if category in LOCAL_AI_CATEGORIES:
        return "ROSTER_PROGRAM" if roster_behavior else "ROSTER_DEFAULT"
    return "ALTERNATE_HANDLER"


def verify_ai_packet_dispatch(data: bytes, sections: list[Section]) -> dict:
    """Decode the two jump tables that route inbound 6A/69 to the AI table parser."""
    first_selector = read_u8(data, sections, 0x00494DA0)
    first_target = read_u32(data, sections, 0x00494D88 + first_selector * 4)

    second_index = 0x69 - 1
    second_selector = read_u8(data, sections, 0x00494E5C + second_index)
    second_target = read_u32(data, sections, 0x00494DD0 + second_selector * 4)

    if first_target != 0x00494B06 or second_target != 0x00494B35:
        raise ValueError(
            "AI packet dispatch mismatch: "
            f"6A -> 0x{first_target:08x}, 69 -> 0x{second_target:08x}"
        )
    return {
        "name": "inbound_6a69_ai_program_dispatch",
        "status": "VERIFIED",
        "packet_header_hex": "6a69",
        "first_target_va": f"0x{first_target:08x}",
        "second_target_va": f"0x{second_target:08x}",
        "verified": True,
    }


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
            "battle_roster_record_array_stride_c8",
            0x004AFC64,
            "8b451033ff85c07e7b8d752856b9f892a300e8c53e000083f8ff7e168b4e4c8b5648518b0e525150b9f892a300e8ca4900008b45104781c6c80000003bf87ccc5f5e5d",
        ),
        (
            "roster_category_copied_to_unit_2c8",
            0x004B3D70,
            "0fbf8db8000000898ec80200008b0da43aa700",
        ),
        (
            "roster_unit_key_copied_to_live_unit_24",
            0x004B3E5B,
            "8b4d088b550051528bcee856ccffff8b450083cfff8946248b86c802",
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
            "network_program_table_reset_100_slots_stride_110",
            0x004011C0,
            "8d810cc40900b964000000c700e703000005100100004975f2c3",
        ),
        (
            "network_program_lookup_by_unit_id",
            0x00401D40,
            "8b5424045683ceff33c081c10cc409003911740e4081c11001000083f8647cf08bc65ec20400",
        ),
        (
            "network_program_then_category_7_8_local_fallback",
            0x00402DB9,
            "8b462485ff7d0233ff508bcbe876efffff85c07c288b8e00010000f6c1107415f6c10175105750568bcbe8480000005f5e5bc208008bc75f5e5bc208008b86c802000083f807741483f808740f57568bcbe8710400005f5e5bc20800576aff568bcbe8100000005f5e5bc2",
        ),
        (
            "executor_local_minus_one_else_network_slot",
            0x00402E63,
            "8b44245c83f8ff89542428750c8bbd44030000897c2420eb0e508bcee8eceeffff894424208bf88b4f04",
        ),
        (
            "target_selection_rand_mod_candidate_count",
            0x00402BDC,
            "85f6750f5f5e5d33c05b81c438020000c21000e825d90b0099f7fe8bb424540200008b9c24500200008d4424288d4c242450518bcf8b54943852538916e892200000",
        ),
        (
            "outbound_ai_selected_action_packet_6a89",
            0x004AA100,
            "80fa01c644240c6ac644240d89884c241b8854241cb81100000075208bd181e2ff0000007e458b4e10668b3983c10266897c040c83c0024a75efeb2f80fa02752a8bd181e2ff0000007e208b4e14668b3983c10866897c040c668b79fc83c00266897c040c83c0024a75e38d54240c8bcb5250e858ceffff",
        ),
    ]
    signatures = [verify(data, sections, *spec) for spec in specs]
    signatures.append(verify_ai_packet_dispatch(data, sections))

    payload = {
        "schema": 2,
        "evidence": "VERIFIED_STATIC_ORIGINAL_FIXED_HASH",
        "input_sha256": digest,
        "signatures": signatures,
        "facts": {
            "battle_roster_record": {
                "status": "VERIFIED",
                "stride_bytes": 200,
                "unit_key_offset": 0,
                "category_word_offset": 184,
                "behavior_string_offset": 196,
                "live_unit_id_offset": 36,
                "live_category_offset": 712,
                "live_local_program_pointer_offset": 836,
                "raw_wire_behavior_offset": {
                    "status": "UNVERIFIED",
                    "reason": "0xC4 is the deserialized in-memory record offset, not a proven fixed raw-wire byte displacement.",
                },
            },
            "program_binding_precedence": [
                {
                    "priority": 1,
                    "status": "VERIFIED",
                    "source": "NETWORK_PROGRAM",
                    "inbound_packet": "6A 69",
                    "match": "program.id == live_unit.id",
                    "program_slots": 100,
                    "program_stride_bytes": 272,
                },
                {
                    "priority": 2,
                    "status": "VERIFIED",
                    "source": "ROSTER_PROGRAM",
                    "categories": [7, 8],
                    "record_behavior_offset": 196,
                    "empty_behavior_fallback": DEFAULT_PROGRAM,
                },
                {
                    "priority": 3,
                    "status": "VERIFIED",
                    "source": "ALTERNATE_HANDLER",
                    "condition": "no network match and category is not 7 or 8",
                    "handler_va": "0x00403280",
                },
            ],
            "target_selection": {
                "status": "VERIFIED",
                "function_va": "0x00402a10",
                "footprint_builder_va": "0x00403790",
                "selection": "rand() % candidate_count over all eligible candidates appended from the generated footprint",
                "distance_priority_inside_eligible_pool": False,
                "equal_distance_tie_break": "none; eligible targets share the same random candidate pool",
            },
            "target_descriptors": {
                "status": "VERIFIED",
                "full_network_program_parser_only": True,
                "AREA": {"kind": 0, "value_offsets": [12, 16, 20]},
                "SOILDER": {"kind": 1, "value_offset": 24, "literal_spelling": "SOILDER"},
                "runtime_semantics": {
                    "status": "UNVERIFIED",
                    "reason": "Exact AREA/SOILDER meaning is not established by this executor path.",
                },
            },
            "positioning": {
                "status": "INFERRED",
                "verified_client_helpers": [
                    "0x00404580",
                    "0x00404940",
                    "0x00406b60",
                    "0x00406e20",
                ],
                "verified_boundary": "The client computes target-mode-specific feasible coordinate/action data before submitting the chosen action.",
                "exact_cell_priority_or_tie_break": "UNVERIFIED",
            },
            "autonomy_boundary": {
                "program_provision": {
                    "status": "VERIFIED",
                    "direction": "server/session -> client",
                    "packet": "6A 69",
                },
                "action_target_position_choice": {
                    "status": "VERIFIED",
                    "direction": "client-local",
                    "executor_va": "0x00402e30",
                    "target_picker_va": "0x00402a10",
                },
                "selected_action_submit": {
                    "status": "VERIFIED",
                    "direction": "client -> server",
                    "packet": "6A 89",
                    "builder_va": "0x004aa050",
                },
                "server_validation_and_authoritative_resolution": "UNVERIFIED",
            },
            "concrete_historical_bindings": {
                "status": "UNVERIFIED",
                "entries": [],
                "reason": "No retained live roster/network payload was found; no historic non-default per-enemy program table can be enumerated from the executable alone.",
            },
        },
        "boundary": (
            "This verifies how a battle-instance/unit id binds to network/local AI programs and how the client chooses/submits an action. "
            "It does not invent retired-server encounter payloads or historical per-enemy AI strings absent from retained evidence."
        ),
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"signatures": len(signatures), "output": str(args.out)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
