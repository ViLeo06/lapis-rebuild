from __future__ import annotations

import struct
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

import probe_visual_fidelity as probe  # noqa: E402


def synthetic_pe() -> bytes:
    data = bytearray(0x900)
    data[:2] = b"MZ"
    struct.pack_into("<I", data, 0x3C, 0x80)
    data[0x80:0x84] = b"PE\0\0"
    coff = 0x84
    struct.pack_into("<H", data, coff + 0, 0x14C)
    struct.pack_into("<H", data, coff + 2, 1)
    struct.pack_into("<H", data, coff + 16, 0xE0)
    opt = coff + 20
    struct.pack_into("<H", data, opt, 0x10B)
    struct.pack_into("<I", data, opt + 28, 0x400000)
    struct.pack_into("<I", data, opt + 92, 16)
    struct.pack_into("<II", data, opt + 104, 0x1100, 40)
    sec = opt + 0xE0
    data[sec : sec + 8] = b".text\0\0\0"
    struct.pack_into("<IIII", data, sec + 8, 0x700, 0x1000, 0x700, 0x200)
    struct.pack_into("<I", data, sec + 36, 0x60000020)

    # One import descriptor: winmm.dll!timeGetTime, IAT RVA 0x11a0.
    imp = 0x200 + (0x1100 - 0x1000)
    struct.pack_into("<IIIII", data, imp, 0x1180, 0, 0, 0x11C0, 0x11A0)
    oft = 0x200 + (0x1180 - 0x1000)
    struct.pack_into("<II", data, oft, 0x11D0, 0)
    dll = 0x200 + (0x11C0 - 0x1000)
    data[dll : dll + 10] = b"winmm.dll\0"
    ibn = 0x200 + (0x11D0 - 0x1000)
    struct.pack_into("<H", data, ibn, 0)
    data[ibn + 2 : ibn + 14] = b"timeGetTime\0"

    # Direct FF 15 [IAT] call at VA 0x401020.
    call_off = 0x200 + 0x20
    data[call_off : call_off + 6] = b"\xff\x15" + struct.pack("<I", 0x4011A0)

    # Printable resource string plus an absolute code reference.
    text_off = 0x200 + 0x200
    text = b"MagicRes\\magic-001.ani\0"
    data[text_off : text_off + len(text)] = text
    text_va = 0x400000 + 0x1200
    ref_off = 0x200 + 0x30
    data[ref_off : ref_off + 4] = struct.pack("<I", text_va)
    return bytes(data)


class ProbeHelpersTests(unittest.TestCase):
    def test_audio_name_classification_is_explicitly_heuristic(self):
        self.assertEqual(probe.classify_audio_path("BGM/town.mid"), "BGM_NAME_HEURISTIC")
        self.assertEqual(probe.classify_audio_path("Sound/attack.wav"), "SFX_NAME_HEURISTIC")
        self.assertEqual(probe.classify_audio_path("misc/001.wav"), "UNCLASSIFIED")

    def test_pe_import_and_direct_iat_call_scan(self):
        data = synthetic_pe()
        pe = probe.parse_pe32(data)
        imports = probe.parse_imports(data, pe)
        target = next(i for i in imports if i["function"] == "timeGetTime")
        self.assertEqual(target["dll"], "winmm.dll")
        self.assertEqual(target["iat_va"], 0x4011A0)
        calls = probe.scan_iat_calls(data, pe, imports, {"timeGetTime"})
        self.assertEqual(calls[0]["direct_iat_calls"], ["0x00401020"])

    def test_ascii_resource_string_xref_is_bounded(self):
        data = synthetic_pe()
        pe = probe.parse_pe32(data)
        rows = probe.scan_ascii_token_xrefs(data, pe)
        row = next(r for r in rows if "magic-001.ani" in r["text"])
        self.assertEqual(row["va"], "0x00401200")
        self.assertIn("0x00401030", row["code_absolute_refs"])

    def test_audio_inventory_does_not_promote_heuristics_to_triggers(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root / "BGM").mkdir()
            (root / "Sound").mkdir()
            (root / "BGM" / "town.mid").write_bytes(b"MThd")
            (root / "Sound" / "attack.wav").write_bytes(b"RIFF")
            out = probe.summarize_audio(root, b"attack.wav\0")
            self.assertEqual(out["resource_count"], 2)
            self.assertEqual(out["name_role_distribution"]["BGM_NAME_HEURISTIC"], 1)
            self.assertEqual(out["name_role_distribution"]["SFX_NAME_HEURISTIC"], 1)
            self.assertIn("trigger semantics", out["warning"])
            attack = next(r for r in out["inventory"] if r["path"].endswith("attack.wav"))
            self.assertTrue(attack["filename_in_binary"])


if __name__ == "__main__":
    unittest.main()
