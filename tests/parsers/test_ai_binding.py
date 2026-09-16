from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from probe_ai_binding import DEFAULT_PROGRAM, resolve_program_source  # noqa: E402


class AiBindingTests(unittest.TestCase):
    def test_network_program_has_highest_precedence(self):
        for category in (0, 6, 7, 8, 9):
            self.assertEqual(
                resolve_program_source(category, True, "ODATTACK ATTACK(100)"),
                "NETWORK_PROGRAM",
            )

    def test_categories_7_and_8_use_roster_program_without_network_match(self):
        for category in (7, 8):
            self.assertEqual(
                resolve_program_source(category, False, "ODATTACK ATTACK(100)"),
                "ROSTER_PROGRAM",
            )

    def test_categories_7_and_8_use_default_only_when_roster_program_is_empty(self):
        self.assertEqual(DEFAULT_PROGRAM, "ODNORMAL REST(20),ATTACK(80)")
        for category in (7, 8):
            self.assertEqual(resolve_program_source(category, False, ""), "ROSTER_DEFAULT")

    def test_other_categories_without_network_match_use_alternate_handler(self):
        for category in (0, 1, 2, 3, 4, 5, 6, 9):
            self.assertEqual(
                resolve_program_source(category, False, "ODATTACK ATTACK(100)"),
                "ALTERNATE_HANDLER",
            )

    def test_manifest_keeps_missing_historical_instance_rows_explicit(self):
        manifest = json.loads((ROOT / "manifests" / "enemy-ai-binding.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["source"]["unpacked_sha256"], "432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7")
        self.assertEqual(manifest["concrete_historical_bindings"]["status"], "UNVERIFIED")
        self.assertEqual(manifest["concrete_historical_bindings"]["entries"], [])
        self.assertEqual(manifest["target_selection"]["distance_priority_inside_eligible_pool"], False)


if __name__ == "__main__":
    unittest.main()
