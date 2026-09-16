#!/usr/bin/env python3
"""Verify fixed-hash NeoDark visual/audio runtime semantics without executing it."""
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
    rva: int
    vsize: int
    raw: int
    rsize: int


@dataclass(frozen=True)
class PE:
    image_base: int
    sections: tuple[Section, ...]


def parse_pe(data: bytes) -> PE:
    pe = struct.unpack_from("<I", data, 0x3C)[0]
    if data[pe : pe + 4] != b"PE\0\0":
        raise ValueError("not PE")
    count = struct.unpack_from("<H", data, pe + 6)[0]
    opt_size = struct.unpack_from("<H", data, pe + 20)[0]
    opt = pe + 24
    if struct.unpack_from("<H", data, opt)[0] != 0x10B:
        raise ValueError("not PE32")
    base = struct.unpack_from("<I", data, opt + 28)[0]
    table = opt + opt_size
    sections = []
    for index in range(count):
        off = table + index * 40
        vsize, rva, rsize, raw = struct.unpack_from("<IIII", data, off + 8)
        sections.append(Section(rva, vsize, raw, rsize))
    return PE(base, tuple(sections))


def va_to_offset(pe: PE, va: int) -> int:
    rva = va - pe.image_base
    for section in pe.sections:
        if section.rva <= rva < section.rva + max(section.vsize, section.rsize):
            delta = rva - section.rva
            if delta >= section.rsize:
                raise ValueError(f"VA 0x{va:x} not file-backed")
            return section.raw + delta
    raise ValueError(f"VA 0x{va:x} unmapped")


def read_at(data: bytes, pe: PE, va: int, size: int) -> bytes:
    off = va_to_offset(pe, va)
    return data[off : off + size]


def expect_hex(data: bytes, pe: PE, va: int, hex_bytes: str, label: str) -> dict[str, str]:
    expected = bytes.fromhex(hex_bytes)
    actual = read_at(data, pe, va, len(expected))
    if actual != expected:
        raise ValueError(f"{label} mismatch at 0x{va:x}: {actual.hex()} != {expected.hex()}")
    return {"label": label, "va": f"0x{va:08x}", "bytes": expected.hex()}


def cstr(data: bytes, pe: PE, va: int) -> str:
    off = va_to_offset(pe, va)
    end = data.find(b"\0", off, off + 512)
    if end < 0:
        raise ValueError(f"unterminated string at 0x{va:x}")
    return data[off:end].decode("ascii", "strict")


def expect_string(data: bytes, pe: PE, va: int, text: str) -> dict[str, str]:
    actual = cstr(data, pe, va)
    if actual != text:
        raise ValueError(f"string mismatch at 0x{va:x}: {actual!r}")
    return {"va": f"0x{va:08x}", "text": text}


def dword_table(data: bytes, pe: PE, va: int, count: int) -> list[str]:
    off = va_to_offset(pe, va)
    values = struct.unpack_from("<" + "I" * count, data, off)
    return [f"0x{value:08x}" for value in values]


def scan_normal_cadence(data: bytes, pe: PE) -> list[str]:
    prefix = bytes.fromhex("d905d8414e00")  # fld [0x4e41d8] == 1000.0f
    sites = []
    for section in pe.sections:
        blob = data[section.raw : section.raw + section.rsize]
        pos = 0
        while True:
            index = blob.find(prefix, pos)
            if index < 0:
                break
            tail = blob[index + 6 : index + 24]
            matched = False
            for j in range(max(0, len(tail) - 5)):
                if tail[j] == 0xD8 and tail[j + 2 : j + 6] == bytes.fromhex("44040000"):
                    matched = True
                    break
            if matched:
                sites.append(f"0x{pe.image_base + section.rva + index:08x}")
            pos = index + 1
    return sites


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    data = args.image.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED_SHA256:
        raise SystemExit(f"SHA-256 mismatch: {digest}")
    pe = parse_pe(data)
    signatures = []

    # QueryPerformanceFrequency/Counter normalized to integer milliseconds.
    signatures.append(expect_hex(data, pe, 0x4BEDD1, "ff15ec224e00", "QueryPerformanceFrequency call"))
    signatures.append(expect_hex(data, pe, 0x4BEDEC, "68e8030000", "divide frequency by 1000"))
    signatures.append(expect_hex(data, pe, 0x4BEE21, "ff15c4224e00", "QueryPerformanceCounter call"))

    # ANI loader: 0x44-byte file header, then layer_count records of 0x490 bytes.
    signatures.append(expect_hex(data, pe, 0x478867, "6a4451", "ANI 0x44-byte header read"))
    signatures.append(expect_hex(data, pe, 0x478903, "6890040000", "ANI 0x490-byte layer allocation"))
    signatures.append(expect_hex(data, pe, 0x478919, "6890040000", "ANI 0x490-byte layer read"))
    signatures.append(expect_hex(data, pe, 0x40FD5F, "6850484f00", "character ANI format-string reference"))
    signatures.append(expect_hex(data, pe, 0x40FD7D, "e87e8a0600", "ANI loader call from character action loader"))

    cadence_sites = scan_normal_cadence(data, pe)
    required_cadence_sites = {
        "0x0045c852", "0x00465516", "0x0046fc7b", "0x00470f49", "0x004711d5",
        "0x004889fd", "0x004b21c1", "0x004b2309", "0x004b8a03",
    }
    missing = required_cadence_sites - set(cadence_sites)
    if missing:
        raise ValueError(f"missing expected cadence sites: {sorted(missing)}")
    if struct.unpack("<f", read_at(data, pe, 0x4E41D8, 4))[0] != 1000.0:
        raise ValueError("1000.0 constant mismatch")
    if struct.unpack("<f", read_at(data, pe, 0x4E4AAC, 4))[0] != 1.0:
        raise ValueError("1.0 constant mismatch")
    signatures.append(expect_hex(data, pe, 0x4960B4, "d98044040000eb04", "special timing loads layer+0x444"))
    signatures.append(expect_hex(data, pe, 0x4960C0, "d825ac4a4e00d83dd8414e00", "special timing computes 1000/(raw-1)"))

    # Positive HP loss -> hit sound -> state 3 -> signed absolute HP write.
    signatures.append(expect_hex(data, pe, 0x405B5A, "8b56342bd785d20f8eb3000000", "positive oldHP-newHP gate"))
    signatures.append(expect_hex(data, pe, 0x405B81, "8b4368", "hit presentation type read"))
    signatures.append(expect_hex(data, pe, 0x405BF4, "b97097a400e872090100", "hit SFX manager call"))
    signatures.append(expect_hex(data, pe, 0x405BFE, "6a006a038bcee8f7c30a00", "set action state 3"))
    signatures.append(expect_hex(data, pe, 0x405C1A, "0fbf4424308b56348bc82bca894634", "signed absolute HP write"))

    # Character action setup and end dispatch.
    signatures.append(expect_hex(data, pe, 0x4B2048, "8986ec020000", "store action state"))
    signatures.append(expect_hex(data, pe, 0x4B20D1, "c786f002000000000000", "reset frame index"))
    signatures.append(expect_hex(data, pe, 0x4B20DB, "c1e0078b4c3844", "select initial direction-row frame"))
    signatures.append(expect_hex(data, pe, 0x4B2332, "8b96ec02000083c2fe83fa06", "end-of-action state switch"))
    end_table = dword_table(data, pe, 0x4B23E0, 7)
    expected_end_table = [
        "0x004b2347", "0x004b2347", "0x004b23a6", "0x004b2347",
        "0x004b23a6", "0x004b2383", "0x004b2399",
    ]
    if end_table != expected_end_table:
        raise ValueError(f"action-end table mismatch: {end_table}")

    strings = []
    for va, text in [
        (0x4F4850, "%sCHAR\\B%03d_%02d.ani"),
        (0x4F4524, "NDS-000%d.wav"), (0x4F4514, "NDS-001%d.wav"),
        (0x4F4504, "NDS-0030.wav"), (0x4F44F4, "NDS-0040.wav"), (0x4F44E4, "NDS-0050.wav"),
        (0x4F81F4, "magic-%03d.ani"), (0x4F8204, "magic-%03d.spr"), (0x4F8214, "%sMagicRes\\%s"),
        (0x4F823C, "NDS-4%03d.wav"), (0x4F8DA4, "Sound\\NDS-8%03d.mid"),
    ]:
        strings.append(expect_string(data, pe, va, text))

    result = {
        "schema": 1,
        "evidence": "VERIFIED_STATIC_ORIGINAL_FIXED_HASH",
        "input": {"sha256": digest, "expected_sha256": EXPECTED_SHA256},
        "verified_signatures": signatures,
        "ani_timing": {
            "layer_record_size": 0x490,
            "file_raw_timing_offset": 0x488,
            "runtime_layer_raw_timing_offset": 0x444,
            "timer_unit": "milliseconds",
            "common_frame_threshold_formula": "1000.0 / raw_timing milliseconds",
            "common_rate_interpretation": "raw_timing behaves as an authored frames-per-second-like rate in common ANI consumers",
            "examples": {"5": 200.0, "10": 100.0, "30": 1000.0 / 30.0, "200": 5.0},
            "common_consumer_sites": cadence_sites,
            "special_consumers": [{
                "va": "0x004960b4",
                "formula": "1000.0 / (raw_timing - 1.0)",
                "warning": "caller-specific transform; do not apply globally",
            }],
        },
        "battle_presentation": {
            "damage_gate": "old HP - incoming signed absolute HP > 0",
            "sequence": [
                "choose hit presentation/audio family",
                "play hit SFX",
                "set character action state 3",
                "write incoming signed absolute HP",
            ],
            "state_3_resource_binding": "the character loader formats the action index into B%03d_%02d.ani; state 3 selects _03 when present",
            "hit_sfx_families": ["NDS-000%d.wav", "NDS-001%d.wav", "NDS-0030.wav", "NDS-0040.wav", "NDS-0050.wav"],
        },
        "action_end_policy": {
            "dispatch_range": "states 2..8 at final frame",
            "state_2": "reset to state 0; optionally state 1 when movement condition is active",
            "state_3": "reset to state 0; optionally state 1 when movement condition is active",
            "state_4": "continue/loop through normal frame advance path",
            "state_5": "reset to state 0; optionally state 1 when movement condition is active",
            "state_6": "continue/loop through normal frame advance path",
            "state_7": "reset to state 0",
            "state_8": "clear active flag and return terminal code 2",
            "semantic_warning": "numeric state behavior is verified; death meaning for state 7/8 is not established by this evidence",
        },
        "audio": {
            "verified_templates": strings,
            "bgm_template": {"text": "Sound\\NDS-8%03d.mid", "status": "VERIFIED_CODE_TEMPLATE"},
            "magic_sfx_template": {
                "text": "NDS-4%03d.wav",
                "status": "VERIFIED_NEAR_MAGICRES_RUNTIME",
                "warning": "exact spell-id/stage mapping remains unverified",
            },
        },
        "unresolved": [
            "death action semantic binding",
            "attack impact frame within state 2",
            "MagicRes placement/anchor/blend/stage composition",
            "SMF flags -> foreground occlusion semantics",
        ],
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"out": str(args.out), "cadence_sites": len(cadence_sites), "verified_signatures": len(signatures)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
