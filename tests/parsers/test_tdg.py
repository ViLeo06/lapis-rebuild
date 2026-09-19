import struct
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "convert"))
from tdg import parse_tdg  # noqa: E402


def build_one_frame_tdg() -> bytes:
    header = bytearray(0x25)
    header[:16] = b"DIALOG LIBRARY.\0"
    struct.pack_into("<H", header, 0x10, 0x0600)
    struct.pack_into("<HH", header, 0x1b, 2, 1)
    header[0x1f] = 0x20
    header[0x20] = 0x08
    struct.pack_into("<I", header, 0x21, 1)
    words = (1, 0x1002, 0xf800, 0x001f)
    offsets = struct.pack("<2I", 0, len(words))
    stream = struct.pack("<4H", *words)
    tail = struct.pack("<I4i", 1, 0, 0, 1, 2)
    return bytes(header) + offsets + stream + tail


class TdgParserTest(unittest.TestCase):
    def test_dialog_library_framing(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "Synthetic.Tdg"
            path.write_bytes(build_one_frame_tdg())
            lib = parse_tdg(path)
        self.assertEqual((lib.canvas_width, lib.canvas_height), (2, 1))
        self.assertEqual(len(lib.frames), 1)
        self.assertEqual((lib.frames[0].width, lib.frames[0].height), (2, 1))
        self.assertEqual(lib.frames[0].rows[0].runs[0].payload, (0xf800, 0x001f))

    def test_rejects_tip_magic(self):
        data = bytearray(build_one_frame_tdg())
        data[:16] = b"NORMAL LIBRARY.\0"
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "Wrong.Tdg"
            path.write_bytes(data)
            with self.assertRaisesRegex(ValueError, "invalid TDG magic"):
                parse_tdg(path)


if __name__ == "__main__":
    unittest.main()
