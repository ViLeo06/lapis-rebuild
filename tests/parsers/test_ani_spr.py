from __future__ import annotations

import struct
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "convert"))

from ani import parse_ani  # noqa: E402
from spr import parse_spr  # noqa: E402


class AniTests(unittest.TestCase):
    def test_uses_only_declared_frame_slots(self):
        data = bytearray([0xCC] * 1236)
        header = b"test AniFile\x00"
        data[: len(header)] = header
        struct.pack_into("<I", data, 0x40, 1)
        data[0x44:0x84] = b"Body_\x00" + bytes(58)
        struct.pack_into("<I", data, 0x84, 2)
        for direction in range(8):
            base = 0x88 + direction * 0x80
            struct.pack_into("<II", data, base, direction * 2, direction * 2 + 1)
            struct.pack_into("<I", data, base + 8, 999999)
        struct.pack_into("<f", data, 0x488, 5.0)
        struct.pack_into("<I", data, 0x48C, 0)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "x.ani"
            path.write_bytes(data)
            ani = parse_ani(path)
            self.assertEqual(ani.frames_per_direction, 2)
            self.assertEqual(ani.directions[0], [0, 1])
            self.assertEqual(ani.directions[7], [14, 15])


class SprTests(unittest.TestCase):
    def test_single_frame_two_rows(self):
        data = bytearray()
        data += struct.pack("<I", 1)
        data += struct.pack("<4i", -1, -1, 1, 1)
        payload = bytearray()
        payload += struct.pack("<H", 2)
        payload += struct.pack("<H", 1) + struct.pack("<HH", 0, 2) + struct.pack("<HH", 0xF800, 0x07E0)
        payload += struct.pack("<H", 1) + struct.pack("<HH", 1, 1) + struct.pack("<H", 0x001F)
        data += struct.pack("<I", len(payload)) + payload
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "x.spr"
            path.write_bytes(data)
            spr = parse_spr(path)
            self.assertEqual(spr.frame_count, 1)
            frame = spr.frames[0]
            self.assertEqual((frame.width, frame.height), (2, 2))
            self.assertEqual(frame.rgba[:4], bytes((255, 0, 0, 255)))
            self.assertEqual(frame.rgba[4:8], bytes((0, 255, 0, 255)))
            self.assertEqual(frame.rgba[8:12], bytes((0, 0, 0, 0)))
            self.assertEqual(frame.rgba[12:16], bytes((0, 0, 255, 255)))


if __name__ == "__main__":
    unittest.main()
