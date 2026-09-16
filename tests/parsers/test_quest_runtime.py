import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import probe_quest_runtime as probe


class QuestRuntimeProbeTests(unittest.TestCase):
    def test_metadata_omits_dialogue_and_keeps_ids(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root / "Quest0.txt").write_bytes(
                "STEP1\nNAME\n5003\nSELECT\nsecret choice text\nSCRIPT\nsecret script text\n"
                "STEP2\nNAME\nID\nCANCEL\nsecret cancel text\n;999\n".encode("gb18030")
            )
            (root / "NPCScript.txt").write_bytes(
                "11,1,Hidden Name\n1,150,17,200,12,secret npc text\n;999\n".encode("gb18030")
            )
            meta = probe.source_metadata(root)
            dumped = repr(meta)
            self.assertEqual(meta["quest_speaker_numeric_ids"], [5003])
            self.assertEqual(meta["quest_speaker_non_numeric_tokens"], ["ID"])
            self.assertEqual(meta["quest_action_counts"], {"CANCEL": 1, "SCRIPT": 1, "SELECT": 1})
            self.assertEqual(meta["npc_script"]["npc_ids"], [11])
            self.assertNotIn("secret", dumped)
            self.assertNotIn("Hidden Name", dumped)

    def test_entity_match_is_explicit_raw_equality_only(self):
        candidates = {11: ["npc_script_block_id"], 5003: ["quest_speaker_numeric_id"]}
        rows = probe.match_entity_records(
            7,
            [
                {"x": 10, "y": 20, "kind": 3, "object_id": 5003, "name": "entity-a", "layer": 1, "flags": 0},
                {"x": 30, "y": 40, "kind": 11, "object_id": 77, "name": "entity-b", "layer": 2, "flags": 4},
                {"x": 50, "y": 60, "kind": 9, "object_id": 88, "name": "entity-c", "layer": 0, "flags": 0},
            ],
            candidates,
        )
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["evidence"], "RAW_NUMERIC_EQUALITY_ONLY")
        self.assertEqual(rows[0]["relations"][0]["record_field"], "object_id")
        self.assertEqual(rows[1]["relations"][0]["record_field"], "kind")
        self.assertNotIn("name", rows[0])
        self.assertIn("name_sha256", rows[0])

    def test_binary_fixed_hash_and_dispatch_evidence(self):
        binary = Path(os.environ.get("S4_RETAIL_BINARY", "/mnt/data/s4_artifacts/binary/neodark-unpacked.bin"))
        if not binary.is_file():
            self.skipTest("private fixed-hash research binary not available")
        report = probe.verify_binary(binary)
        self.assertEqual(report["quest_transport"]["downlink"]["receive_opcode"], "0x2b")
        self.assertEqual(report["quest_transport"]["uplink"]["size_bytes"], 8)
        self.assertEqual(report["npc_script_runtime"]["record_rect_import"]["name"], "SetRect")
        tokens = {row["token"]: row["type_id"] for row in report["quest_parser"]["command_tokens"]}
        self.assertEqual(tokens, {"SCRIPT": 0, "SELECT": 1, "NAME": 2, "INVENTORY": 3, "CANCEL": 4, "REPAIR": 5})


if __name__ == "__main__":
    unittest.main()
