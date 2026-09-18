from __future__ import annotations

import sys
import unittest
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from npc_visual_core import (  # noqa: E402
    BODY_DIRECTIONS,
    TIP_RENDER_POLICY,
    alpha5,
    choose_gallery_ids,
    decode_tip_frame_inferred,
    visual_fingerprint,
)


@dataclass(frozen=True)
class Run:
    kind: int
    length: int
    payload: tuple[int, ...]


@dataclass(frozen=True)
class Row:
    runs: tuple[Run, ...]


@dataclass(frozen=True)
class Frame:
    width: int
    height: int
    rows: tuple[Row, ...]


class NpcVisualCoreTests(unittest.TestCase):
    def test_direction_order_uses_current_human_validated_body_mapping(self):
        self.assertEqual(BODY_DIRECTIONS, ("S", "SW", "W", "NW", "N", "NE", "E", "SE"))

    def test_alpha5_endpoints(self):
        self.assertEqual(alpha5(0), 0)
        self.assertEqual(alpha5(31), 255)
        with self.assertRaises(ValueError):
            alpha5(32)

    def test_inferred_tip_renderer_handles_all_recovered_run_shapes(self):
        frame = Frame(
            width=5,
            height=1,
            rows=(Row((
                Run(0, 1, ()),
                Run(1, 1, (0xF800,)),
                Run(2, 1, (0x07E0,)),
                Run(3, 1, (0x001F, 31)),
                Run(4, 1, (0xFFFF, 15)),
            )),),
        )
        rgba = decode_tip_frame_inferred(frame)
        self.assertEqual(len(rgba), 5 * 4)
        self.assertEqual(tuple(rgba[0:4]), (0, 0, 0, 0))
        self.assertEqual(tuple(rgba[4:8]), (255, 0, 0, 255))
        self.assertEqual(tuple(rgba[8:12]), (0, 255, 0, 255))
        self.assertEqual(tuple(rgba[12:16]), (0, 0, 255, 255))
        self.assertGreater(rgba[19], 100)
        self.assertLess(rgba[19], 150)
        self.assertIn("INFERRED", TIP_RENDER_POLICY)

    def test_gallery_sampling_is_broad_and_deterministic(self):
        ids = list(range(1001, 1037)) + list(range(4000, 5000)) + list(range(5000, 5458)) + list(range(6000, 6208, 10))
        a = choose_gallery_ids(ids, limit=80)
        b = choose_gallery_ids(ids, limit=80)
        self.assertEqual(a, b)
        self.assertLessEqual(len(a), 80)
        self.assertTrue(any(4000 <= x < 5000 for x in a))
        self.assertTrue(any(5000 <= x < 6000 for x in a))
        self.assertTrue(any(x >= 6000 for x in a))

    def test_fingerprint_depends_on_action_resource_hashes(self):
        a = {0: {"ani_sha256": "a", "spr_sha256": "b"}}
        b = {0: {"ani_sha256": "a", "spr_sha256": "c"}}
        self.assertNotEqual(visual_fingerprint(a), visual_fingerprint(b))
        self.assertEqual(visual_fingerprint(a), visual_fingerprint(dict(a)))


if __name__ == "__main__":
    unittest.main()
