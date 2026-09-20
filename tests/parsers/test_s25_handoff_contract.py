import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
MATRIX=ROOT/'manifests/m6-dual-class-ten-stage-matrix.json'

class S25HandoffContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d=json.loads(MATRIX.read_text(encoding='utf-8'))

    def test_downstream_handoffs_are_declared(self):
        self.assertEqual(set(self.d['consumer_contract']),{'s26','s27','s28','s29'})
        self.assertIn('ReconstructionSwordsmanProgressionPolicy',self.d['consumer_contract']['s26'])
        self.assertIn('wizard',self.d['consumer_contract']['s27'].lower())
        self.assertIn('quest/equipment/reward',self.d['consumer_contract']['s28'])

    def test_server_boundaries_are_not_promoted(self):
        for key in (
            'retail_promotion_level_or_trigger',
            'promotion_quest_or_other_conditions',
            'retail_exp_formula',
            'skill_unlock_condition',
            'equipment_final_class_stage_eligibility',
            'retail_damage_hit_critical_defence_magic_formula',
            'retail_reward_semantics_for_ability_gold_exp',
            'quest_npc_class_stage_decision',
        ):
            self.assertEqual(self.d['boundaries'][key],'SERVER-BOUNDARY',key)

if __name__=='__main__':
    unittest.main()
