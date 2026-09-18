from __future__ import annotations

import hashlib
import json
import struct
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"tools"))

import export_s17_monster_assets as exporter  # noqa:E402


def write_ani(path:Path)->None:
    data=bytearray(1236)
    struct.pack_into("<I",data,0x40,1)
    data[0x44:0x49]=b"Body_"
    struct.pack_into("<I",data,0x84,1)
    for direction in range(8):
        struct.pack_into("<I",data,0x88+direction*128,0)
    struct.pack_into("<f",data,0x488,5.0)
    path.write_bytes(data)


def write_spr(path:Path)->None:
    data=bytearray()
    data+=struct.pack("<I",1)
    data+=struct.pack("<4i",-1,-2,1,0)
    payload=bytearray()
    payload+=struct.pack("<H",2)
    for _ in range(2):
        payload+=struct.pack("<H",1)
        payload+=struct.pack("<HH",0,2)
        payload+=struct.pack("<HH",0xFFFF,0x07E0)
    data+=struct.pack("<I",len(payload))
    data+=payload
    path.write_bytes(data)


def digest(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class S17MonsterAssetExportTests(unittest.TestCase):
    def test_export_verifies_hashes_and_emits_runtime_shape(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            char=root/"client"/"Char"
            char.mkdir(parents=True)
            ani=char/"B4524_03.ani"
            spr=char/"B4524_03.spr"
            write_ani(ani);write_spr(spr)
            row={
                "visual_id":"monster-visual-001",
                "source_numeric_id":4524,
                "manual_visual_descriptor":"synthetic",
                "identity_status":"DESCRIPTIVE_ONLY_NOT_CANONICAL_NAME",
                "direction_rows":8,
                "direction_semantics":"RECOVERED_SECONDARY_BODY_ROW_ORDER_FOR_RUNTIME",
                "row_equivalence_groups_by_slot":{"03":[[0,1],[2,3],[4,5],[6,7]]},
                "death":{"slot":None,"status":"UNVERIFIED","runtime_fallback":"RECONSTRUCTION_POLICY"},
                "available_slots":["03"],
                "source_hashes":{"03":{"ani":digest(ani),"spr":digest(spr)}},
            }
            out=root/"out"
            result=exporter.export_archetype(root/"client",out,row)
            self.assertEqual(result["source_family"],"B4524")
            self.assertIn("03",result["actions"])
            payload=json.loads((out/"monsters"/"monster-visual-001"/"03"/"animation.json").read_text())
            self.assertEqual(payload["frames_per_direction"],1)
            self.assertEqual(payload["directions"],[[0],[0],[0],[0],[0],[0],[0],[0]])
            self.assertEqual(payload["spr_frame_count"],1)
            self.assertTrue((out/"monsters"/"monster-visual-001"/"03"/"frames"/"frame-000.png").is_file())

    def test_hash_mismatch_is_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            char=root/"client"/"Char"
            char.mkdir(parents=True)
            write_ani(char/"B4524_03.ani");write_spr(char/"B4524_03.spr")
            row={
                "visual_id":"monster-visual-001","source_numeric_id":4524,
                "manual_visual_descriptor":"synthetic","identity_status":"DESCRIPTIVE_ONLY_NOT_CANONICAL_NAME",
                "direction_rows":8,"direction_semantics":"RAW_ROWS_UNIVERSAL_ORDER_UNVERIFIED",
                "row_equivalence_groups_by_slot":{"03":[[0,1]]},
                "death":{"slot":None,"status":"UNVERIFIED","runtime_fallback":"RECONSTRUCTION_POLICY"},
                "available_slots":["03"],"source_hashes":{"03":{"ani":"0"*64,"spr":"0"*64}},
            }
            with self.assertRaisesRegex(ValueError,"hash mismatch"):
                exporter.export_archetype(root/"client",root/"out",row)


if __name__=="__main__":
    unittest.main()
