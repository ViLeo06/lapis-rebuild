from __future__ import annotations

import struct
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "convert"))

from spr import parse_spr  # noqa: E402


class SprRelativeSpanTests(unittest.TestCase):
    def _write(self, payload: bytes, width: int = 8) -> Path:
        self.tmp = tempfile.TemporaryDirectory()
        path = Path(self.tmp.name) / "relative.spr"
        data = bytearray()
        data += struct.pack("<I", 1)
        data += struct.pack("<4i", 0, 0, width, 1)
        data += struct.pack("<I", len(payload)) + payload
        path.write_bytes(data)
        return path

    def tearDown(self):
        tmp = getattr(self, "tmp", None)
        if tmp is not None:
            tmp.cleanup()
            self.tmp = None

    def test_second_span_skip_is_relative_to_previous_run_end(self):
        # 8x1 frame. Encoded runs are:
        #   skip 1, draw 2 red pixels  -> x 1..2
        #   skip 2, draw 2 green       -> x 5..6
        # Treating the second skip as absolute x would incorrectly draw green
        # at x 2..3 and reproduce the horizontal slicing seen in manual review.
        payload = bytearray()
        payload += struct.pack("<H", 1)  # row count
        payload += struct.pack("<H", 2)  # span count
        payload += struct.pack("<HH", 1, 2) + struct.pack("<HH", 0xF800, 0xF800)
        payload += struct.pack("<HH", 2, 2) + struct.pack("<HH", 0x07E0, 0x07E0)
        frame = parse_spr(self._write(bytes(payload))).frames[0]

        alpha = [frame.rgba[i * 4 + 3] for i in range(8)]
        self.assertEqual(alpha, [0, 255, 255, 0, 0, 255, 255, 0])
        self.assertEqual(frame.rgba[5 * 4 : 6 * 4], bytes((0, 255, 0, 255)))

    def test_cumulative_skip_cannot_escape_frame_width(self):
        payload = bytearray()
        payload += struct.pack("<H", 1)
        payload += struct.pack("<H", 2)
        payload += struct.pack("<HH", 5, 2) + struct.pack("<HH", 0xFFFF, 0xFFFF)
        payload += struct.pack("<HH", 2, 1) + struct.pack("<H", 0xFFFF)
        with self.assertRaises(ValueError):
            parse_spr(self._write(bytes(payload)))


if __name__ == "__main__":
    unittest.main()
