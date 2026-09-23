from __future__ import annotations
import importlib.util,json,unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
MANIFEST=ROOT/'manifests/m7-1-dual-class-skill-evidence.json'
S25=ROOT/'manifests/m6-dual-class-ten-stage-matrix.json'
PROBE=ROOT/'tools/probe_m7_1_dual_class_skill_evidence.py'
FIELDS=['skill_id','name','att','dist','area','mp','time','team','unit','ea','eb','ec','tick','lvpt','magic_ptn','icon','iter','explanation']
MAP={'skill_id':'skill_id','name':'name','att':'attack_type','dist':'distance','area':'area','mp':'mp_cost','time':'time_raw','team':'team_mask','unit':'unit_mask','ea':'effect_a','eb':'effect_b','ec':'effect_c','tick':'tick','lvpt':'skill_level','magic_ptn':'magic_pattern_id','icon':'icon_index','iter':'iteration','explanation':'explanation'}

class S35SkillEvidenceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d=json.loads(MANIFEST.read_text(encoding='utf-8'))
        cls.rows=cls.d['rows']
        cls.byid={r['skill_id']:r for r in cls.rows}

    def test_60_unique_rows_and_exact_id_families(self):
        expected=set()
        for a,b in ((1101,1106),(1201,1206),(1301,1306),(1401,1406),(1501,1506),(19101,19106),(19201,19206),(19301,19306),(19401,19406),(19501,19506)):
            expected.update(range(a,b+1))
        self.assertEqual(len(self.rows),60)
        self.assertEqual(set(self.byid),expected)

    def test_every_requested_field_is_static_original(self):
        self.assertEqual(set(self.d['field_evidence']),set(FIELDS))
        self.assertTrue(all(self.d['field_evidence'][k]=='VERIFIED-STATIC-ORIGINAL' for k in FIELDS))
        for row in self.rows:
            self.assertEqual([k for k in FIELDS if k not in row],[])

    def test_each_family_has_lv1_to_lv6(self):
        for base in (1100,1200,1300,1400,1500,19100,19200,19300,19400,19500):
            fam=[self.byid[base+n] for n in range(1,7)]
            self.assertEqual([r['lvpt'] for r in fam],list(range(1,7)))

    def test_lv1_ten_rows_exact_join_s25(self):
        s25=json.loads(S25.read_text(encoding='utf-8'))['skills_by_id']
        for sid in (1101,1201,1301,1401,1501,19101,19201,19301,19401,19501):
            row=self.byid[sid]; old=s25[str(sid)]
            for field,old_field in MAP.items():
                self.assertEqual(row[field],old[old_field],f'{sid} {field}')

    def test_swordsman_curves(self):
        c=self.d['verified_curves']['swordsman']
        self.assertEqual(c['heavy_strike_mp'],[25,32,38,44,50,60])
        self.assertEqual(c['double_slash_mp'],[23,29,35,40,46,55])
        self.assertEqual(c['strong_defense_ea'],[20,25,30,35,40,50])
        self.assertEqual(c['burst_ea'],[10,15,20,25,30,35])
        self.assertEqual(c['burst_ec'],[5,7,10,12,15,17])
        self.assertEqual(c['sacrifice_ea'],[15,18,22,26,30,35])

    def test_wizard_geometry_and_mp_curves(self):
        c=self.d['verified_curves']['wizard']
        self.assertEqual(c['poison_mp'],[20,25,30,35,40,50])
        self.assertEqual(c['poison_dist'],[4,4,5,5,6,6])
        self.assertEqual(c['poison_area'],[1,1,2,2,2,3])
        self.assertEqual(c['ashes_mp'],[27,33,39,45,51,60])
        self.assertEqual(c['curse_eye_mp'],[18,23,30,36,43,49])

    def test_poison_boundaries(self):
        c=self.d['conflicts_and_boundaries']
        self.assertEqual(c['poison_ea_eb_ec_tick']['evidence'],'SERVER-BOUNDARY')
        self.assertEqual(c['ec_equals_tick_count']['evidence'],'UNVERIFIED')
        self.assertEqual(c['battle_tick_wall_clock']['evidence'],'RECOVERED_SECONDARY')

    def test_conflicting_secondary_cases(self):
        c=self.d['conflicts_and_boundaries']
        self.assertEqual(c['ashes_healing_block_vs_action_lock']['evidence'],'CONFLICTING_SECONDARY')
        self.assertEqual(c['nature_force_mp_drain_amount']['evidence'],'CONFLICTING_SECONDARY')
        self.assertEqual(c['sacrifice_one_shot_vs_periodic']['evidence'],'CONFLICTING_SECONDARY')
        self.assertEqual(c['black_veil_accuracy_vs_attack']['evidence'],'CONFLICTING_SECONDARY')

    def test_time_mapping_is_server_boundary(self):
        c=self.d['conflicts_and_boundaries']['time_field_seconds_mapping']
        self.assertEqual(c['raw_time_values'],[3])
        self.assertEqual(c['evidence'],'SERVER-BOUNDARY')

    def test_probe_module_loads(self):
        spec=importlib.util.spec_from_file_location('s35_probe',PROBE)
        mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        self.assertEqual(len(mod.canonical_rows(MANIFEST)),60)

if __name__=='__main__': unittest.main()
