from __future__ import annotations

import struct
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

import probe_visual_semantics as probe  # noqa: E402


def synthetic_pe() -> bytes:
    data = bytearray(0x700)
    data[:2] = b"MZ"
    struct.pack_into("<I", data, 0x3C, 0x80)
    data[0x80:0x84] = b"PE\0\0"
    coff = 0x84
    struct.pack_into("<H", data, coff, 0x14C)
    struct.pack_into("<H", data, coff + 2, 1)
    struct.pack_into("<H", data, coff + 16, 0xE0)
    opt = coff + 20
    struct.pack_into("<H", data, opt, 0x10B)
    struct.pack_into("<I", data, opt + 28, 0x400000)
    sec = opt + 0xE0
    data[sec : sec + 8] = b".text\0\0\0"
    struct.pack_into("<IIII", data, sec + 8, 0x500, 0x1000, 0x500, 0x200)
    return bytes(data)


class VisualSemanticHelpers(unittest.TestCase):
    def test_va_mapping_and_signature_guard(self):
        data = bytearray(synthetic_pe())
        pe = probe.parse_pe(data)
        off = 0x200 + 0x20
        data[off : off + 3] = bytes.fromhex("6a038b")
        row = probe.expect_hex(bytes(data), pe, 0x401020, "6a038b", "sample")
        self.assertEqual(row["va"], "0x00401020")
        with self.assertRaises(ValueError):
            probe.expect_hex(bytes(data), pe, 0x401020, "6a028b", "bad")

    def test_cadence_scan_accepts_register_setup_between_fld_and_fdiv(self):
        data = bytearray(synthetic_pe())
        pe = probe.parse_pe(data)
        off = 0x200 + 0x50
        data[off : off + 14] = bytes.fromhex("d905d8414e008bf8d8b044040000")
        self.assertEqual(probe.scan_normal_cadence(bytes(data), pe), ["0x00401050"])

    def test_dword_table_preserves_exact_dispatch_targets(self):
        data = bytearray(synthetic_pe())
        pe = probe.parse_pe(data)
        off = 0x200 + 0x80
        struct.pack_into("<III", data, off, 0x401111, 0x402222, 0x403333)
        self.assertEqual(
            probe.dword_table(bytes(data), pe, 0x401080, 3),
            ["0x00401111", "0x00402222", "0x00403333"],
        )


if __name__ == "__main__":
    unittest.main()
