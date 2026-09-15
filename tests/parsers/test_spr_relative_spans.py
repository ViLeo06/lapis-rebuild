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
    def test_second_span_skip_is_relative_to_previous_run_end(self):
        # 8x1 frame. Encoded runs are:
        #   skip 1, draw 2 red pixels  -> x 1..2
        #   skip 2, draw 2 green       -> x 5..6
        # Treating the second skip as absolute x would incorrectly draw green
        # at x 2..3 and reproduce the horizontal slicing seen in manual review.
        data = bytearray()
        data += struct.pack("<I", 1)
        data += struct.pack("<4i", 0, 0, 8, 1)
        payload = bytearray()
        payload += struct.pack("<H", 1)  # row count
        payload += struct.pack("<H", 2)  # span count
        payload += struct.pack("<HH", 1, 2) + struct.pack("<HH", 0xF800, 0xF800)
        payload += struct.pack("<HH", 2, 2) + struct.pack("<HH", 0x07E0, 0x07E0)
        data += struct.pack("<I", len(payload)) + payload

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "relative.spr"
            path.write_bytes(data)
            frame = parse_spr(path).frames[0]

        alpha = [frame.rgba[i * 4 + 3] for i in range(8)]
        self.assertEqual(alpha, [0, 255, 255, 0, 0, 255, 255, 0])
        self.assertEqual(frame.rgba[5 * 4 : 6 * 4], bytes((0, 255, 0, 255)))


if __name__ == "__main__":
    unittest.main()
