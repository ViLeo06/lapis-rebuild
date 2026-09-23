import ast
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

def assignment(name:str):
    tree=ast.parse((ROOT/'tools/prepare_web.py').read_text(encoding='utf-8'))
    for node in tree.body:
        if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in node.targets):
            return ast.literal_eval(node.value)
    raise AssertionError(f'missing assignment {name}')

class M7WebPackSourcesTest(unittest.TestCase):
    def test_story_battle_maps_and_reviewed_visuals_are_packaged(self):
        maps=assignment('WEB_MAPS')
        visuals=assignment('WEB_VISUALS')
        required={1,3,9,11,13,15,21,23,31,41,51,61,71,81,91}
        self.assertTrue(required.issubset(maps))
        self.assertTrue({4023,4524,4525,4526,4544}.issubset(visuals))

    def test_fixed_source_baseline_covers_every_training_map_triplet_and_visual(self):
        baseline=json.loads((ROOT/'manifests/web-source-baseline.json').read_text(encoding='utf-8'))
        lower={key.lower():value for key,value in baseline['files'].items()}
        for zone in [1,3,9,11,13,15,21,23,31,41,51,61,71,81,91]:
            for ext in ('imf','mmf','smf'):
                key=f'sgres/sz-{zone:04d}.{ext}'
                self.assertRegex(lower[key],r'^[0-9a-f]{64}$')
        for visual in (4023,4524,4525,4526,4544):
            for slot in ('00','01','02','03'):
                for ext in ('ani','spr'):
                    key=f'char/b{visual}_{slot}.{ext}'
                    self.assertRegex(lower[key],r'^[0-9a-f]{64}$')
        policy=baseline['m7_training_pack']
        self.assertEqual(policy['evidence'],'VERIFIED-STATIC-ORIGINAL')
        self.assertEqual(policy['source_inventory_sha256'],'ccef8ede9627a27f167c63d0896c32c006b12de49af068f466199808b2f849ce')

if __name__=='__main__':
    unittest.main()
