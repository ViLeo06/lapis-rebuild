import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'/'convert'))
from quest_content import parse_npc_script_text,parse_quest_text


class QuestContentTests(unittest.TestCase):
    def test_quest_steps_speaker_and_commands(self):
        parsed=parse_quest_text(
            'STEP1\nNAME\n5000\nCANCEL\nhello\nSELECT\nchoose\n\n'
            'STEP2\nNAME\nID\nSCRIPT\naccepted\n;999\n',
            'synthetic.txt',
        )
        self.assertEqual(parsed['summary']['step_count'],2)
        self.assertEqual(parsed['summary']['dialogue_line_count'],3)
        self.assertEqual(parsed['summary']['action_counts'],{'CANCEL':1,'SCRIPT':1,'SELECT':1})
        self.assertEqual(parsed['steps'][0]['events'][1]['speaker'],5000)
        self.assertEqual(parsed['steps'][1]['events'][1]['speaker'],'ID')

    def test_quest_rejects_non_sequential_steps(self):
        with self.assertRaises(ValueError):
            parse_quest_text('STEP1\nNAME\n1\nCANCEL\na\nSTEP3\nNAME\n1\nCANCEL\nb\n')

    def test_npc_declared_count_excludes_disabled_entries(self):
        parsed=parse_npc_script_text(
            '11,2,Synthetic NPC\n'
            '1,150,17,200,12,greeting\n'
            ';2,150,35,200,12,disabled choice\n'
            '2,150,53,200,12,active choice\n'
            ';999\n'
        )
        npc=parsed['npcs'][0]
        self.assertEqual(npc['npc_id'],11)
        self.assertEqual(npc['active_entry_count'],2)
        self.assertEqual(npc['disabled_entry_count'],1)
        self.assertEqual(parsed['summary']['record_types'],[1,2])

    def test_npc_text_may_contain_commas(self):
        parsed=parse_npc_script_text('12,1,Vendor\n1,150,17,200,12,hello, traveler\n')
        self.assertEqual(parsed['npcs'][0]['entries'][0]['text'],'hello, traveler')

    def test_npc_rejects_declared_count_mismatch(self):
        with self.assertRaises(ValueError):
            parse_npc_script_text('13,2,Broken\n1,150,17,200,12,only one\n')


if __name__=='__main__':
    unittest.main()
