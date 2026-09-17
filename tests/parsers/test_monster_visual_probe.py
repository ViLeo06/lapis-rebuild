from __future__ import annotations

import json
import struct
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

import probe_monster_visuals as probe  # noqa: E402


def write_ani(path: Path, *, slot_frame: int = 0) -> None:
    data = bytearray(1236)
    struct.pack_into("<I", data, 0x40, 1)
    data[0x44:0x44 + 5] = b"Body_"
    struct.pack_into("<I", data, 0x84, 1)
    for direction in range(8):
        struct.pack_into("<I", data, 0x88 + direction * 128, slot_frame)
    struct.pack_into("<f", data, 0x488, 5.0)
    path.write_bytes(data)


def write_spr(path: Path, *, row_count: int = 2) -> None:
    data = bytearray()
    data += struct.pack("<I", 1)
    data += struct.pack("<4i", -1, -2, 1, 0)
    payload = bytearray()
    payload += struct.pack("<H", row_count)
    for _ in range(row_count):
        payload += struct.pack("<H", 1)
        payload += struct.pack("<HH", 0, 2)
        payload += struct.pack("<HH", 0xFFFF, 0x07E0)
    data += struct.pack("<I", len(payload))
    data += payload
    path.write_bytes(data)


class MonsterVisualProbeTests(unittest.TestCase):
    def test_story_model_namespaces_are_recorded_without_binding(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "story.json"
            path.write_text(json.dumps({
                "zones": [{"zone_id": 81, "scripts": {"DEO": {"models": ["4524", "COM0"]}}}]
            }))
            uses = probe.story_model_uses(path)
            self.assertEqual(uses["4524"], [{"zone": 81, "script": "DEO"}])
            self.assertEqual(uses["COM0"], [{"zone": 81, "script": "DEO"}])

    def test_visual_family_scan_preserves_raw_evidence_boundary(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            char = root / "Char"
            char.mkdir()
            for slot in ("00", "03", "05"):
                write_ani(char / f"B4524_{slot}.ani")
                write_spr(char / f"B4524_{slot}.spr")
            rows = probe.scan_visual_families(root)
            self.assertEqual(len(rows), 1)
            family = rows[0]
            self.assertEqual(family["visual_family_id"], "B4524")
            self.assertEqual(family["action_slots"], ["00", "03", "05"])
            by_slot = {row["slot"]: row for row in family["slots"]}
            self.assertEqual(by_slot["03"]["semantic"]["provenance"], "VERIFIED_STATIC_ORIGINAL")
            self.assertEqual(by_slot["05"]["semantic"]["provenance"], "UNVERIFIED")
            self.assertIsNone(family["death_semantic"]["slot"])
            self.assertEqual(family["direction_semantics"]["status"], "UNVERIFIED_FOR_UNCHECKED_FAMILY")

    def test_non_strict_spr_fallback_is_explicit(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "outlier.spr"
            write_spr(path, row_count=1)
            _spr, status, error = probe.parse_spr_evidence(path)
            self.assertEqual(status, "NON_STRICT_FALLBACK")
            self.assertIn("row_count=1, height=2", error)

    def test_report_numeric_match_is_only_correlation(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            char = root / "Char"
            char.mkdir()
            write_ani(char / "B4524_03.ani")
            write_spr(char / "B4524_03.spr")
            story = root / "story.json"
            story.write_text(json.dumps({
                "zones": [{"zone_id": 81, "scripts": {"DEO": {"models": ["4524", "501"]}}}]
            }))
            report = probe.build_report(root, story)
            rows = {row["story_model_token"]: row for row in report["story_model_correlations"]}
            self.assertEqual(rows["4524"]["binding_status"], "UNVERIFIED_NUMERIC_CORRELATION")
            self.assertEqual(rows["501"]["binding_status"], "NO_SAME_NUMERIC_VISUAL_FAMILY")
            self.assertEqual(report["preview_candidate_visual_ids"], ["B4524"])


if __name__ == "__main__":
    unittest.main()
