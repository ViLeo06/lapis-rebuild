import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import probe_quest_server_boundary as probe


class QuestServerBoundaryTests(unittest.TestCase):
    def test_fixed_hash_boundary_evidence(self):
        binary = Path(os.environ.get("S4_RETAIL_BINARY", "/mnt/data/s4_next/neodark-unpacked.bin"))
        if not binary.is_file():
            self.skipTest("private fixed-hash research binary not available")
        report = probe.verify(binary)
        self.assertEqual(report["field_interaction_trigger"]["special_types"], [101, 102, 103])
        self.assertEqual(report["field_interaction_trigger"]["special_request"]["bytes"][:3], ["0x49", "0x21", "0x01"])
        self.assertEqual(report["npc_messagebox_binding"]["downlink_opcode"], "0x92")
        self.assertEqual(report["npc_messagebox_binding"]["slot_target_va"], "0x00457de0")
        self.assertIn("0x00494d11", report["quest_authority_boundary"]["quest_loader_direct_call_sites"])
        self.assertEqual(report["quest_authority_boundary"]["quest_state_init_direct_call_sites"], ["0x0048fe00", "0x004907dc", "0x004907f0"])
        self.assertEqual(report["quest_authority_boundary"]["local_exception"]["quest_index"], 0)
        self.assertEqual(report["quest_authority_boundary"]["local_exception"]["step_index"], 13)
        self.assertEqual(report["warp_boundary"]["first_request"]["bytes"], ["0xa4", "0x02"])
        self.assertEqual(report["warp_boundary"]["deferred_request"]["bytes"][:2], ["0xa4", "0x01"])
        self.assertEqual(
            [x["opcode"] for x in report["employ_boundary"]["network_requests"]],
            ["0x4e", "0x4d"],
        )
        self.assertEqual(report["closure"]["status"], "CLIENT_EVIDENCE_BOUNDARY_REACHED")


if __name__ == "__main__":
    unittest.main()
