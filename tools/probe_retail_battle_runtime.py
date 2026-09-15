#!/usr/bin/env python3
"""Verify recovered retail battle-runtime facts in statically decompressed NeoDark.exe.

This is a byte-level evidence probe only. It never executes, imports, injects
into, or loads the game as code. It expects the deterministic UPX-decompressed
image produced from the hash-pinned 2.2 client, checks exact strings and small
instruction signatures, then emits bounded reconstruction facts.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
from dataclasses import dataclass
from pathlib import Path

EXPECTED_SHA256 = "432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7"
ORIGINAL_PACKED_SHA256 = "c1be05eb2977a8aae8cbe8b716bc1e3957263edde8187d5269d554b327f13cbd"


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
    out: list[Section] = []
    for index in range(count):
        off = table + index * 40
        if off + 40 > len(data):
            raise ValueError("truncated section table")
        name = data[off : off + 8].split(b"\0", 1)[0].decode("ascii", "replace")
        vsize, rva, rsize, raw = struct.unpack_from("<IIII", data, off + 8)
        if raw + rsize > len(data):
            raise ValueError(f"section {name} exceeds file")
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
    if end < 0:
        raise ValueError(f"unterminated string at file offset 0x{offset:x}")
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
            f"{name} signature mismatch at 0x{va:08x}: {got.hex()} != {want.hex()}"
        )
    return {
        "name": name,
        "va": f"0x{va:08x}",
        "file_offset": offset,
        "hex": want.hex(),
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
    image_base, sections = parse_sections(data)

    strings = {
        "ODDEFENCE": (0x004F447C, b"ODDEFENCE"),
        "ODATTACK": (0x004F4488, b"ODATTACK"),
        "ODNORMAL": (0x004F4494, b"ODNORMAL"),
        "SOILDER": (0x004F44BC, b"SOILDER"),
        "AREA": (0x004F44C4, b"AREA"),
        "MAGIC": (0x004F44CC, b"MAGIC"),
        "ATTACK": (0x004F44D4, b"ATTACK"),
        "REST": (0x004F44DC, b"REST"),
        "stamina_prefix": (0x004F87A4, b"[STAMINA] "),
        "battle_map_format": (0x004F8D84, b"sz-%04d.mmf"),
        "default_ai": (0x004FA104, b"ODNORMAL REST(20),ATTACK(80)"),
    }
    string_rows = []
    for name, (va, want) in strings.items():
        offset = va_offset(va, sections)
        raw = cstr(data, offset)
        exact = name not in {"stamina_prefix"}
        if (exact and raw != want) or (not exact and not raw.startswith(want)):
            raise ValueError(f"{name} mismatch at 0x{va:08x}: {raw[:64]!r}")
        string_rows.append(
            {
                "name": name,
                "va": f"0x{va:08x}",
                "file_offset": offset,
                "text": want.decode("ascii"),
                "verified": True,
            }
        )

    signature_specs = [
        # AI grammar/parser.
        ("ai_order_normal_literal_ref", 0x004012B4, "6894444f0052"),
        ("ai_order_normal_mode_2", 0x004012D8, "c7043102000000"),
        ("ai_order_attack_literal_ref", 0x004012E5, "6888444f0052"),
        ("ai_order_attack_mode_4", 0x00401307, "c7043104000000"),
        ("ai_order_defence_literal_ref", 0x00401314, "687c444f0052"),
        ("ai_order_defence_mode_8", 0x00401336, "c7043108000000"),
        ("ai_target_area_literal_ref", 0x00401434, "68c4444f00"),
        ("ai_target_soilder_literal_ref", 0x00401494, "68bc444f00"),
        ("ai_action_rest_literal_ref", 0x0040169A, "8b0668dc444f00"),
        ("ai_action_attack_literal_ref", 0x004016B6, "8b0668d4444f00"),
        ("ai_action_magic_literal_ref", 0x00401765, "8b0668cc444f00"),
        ("ai_action_row_limit_20", 0x0040179D, "83f814"),
        # AI chooser/executor.
        ("ai_random_mod_100", 0x00402E56, "e8bed60b0099b964000000f7f9"),
        (
            "ai_order_attack_thresholds_hp20_mp40",
            0x00402E8A,
            "8b4f0483f904750cb814000000be28000000eb20",
        ),
        (
            "ai_order_defence_branch_hp45_mp60",
            0x00402E9E,
            "83f902741183f908750cb82d000000be3c000000eb0a",
        ),
        ("ai_order_normal_thresholds_hp30_mp50", 0x00402EB4, "b81e000000be32000000"),
        (
            "ai_weight_inclusive_compare",
            0x00402F32,
            "8b4ffc8b44242803d93bc30f8fa5000000",
        ),
        (
            "ai_action_kind_dispatch_0_1_2",
            0x00402F43,
            "8b0785c00f84bb00000083f8010f84df00000083f802",
        ),
        ("ai_magic_negative_id_can_continue", 0x00402F5F, "8b570485d28954245c7c7e"),
        ("ai_magic_mp_requirement_gate", 0x00402FAE, "3bd07c36"),
        # Damage/server-authority boundary.
        (
            "basic_attack_battle_mode_gate",
            0x004A9F70,
            "a1a43aa70083ec343d00040000753d",
        ),
        ("basic_attack_opcode_6a_82", 0x004A9F83, "c64424006ac644240182"),
        (
            "basic_attack_four_words",
            0x004A9F8D,
            "668b106689542402668b50026689542404668b5004668b40066689542406",
        ),
        ("basic_attack_packet_length_10", 0x004A9FB4, "526a0ae814d0ffff"),
        (
            "hp_absolute_overwrite",
            0x00405C1A,
            "0fbf4424308b56348bc82bca894634898e48010000",
        ),
        # Field action / battle-entry boundary.
        (
            "field_target_type_gate_101_103",
            0x0049850A,
            "8b86f800000083f8650f8cda00000083f8670f8fd1000000",
        ),
        ("field_target_manhattan_lt_4", 0x004985B8, "03f883ff045f7d4e"),
        ("field_near_request_object_word", 0x004985C0, "668b461c"),
        ("field_near_request_length_5", 0x004985C8, "516a05b91897a400"),
        (
            "field_near_request_49_21_01",
            0x004985D0,
            "c644241849c644241921c644241a01668944241b",
        ),
        ("field_fallback_08_path", 0x00498604, "c644240c08e8c2e90000"),
        (
            "battle_entry_inbound_record_parse",
            0x0048D699,
            "458d8c249800000055518bcbe8262b0000",
        ),
        (
            "battle_entry_server_words_compact",
            0x0048D6CF,
            "0fbf9424b40000000fbf84249c000000526a0a6a0a50",
        ),
        (
            "battle_entry_session_install",
            0x0048D6F4,
            "5651b96017a400e8609c0000",
        ),
        (
            "battle_entry_server_grid_words",
            0x0048D702,
            "0fbf8424ae0000000fbf8c24b00000000fbf9424ac000000",
        ),
        # Existing map/geometry checks.
        ("battle_entry_mode1_decoder", 0x004901D0, "83ec208b44242856578a0880f901"),
        ("battle_zone_format_call", 0x0048ED75, "578d54243468848d4f0052"),
        ("battle_zone_store", 0x0048ED91, "893db4484f00"),
        (
            "battle_geometry_scale_axes",
            0x0049C817,
            "c1e704c1e204c1e605c1e005",
        ),
    ]
    signature_rows = [
        verify_signature(data, sections, *spec) for spec in signature_specs
    ]

    payload = {
        "schema": 2,
        "evidence": "VERIFIED_STATIC_ORIGINAL_FIXED_HASH",
        "scope": (
            "Hash-pinned UPX-decompressed NeoDark 2.2 image; byte inspection only; "
            "original game program was not executed. Signatures prove listed client "
            "code/data facts, not retired-server formulas or live server decisions."
        ),
        "input": {
            "file": args.image.name,
            "size": len(data),
            "sha256": digest,
            "original_packed_sha256": ORIGINAL_PACKED_SHA256,
            "image_base": f"0x{image_base:08x}",
        },
        "strings": string_rows,
        "signatures": signature_rows,
        "facts": {
            "ai_program": {
                "orders": {"ODNORMAL": 2, "ODATTACK": 4, "ODDEFENCE": 8},
                "target_tokens": ["AREA", "SOILDER"],
                "action_tokens": ["REST", "ATTACK", "MAGIC"],
                "maximum_action_rows": 20,
                "default_program": "ODNORMAL REST(20),ATTACK(80)",
                "roll": "rand() % 100",
                "thresholds_percent": {
                    "ODATTACK": {"hp": 20, "mp": 40},
                    "ODDEFENCE": {"hp": 45, "mp": 60},
                    "ODNORMAL": {"hp": 30, "mp": 50},
                },
                "weighted_selection": (
                    "row is selected when roll <= cumulative_weight (inclusive compare)"
                ),
                "magic_preconditions": (
                    "negative magic id and insufficient-MP paths are rejected before "
                    "action commit; checked control flow can continue the row scan"
                ),
            },
            "damage_boundary": {
                "basic_attack_request": (
                    "opcode 6A/82; exactly 10 bytes; four 16-bit caller-supplied "
                    "words; no serialized damage value"
                ),
                "hp_update": (
                    "client receives a signed 16-bit absolute HP and overwrites current "
                    "unit HP; local code derives the delta for presentation"
                ),
                "status": (
                    "SERVER_BOUNDARY: exact retail hit/damage/critical arithmetic is "
                    "not established by this client-only request/response path"
                ),
            },
            "encounter_boundary": {
                "field_action": (
                    "selected object types 101..103 within Manhattan distance <4 use "
                    "a 49/21/01 + object-word request; the fallback path emits 08 + word"
                ),
                "battle_entry": (
                    "an inbound battle record supplies values consumed by the client "
                    "to load/install the battle zone/session; the extended variant also "
                    "supplies battle-grid geometry"
                ),
                "status": (
                    "client evidence separates field interaction from battle-session "
                    "installation; no universal local field-map -> battle-zone table is proven"
                ),
            },
        },
        "interpretation_boundaries": [
            (
                "AI parser/executor is present client-side, but the exact behavior "
                "program attached to a retail enemy can be supplied by roster/network "
                "state and still needs binding evidence."
            ),
            (
                "SOILDER is the literal spelling in the retail binary; target-selection "
                "semantics beyond the token parser are not generalized here."
            ),
            (
                "The inclusive weighted compare is a byte-level fact; probability "
                "consequences depend on authored cumulative weights and row ordering."
            ),
            (
                "The basic-attack uplink contains no damage field and the HP consumer "
                "accepts absolute HP; this identifies a server-authority boundary, not "
                "the missing server formula."
            ),
            (
                "Battle entry loads sz-%04d.mmf from a supplied zone value; the retail "
                "server predicate that maps a field interaction to that zone is not "
                "inferred here."
            ),
            (
                "500ms readiness cadence remains secondary recovered evidence until "
                "isolated native-client timing capture."
            ),
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
