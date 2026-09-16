from __future__ import annotations

import importlib.util
import struct
import sys
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[2] / "tools" / "probe_encounter_recovery.py"
spec = importlib.util.spec_from_file_location("probe_encounter_recovery", MODULE_PATH)
assert spec and spec.loader
probe = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = probe
spec.loader.exec_module(probe)


def make_pe(code: bytes, image_base: int = 0x400000, rva: int = 0x1000) -> bytes:
    raw_off = 0x200
    size = raw_off + max(0x200, len(code))
    data = bytearray(size)
    data[:2] = b"MZ"
    struct.pack_into("<I", data, 0x3C, 0x80)
    data[0x80:0x84] = b"PE\0\0"
    coff = 0x84
    struct.pack_into("<H", data, coff + 2, 1)
    struct.pack_into("<H", data, coff + 16, 0xE0)
    opt = coff + 20
    struct.pack_into("<H", data, opt, 0x10B)
    struct.pack_into("<I", data, opt + 28, image_base)
    section = opt + 0xE0
    data[section:section + 8] = b".text\0\0\0"
    struct.pack_into("<IIII", data, section + 8, len(code), rva, max(0x200, len(code)), raw_off)
    data[raw_off:raw_off + len(code)] = code
    return bytes(data)


class EncounterProbeHelpersTest(unittest.TestCase):
    def test_parse_sections_and_va_offset(self) -> None:
        data = make_pe(b"\x90\x90\xcc")
        base, sections = probe.parse_sections(data)
        self.assertEqual(base, 0x400000)
        self.assertEqual(sections[0].name, ".text")
        self.assertEqual(probe.va_offset(0x401002, sections), 0x202)

    def test_signature_verification_is_exact(self) -> None:
        data = make_pe(bytes.fromhex("c644240849"))
        _, sections = probe.parse_sections(data)
        row = probe.verify_signature(data, sections, "packet", 0x401000, "c644240849")
        self.assertTrue(row["verified"])
        with self.assertRaises(ValueError):
            probe.verify_signature(data, sections, "packet", 0x401000, "c644240804")

    def test_rel32_call_scanner_reports_only_matching_target(self) -> None:
        base = 0x401000
        target = 0x401030
        code = bytearray(b"\x90" * 0x60)
        call_at = 0x10
        rel = target - (base + call_at + 5)
        code[call_at] = 0xE8
        struct.pack_into("<i", code, call_at + 1, rel)
        # Another E8 that deliberately resolves somewhere else.
        code[0x20] = 0xE8
        struct.pack_into("<i", code, 0x21, 0)
        data = make_pe(bytes(code))
        _, sections = probe.parse_sections(data)
        self.assertEqual(probe.find_rel32_callers(data, sections, target), [0x401010])


if __name__ == "__main__":
    unittest.main()
