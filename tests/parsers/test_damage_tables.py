from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

import probe_damage_tables as damage_tables


class DamageTableProbeTests(unittest.TestCase):
    def test_structural_probe_never_claims_formula(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "ability.atr").write_bytes(
                ";id\thp\thit\tblow\n100\t125\t160\t2\n109\t100\t160\t2\n".encode(
                    "gb18030"
                )
            )
            (root / "itemtbl.atr").write_bytes(
                ";id\tmin_damage\tmax_damage\n1\t85\t95\n".encode("gb18030")
            )
            (root / "Magictbl.atr").write_bytes(
                ";Num\tAtt\tEA\n1101\t8\t40\n".encode("gb18030")
            )
            (root / "Magicptn.atr").write_bytes(
                ";id\tStartTick\tHItFrame\n1\t0\t11\n".encode("cp949")
            )
            (root / "solskill.atr").write_bytes(
                ";row\n21101 synthetic\n".encode("cp949")
            )

            report = damage_tables.build_report(root)
            self.assertEqual(report["formula_claim"], "NONE")
            self.assertEqual(len(report["tables"]), 5)
            ability = report["tables"][0]
            self.assertEqual(ability["dominant_width"], 4)
            self.assertEqual(
                ability["header_candidates"][0]["fields"],
                ["id", "hp", "hit", "blow"],
            )
            # Ensure the payload remains ordinary JSON and does not depend on
            # source files after the report has been produced.
            json.loads(json.dumps(report))

    def test_missing_member_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(FileNotFoundError):
                damage_tables.build_report(Path(tmp))


if __name__ == "__main__":
    unittest.main()
