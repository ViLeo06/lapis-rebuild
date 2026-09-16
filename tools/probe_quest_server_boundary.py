#!/usr/bin/env python3
"""Verify the fixed 2.2 client's Quest/NPC server-boundary evidence.

Static only: never executes NeoDark.exe and never reads/exports dialogue text.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path

EXPECTED_SHA256 = "432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7"

# Exact code signatures used to prevent address drift or accidental cross-version claims.
SIG = {
    0x456BA9: "c706943f4e00",  # MessageBox vtable
    0x48D778: "8b43048b88e000000083f902",  # opcode 0x92 target; mode gate == 2
    0x48D883: "8b403c45558bc88b10ff5238",  # strip opcode, virtual slot +0x38
    0x457DE0: "8b44240433d28a108991040100000fbf5001",  # block/value payload decoder
    0x46B6D4: "c70630454e00",  # Warp vtable
    0x46BB7F: "89887c11000089b080110000",  # stage warp type/value
    0x46BB9F: "8d4c2408c6442408a4516a02",  # Warp immediate request A4 02
    0x470F87: "83b87c11000001750c",  # staged type 1 reaches final sender
    0x4A9D9F: "8b868011000083c9ff85c0898e7c110000",  # consume staged destination
    0x4A9DD0: "c6442410a4c644241101",  # final Warp request A4 01 + WORD
    0x42EDBF: "c74500e0354e00",  # Employ vtable
    0x430300: "8b44240483f804774cff248558034300",  # Employ action dispatcher
    0x4303C3: "c64424084e6689542409",  # Employ request 4E, length 5
    0x430492: "c644240c4d668954240d",  # Employ request 4D, length 7 path
    0x48FDFA: "6a0d6a008bc8e89bdefbff",  # narrow local Quest0/STEP13 exception
    0x494AE0: "8b442404568bf133c98a0883c19683f92f",  # alternate grouped receive dispatcher
    0x494D08: "83c002b9a899a30050e88abaffff",  # 6A/55 -> Quest loader
    0x498510: "83f8650f8cda00000083f8670f8fd1000000",  # field object type 101..103 gate
    0x4985BA: "83ff045f7d4e668b461c",  # Manhattan distance < 4; load object word
    0x4985D0: "c644241849c644241921c644241a01",  # 49/21/01 request header
    0x498604: "c644240c08",  # fallback 08 request header
}

STRINGS = {
    0x4F4C74: r"dlg\MessageBox.Tdg",
    0x4F4BD4: r"dlg\Warp.Tdg",
    0x4F4D40: r"dlg\Employ.Tdg",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse_pe(data: bytes):
    if data[:2] != b"MZ":
        raise ValueError("not MZ")
    pe_off = struct.unpack_from("<I", data, 0x3C)[0]
    if data[pe_off:pe_off + 4] != b"PE\0\0":
        raise ValueError("not PE")
    coff = pe_off + 4
    section_count = struct.unpack_from("<H", data, coff + 2)[0]
    opt_size = struct.unpack_from("<H", data, coff + 16)[0]
    opt = coff + 20
    if struct.unpack_from("<H", data, opt)[0] != 0x10B:
        raise ValueError("not PE32")
    image_base = struct.unpack_from("<I", data, opt + 28)[0]
    sec_off = opt + opt_size
    sections = []
    for i in range(section_count):
        off = sec_off + i * 40
        name = data[off:off + 8].split(b"\0", 1)[0].decode("ascii", "replace")
        virtual_size, rva, raw_size, raw_off = struct.unpack_from("<IIII", data, off + 8)
        sections.append((name, virtual_size, rva, raw_size, raw_off))
    return image_base, sections


def va_to_offset(va: int, image_base: int, sections) -> int:
    rva = va - image_base
    for _, virtual_size, section_rva, raw_size, raw_off in sections:
        if section_rva <= rva < section_rva + max(virtual_size, raw_size):
            delta = rva - section_rva
            if delta >= raw_size:
                raise ValueError(f"VA 0x{va:08x} has no file backing")
            return raw_off + delta
    raise ValueError(f"VA 0x{va:08x} outside sections")


def read_cstr(data: bytes, off: int) -> str:
    end = data.find(b"\0", off)
    if end < 0:
        raise ValueError("unterminated string")
    return data[off:end].decode("ascii")


def assert_sig(data: bytes, image_base: int, sections, va: int, hex_bytes: str) -> None:
    expected = bytes.fromhex(hex_bytes)
    off = va_to_offset(va, image_base, sections)
    actual = data[off:off + len(expected)]
    if actual != expected:
        raise ValueError(f"signature mismatch at 0x{va:08x}: {actual.hex()} != {expected.hex()}")


def read_u32(data: bytes, image_base: int, sections, va: int) -> int:
    return struct.unpack_from("<I", data, va_to_offset(va, image_base, sections))[0]


def normal_receive_target(data: bytes, image_base: int, sections, opcode: int) -> int:
    if not 1 <= opcode <= 0xAB:
        raise ValueError("opcode out of normal receive table range")
    trans = va_to_offset(0x48E90C, image_base, sections)
    jumps = va_to_offset(0x48E808, image_base, sections)
    selector = data[trans + opcode - 1]
    return struct.unpack_from("<I", data, jumps + 4 * selector)[0]


def opcodes_for_target(data: bytes, image_base: int, sections, target: int):
    return [
        opcode
        for opcode in range(1, 0xAC)
        if normal_receive_target(data, image_base, sections, opcode) == target
    ]


def grouped_6a_target(data: bytes, image_base: int, sections, subopcode: int) -> int:
    """Resolve the fixed client's grouped 0x6A/<subopcode> dispatcher target."""
    if not 1 <= subopcode <= 0xB2:
        raise ValueError("0x6A subopcode out of range")
    first_trans = va_to_offset(0x494DA0, image_base, sections)
    first_jumps = va_to_offset(0x494D88, image_base, sections)
    first_selector = data[first_trans + (0x6A - 0x6A)]
    first_target = struct.unpack_from("<I", data, first_jumps + 4 * first_selector)[0]
    if first_target != 0x494B06:
        raise ValueError(f"0x6A grouped dispatcher drift: 0x{first_target:08x}")
    sub_trans = va_to_offset(0x494E5C, image_base, sections)
    sub_jumps = va_to_offset(0x494DD0, image_base, sections)
    selector = data[sub_trans + subopcode - 1]
    return struct.unpack_from("<I", data, sub_jumps + 4 * selector)[0]


def direct_rel32_call_sites(data: bytes, image_base: int, sections, target_va: int):
    sites = []
    for _name, virtual_size, section_rva, raw_size, raw_off in sections:
        # The fixed binary keeps executable code in .text; scanning all backed bytes
        # is safe here because the expected site set is signature-pinned below.
        if not raw_size:
            continue
        body = data[raw_off:raw_off + raw_size]
        for i in range(0, max(0, len(body) - 4)):
            if body[i] != 0xE8:
                continue
            rel = struct.unpack_from("<i", body, i + 1)[0]
            site_va = image_base + section_rva + i
            if site_va + 5 + rel == target_va:
                sites.append(site_va)
    return sorted(sites)


def verify(path: Path) -> dict:
    data = path.read_bytes()
    digest = sha256(data)
    if digest != EXPECTED_SHA256:
        raise ValueError(f"hash mismatch: {digest}")
    image_base, sections = parse_pe(data)

    for va, hex_bytes in SIG.items():
        assert_sig(data, image_base, sections, va, hex_bytes)
    for va, expected in STRINGS.items():
        actual = read_cstr(data, va_to_offset(va, image_base, sections))
        if actual != expected:
            raise ValueError(f"string mismatch at 0x{va:08x}: {actual!r}")

    messagebox_vtable = 0x4E3F94
    slot14 = read_u32(data, image_base, sections, messagebox_vtable + 14 * 4)
    if slot14 != 0x457DE0:
        raise ValueError(f"MessageBox slot14 drift: 0x{slot14:08x}")
    npc_ops = opcodes_for_target(data, image_base, sections, 0x48D778)
    if npc_ops != [0x92]:
        raise ValueError(f"NPC MessageBox opcode drift: {npc_ops}")

    grouped_quest_target = grouped_6a_target(data, image_base, sections, 0x55)
    if grouped_quest_target != 0x494D08:
        raise ValueError(f"6A/55 Quest dispatcher drift: 0x{grouped_quest_target:08x}")
    quest_state_calls = direct_rel32_call_sites(data, image_base, sections, 0x44DCA0)
    if quest_state_calls != [0x48FE00, 0x4907DC, 0x4907F0]:
        raise ValueError(f"Quest state-init caller drift: {[hex(x) for x in quest_state_calls]}")
    quest_loader_calls = direct_rel32_call_sites(data, image_base, sections, 0x4907A0)
    if quest_loader_calls != [0x48CC8B, 0x494D11]:
        raise ValueError(f"Quest loader caller drift: {[hex(x) for x in quest_loader_calls]}")

    default_receive = 0x48E753
    request_only_in_normal_dispatch = {
        f"0x{opcode:02x}": normal_receive_target(data, image_base, sections, opcode) == default_receive
        for opcode in (0x4D, 0x4E, 0xA4)
    }
    if not all(request_only_in_normal_dispatch.values()):
        raise ValueError(f"direction-boundary drift: {request_only_in_normal_dispatch}")

    return {
        "input": {"name": path.name, "size": len(data), "sha256": digest},
        "npc_messagebox_binding": {
            "resource": r"dlg\MessageBox.Tdg",
            "constructor_va": "0x00456b40",
            "vtable_va": "0x004e3f94",
            "network_virtual_slot": 14,
            "network_virtual_offset": "+0x38",
            "slot_target_va": "0x00457de0",
            "downlink_opcode": "0x92",
            "receive_case_va": "0x0048d778",
            "mode_gate": "active runtime +0xe0 == 2",
            "opcode_strip_va": "0x0048d886",
            "payload": [
                "uint8 block_id -> MessageBox +0x104",
                "int16 value_a -> MessageBox +0x108",
                "int16 value_b -> MessageBox +0x124",
            ],
            "boundary": "The NPCScript block selector is supplied by a network downlink. Direct equality between NPCScript block IDs and SMF object_id/kind is not the runtime binding mechanism proven here.",
        },
        "field_interaction_trigger": {
            "function_va": "0x004984d0",
            "object_type_field": "+0xf8",
            "special_types": [101, 102, 103],
            "distance": "abs(delta_x) + abs(delta_y) < 4 using coordinate-like +0xd4/+0xd8 fields",
            "special_request": {"bytes": ["0x49", "0x21", "0x01", "uint16 object +0x1c"], "size": 5},
            "fallback_request": {"bytes": ["0x08", "uint16 object +0xb4"], "size": 3},
            "boundary": "The client sends a concrete field-object interaction request, but the rule that turns that object identity into NPC dialogue, battle, warp, or another outcome is not present in this handler.",
        },
        "quest_authority_boundary": {
            "general_paths": [
                "normal receive opcode 0x2b -> 0x0048cc87 -> 0x004907a0 supplies quest_index + step_index",
                "grouped receive 0x6a/0x55 -> 0x00494d08 -> 0x004907a0 supplies the same quest_index + step_index payload",
            ],
            "quest_loader_direct_call_sites": [f"0x{x:08x}" for x in quest_loader_calls],
            "quest_state_init_direct_call_sites": [f"0x{x:08x}" for x in quest_state_calls],
            "local_exception": {
                "call_va": "0x0048fe00",
                "quest_index": 0,
                "step_index": 13,
                "guarded_by_runtime_value": "0x0a28",
                "interpretation": "narrow hard-coded client exception; not evidence for a general client-side quest-condition engine",
            },
            "reward_evidence": "No reward mutation is performed by the recovered SCRIPT/SELECT/NAME/INVENTORY/CANCEL/REPAIR dispatcher branches. Reward semantics remain outside the recovered Quest text command language.",
        },
        "warp_boundary": {
            "resource": r"dlg\Warp.Tdg",
            "constructor_va": "0x0046b680",
            "selection_handler_va": "0x0046bb60",
            "selection_stage": {"type_field": "+0x117c = 1", "value_field": "+0x1180 = selected value", "pending_field": "+0x1178"},
            "first_request": {"bytes": ["0xa4", "0x02"], "size": 2},
            "deferred_request": {"sender_va": "0x004a9d80", "bytes": ["0xa4", "0x01", "uint16 staged value"], "size": 4},
            "normal_receive_table_a4": "default/unhandled",
            "boundary": "Warp UI stages a destination and sends requests; it does not directly perform the map transition in the recovered handler chain. Final transition authority/response is outside this UI path.",
        },
        "employ_boundary": {
            "resource": r"dlg\Employ.Tdg",
            "constructor_va": "0x0042ed50",
            "action_dispatch_va": "0x00430300",
            "network_requests": [
                {"helper_va": "0x00430370", "opcode": "0x4e", "size": 5, "payload": "two WORD values from selected candidate/record"},
                {"helper_va": "0x00430420", "opcode": "0x4d", "size": 7, "payload": "three WORD values derived from selected candidate/record/UI state"},
            ],
            "normal_receive_table_4d_4e": "default/unhandled",
            "boundary": "Employ confirmation paths issue network requests; no direct party/roster mutation is present in these handlers. Which request is hire/remove is intentionally not named without TDG/control-label proof.",
        },
        "normal_receive_direction_check": {
            "default_case_va": "0x0048e753",
            "request_opcodes_mapping_to_default": request_only_in_normal_dispatch,
            "warning": "Direction check applies to this normal receive switch only; server responses may use other opcodes or dispatchers.",
        },
        "closure": {
            "client_side_recovered": [
                "field object interaction request for types 101..103 sends object identity to the server",
                "server-selected NPCScript block reaches MessageBox/NPCScript via opcode 0x92",
                "Quest step presentation has two recovered inbound dispatcher paths and is generally server-selected",
                "Warp and Employ UI actions are request producers rather than final gameplay-state mutators",
            ],
            "not_recoverable_from_proven_client_chain": [
                "server rule mapping a concrete world interaction to NPCScript block_id",
                "general Quest condition/flag evaluation and reward award rules",
                "authoritative recruitment acceptance and final roster mutation",
                "authoritative warp destination acceptance and resulting map-transition response",
                "Quest/NPC-triggered battle decision when that decision occurs server-side",
            ],
            "status": "CLIENT_EVIDENCE_BOUNDARY_REACHED",
        },
        "verification": {"fixed_hash": True, "signatures_checked": len(SIG), "original_program_executed": False},
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("binary", type=Path)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()
    report = verify(args.binary)
    text = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
