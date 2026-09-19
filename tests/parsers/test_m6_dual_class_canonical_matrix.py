import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
MATRIX=ROOT/'manifests/m6-dual-class-ten-stage-matrix.json'

class CanonicalMatrixTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d=json.loads(MATRIX.read_text(encoding='utf-8'))

    def test_stage_sets_and_visual_contract(self):
        sword=[s['stage_id'] for s in self.d['families']['swordsman']['stages']]
        wizard=[s['stage_id'] for s in self.d['families']['wizard']['stages']]
        self.assertEqual(sword,list(range(100,191,10)))
        self.assertEqual(wizard,list(range(109,200,10)))
        self.assertEqual(self.d['visual_contract']['inventory_cross_check'],'200/200 files')
        self.assertEqual(self.d['visual_contract']['slots'],['00','01','02','03','05'])
        self.assertEqual(self.d['visual_contract']['semantics']['03'],'VERIFIED-STATIC-ORIGINAL:hit-reaction')

    def test_progression_templates_are_complete_but_not_server_truth(self):
        self.assertEqual(set(self.d['progression_templates_by_stage_ordinal']),{str(i) for i in range(1,11)})
        total=sum(len(v['internal_level']) for v in self.d['progression_templates_by_stage_ordinal'].values())
        self.assertEqual(total,100)
        for family in self.d['families'].values():
            for s in family['stages']:
                self.assertEqual(s['transition_hint']['source_evidence'],'VERIFIED-STATIC-ORIGINAL')
                self.assertEqual(s['transition_hint']['interpretation_evidence'],'INFERRED')
        self.assertEqual(self.d['boundaries']['retail_promotion_level_or_trigger'],'SERVER-BOUNDARY')
        self.assertEqual(self.d['boundaries']['retail_exp_formula'],'SERVER-BOUNDARY')

    def test_skill_and_equipment_boundaries(self):
        expected={1101,1201,1301,1401,1501,19101,19201,19301,19401,19501}
        self.assertEqual({int(x) for x in self.d['skills_by_id']},expected)
        self.assertTrue(all(self.d['skills_by_id'][str(x)]['mp_cost']>0 for x in expected))
        self.assertEqual(self.d['equipment']['class_flag_mapping_hypothesis']['evidence'],'INFERRED')
        self.assertEqual(self.d['equipment']['final_class_stage_eligibility'],'SERVER-BOUNDARY')

    def test_original_header_tokens_are_not_relabelled(self):
        sword=self.d['families']['swordsman']['common_ability_fields']
        self.assertEqual(sword['dex'],10)
        self.assertNotIn('agi',sword)

if __name__=='__main__': unittest.main()
