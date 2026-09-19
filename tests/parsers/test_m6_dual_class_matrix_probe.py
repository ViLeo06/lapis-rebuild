import csv
import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("probe", ROOT / "tools" / "probe_m6_dual_class_matrix.py")
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)


class MatrixProbeTest(unittest.TestCase):
    def test_csv_visual_inventory_requires_all_200_files(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "files.csv"
            with p.open("w", encoding="utf-8", newline="") as f:
                w = csv.DictWriter(f, fieldnames=["path", "type", "size", "sha256"])
                w.writeheader()
                for cid in probe.TARGET_IDS:
                    for slot in probe.ACTION_SLOTS:
                        for ext in ("ani", "spr"):
                            w.writerow({
                                "path": f"client/Char/B{cid}_{slot}.{ext}",
                                "type": "file",
                                "size": "1236",
                                "sha256": "a" * 64,
                            })
            out = probe.visual_from_csv(p)
            self.assertEqual(len(out), 20)
            self.assertEqual(sum(len(v) for stage in out.values() for v in stage.values()), 200)
            self.assertEqual(out[100]["03"]["ani"]["path"], "client/Char/B100_03.ani")

    def test_known_field_mapping_is_conservative(self):
        row = [str(i) for i in range(46)]
        row[44] = "Stage"
        row[45] = "Description"
        fields = probe.typed_fields(row, probe.ABILITY_FIELDS)
        self.assertEqual(fields["hp"], 2)
        self.assertEqual(fields["str"], 8)
        self.assertEqual(fields["int"], 12)
        self.assertEqual(fields["move_tick_decrement"], 26)
        self.assertEqual(fields["attack_tick_decrement"], 27)
        self.assertEqual(fields["rest_tick_decrement"], 28)
        self.assertEqual(fields["magic_tick_rate"], 29)
        self.assertEqual(fields["authored_exp_field"], 34)
        self.assertEqual(fields["defence"], 37)
        self.assertNotIn("strength", fields)
        self.assertNotIn("intelligence", fields)

    def test_progression_and_item_requirement_schema_preserves_source_boundaries(self):
        self.assertEqual(probe.LEVELABL_COLUMNS[10], "class_link_raw")
        self.assertEqual(probe.LEVELABL_COLUMNS[13], "experience")
        self.assertEqual(probe.LEVELABL_COLUMNS[14], "sub_magic_id")
        self.assertEqual(probe.ITEM_FIELDS[5], "equip_level_requirement")
        self.assertEqual(probe.ITEM_FIELDS[48], "str_requirement")
        self.assertEqual(probe.ITEM_FIELDS[50], "int_requirement")
        self.assertEqual(len(probe.ITEM_CLASS_FLAG_COLUMNS), 10)

    def test_committed_canonical_manifest_is_complete_and_bounded(self):
        manifest = ROOT / "manifests" / "m6-dual-class-ten-stage-matrix.json"
        import json
        data = json.loads(manifest.read_text(encoding="utf-8"))
        stages = [stage for family in data["families"] for stage in family["stages"]]
        self.assertEqual(len(stages), 20)
        self.assertEqual(sum(len(s["progression"]["levels"]) for s in stages), 200)
        self.assertEqual(data["families"][0]["stage_ids"], probe.SWORDSMAN_IDS)
        self.assertEqual(data["families"][1]["stage_ids"], probe.WIZARD_IDS)
        self.assertEqual(len(data["magic_catalog"]), 10)
        self.assertTrue(all(len(s["visual"]["resources"]) == 5 for s in stages))
        self.assertTrue(all(s["ability"]["evidence"] == "VERIFIED-STATIC-ORIGINAL" for s in stages))
        self.assertEqual(data["boundaries"]["promotion_semantics_and_conditions"], "SERVER-BOUNDARY")
        self.assertEqual(data["boundaries"]["server_exp_authority_and_transition"], "SERVER-BOUNDARY")
        self.assertEqual(data["item_requirement_schema"]["final_server_eligibility"], "SERVER-BOUNDARY")
        item1 = data["representative_items"]["1"]
        self.assertEqual(item1["known_authored_fields"]["con_requirement"], 10)
        self.assertEqual(item1["known_authored_fields"]["str_requirement"], 11)
        self.assertIsInstance(item1["class_flag_columns"], dict)
        self.assertEqual(item1["class_flag_columns"]["보"], 1)
        staff = data["representative_items"]["10"]
        self.assertEqual(staff["known_authored_fields"]["int_requirement"], 11)
        self.assertEqual(staff["class_flag_columns"]["마"], 1)

    def test_known_hash_verifier_rejects_wrong_sources(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            for name in probe.EXPECTED_HASHES:
                (root / name).write_text("wrong", encoding="utf-8")
            with self.assertRaises(ValueError):
                probe.verify_known_hashes(root)


if __name__ == "__main__":
    unittest.main()
