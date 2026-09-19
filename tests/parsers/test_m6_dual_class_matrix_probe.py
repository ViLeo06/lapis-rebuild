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

    def test_known_hash_verifier_rejects_wrong_sources(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            for name in probe.EXPECTED_HASHES:
                (root / name).write_text("wrong", encoding="utf-8")
            with self.assertRaises(ValueError):
                probe.verify_known_hashes(root)


if __name__ == "__main__":
    unittest.main()
