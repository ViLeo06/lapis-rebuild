from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"tools"))

import probe_monster_visual_binding as probe  # noqa:E402


class MonsterVisualBindingTests(unittest.TestCase):
    def test_unit_key_and_visual_model_are_explicitly_distinct(self):
        facts=probe.binding_facts()
        roster=facts["battle_roster_record"]
        self.assertEqual(roster["unit_program_key_offset"],"0x00")
        self.assertEqual(roster["visual_model_id_offset"],"0x08")
        self.assertNotEqual(roster["unit_program_key_offset"],roster["visual_model_id_offset"])

    def test_visual_binding_chain_ends_at_ani_model_argument(self):
        facts=probe.binding_facts()
        self.assertEqual(facts["visual_cache_object"]["model_id_offset"],"0x234")
        self.assertEqual(facts["ani_binding"]["format"],"B%03d_%02d.ani")
        self.assertEqual(facts["ani_binding"]["model_argument"],"visual object +0x234")
        self.assertEqual(facts["ani_binding"]["status"],"VERIFIED_STATIC_ORIGINAL")

    def test_fixed_hash_probe_locks_every_dataflow_stage(self):
        names={name for name,_va,_hex in probe.SPECS}
        self.assertEqual(names,{
            "roster_unit_key_and_visual_model_are_distinct_args",
            "roster_visual_model_arg2_resolves_visual_cache",
            "visual_cache_object_records_model_id_at_234",
            "live_unit_visual_object_drives_action_loader",
            "visual_loader_preserves_original_ecx_object",
            "visual_loader_formats_model_234_and_action_state",
        })


if __name__=="__main__":
    unittest.main()
