from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import probe_dual_class_matrix as mod


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class DualClassMatrixTests(unittest.TestCase):
    def fixture(self, root: Path) -> tuple[Path, Path]:
        setlib = root / "setlib"
        client = root / "client"
        (client / "Char").mkdir(parents=True)
        setlib.mkdir()
        ability_rows = []
        for cid in mod.TARGET_IDS:
            r = ["0"] * 46
            r[0] = str(cid); r[1] = str(cid); r[2] = str(100 + cid % 20); r[3] = str(120 + cid % 20)
            for i, v in {4:10,5:100,6:10,7:100,8:10,9:100,10:10,11:100,12:10,13:100,14:10,15:100,16:20,17:5,18:160,19:2,20:2,21:160,22:5,23:1,24:0,25:0,26:6,27:4,28:5,29:100,30:4,31:10,32:5,33:100,34:100,35:0,36:0,37:5,38:0,39:0,40:0,41:0,42:0,43:2}.items(): r[i]=str(v)
            r[44] = f"class-{cid}"; r[45] = f"stage-{cid}"
            ability_rows.append("\t".join(r))
        (setlib / "ability.atr").write_bytes(("\n".join(ability_rows)+"\n").encode("gb18030"))

        level_rows=[]; magic_rows=[]
        for idx,cid in enumerate(mod.TARGET_IDS):
            skill = (1000+cid) if idx % 10 < 5 else 0
            row=["0"]*17; row[0]=str(cid); row[1]="1"; row[14]=str(skill); level_rows.append("\t".join(row))
            if skill:
                m=[str(skill),f"skill-{skill}","8","1","0","20","3","34","3","40","10","5","10","1","1","0","1",f"desc-{skill}"]
                magic_rows.append("\t".join(m))
        (setlib / "levelabl.atr").write_bytes(("\n".join(level_rows)+"\n").encode("cp949"))
        (setlib / "Magictbl.atr").write_bytes(("\n".join(magic_rows)+"\n").encode("gb18030"))
        for cid in mod.TARGET_IDS:
            for slot in mod.ACTION_SLOTS:
                for ext in ("ani","spr"):
                    (client / "Char" / f"B{cid}_{slot}.{ext}").write_bytes(f"{cid}-{slot}-{ext}".encode())
        return setlib,client

    def test_builds_twenty_stage_matrix_without_inventing_server_rules(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            setlib,client=self.fixture(Path(td))
            with mock.patch.object(mod,"ABILITY_SHA256",sha(setlib/"ability.atr")), mock.patch.object(mod,"MAGIC_SHA256",sha(setlib/"Magictbl.atr")):
                data=mod.build_matrix(setlib,client_root=client)
            stages=[s for f in data["families"] for s in f["stages"]]
            self.assertEqual(len(stages),20)
            self.assertEqual(data["families"][0]["stage_ids"],mod.SWORDSMAN_IDS)
            self.assertEqual(data["families"][1]["stage_ids"],mod.WIZARD_IDS)
            self.assertTrue(all(len(s["visual"]["resources"])==10 for s in stages))
            self.assertEqual(stages[0]["authored"]["move_tick_cost"],6)
            self.assertEqual(stages[0]["authored"]["attack_tick_cost"],4)
            self.assertEqual(stages[0]["authored"]["rest_tick_cost"],5)
            self.assertEqual(stages[0]["authored"]["magic_tick_rate"],100)
            self.assertEqual(stages[0]["equipment"]["evidence"],"SERVER-BOUNDARY")
            self.assertIsNone(stages[0]["promotion"]["retail_level_requirement"])
            self.assertEqual(data["item_requirement_schema"]["stat_requirement_columns"]["str"],48)
            json.loads(json.dumps(data))

    def test_missing_visual_resource_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            setlib,client=self.fixture(Path(td))
            (client/"Char"/"B100_03.spr").unlink()
            with mock.patch.object(mod,"ABILITY_SHA256",sha(setlib/"ability.atr")), mock.patch.object(mod,"MAGIC_SHA256",sha(setlib/"Magictbl.atr")):
                with self.assertRaises(FileNotFoundError): mod.build_matrix(setlib,client_root=client)


if __name__ == "__main__":
    unittest.main()
