import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'/'convert'))
from tutorial_help import parse_help_script_text,parse_tutorial_text


class TutorialHelpTests(unittest.TestCase):
    def test_tutorial_controls_and_transition(self):
        parsed=parse_tutorial_text(
            '<TALK1>\n<NAME5061>\nhello <CL0><F1></CL>\n<NEXT>\n<RGB154,11,14>\n</TALK><Tutorial_NextStep>\n;999\n',
            'synthetic.txt',
        )
        talk=parsed['talks'][0]
        self.assertEqual(talk['talk_id'],1)
        self.assertEqual(talk['events'][0],{'kind':'speaker','speaker':5061})
        self.assertEqual(talk['events'][1]['kind'],'text')
        self.assertEqual(talk['events'][2],{'kind':'control','command':'NEXT'})
        self.assertEqual(talk['events'][3],{'kind':'control','command':'RGB','value':[154,11,14]})
        self.assertEqual(talk['transition'],{'kind':'Tutorial_NextStep'})
        self.assertEqual(parsed['summary']['control_counts']['NAME'],1)

    def test_tutorial_link_talk_is_explicit_but_semantics_raw(self):
        parsed=parse_tutorial_text('<TALK25>\ntext\n</TALK><LinkTalk_251>\n<TALK251>\ntext\n</TALK>\n')
        self.assertEqual(parsed['talks'][0]['transition'],{'kind':'LinkTalk','target':251})
        self.assertEqual(parsed['summary']['transition_counts'],{'LinkTalk':1})

    def test_tutorial_rejects_nested_duplicate_and_bad_rgb(self):
        with self.assertRaises(ValueError):
            parse_tutorial_text('<TALK1>\n<TALK2>\n')
        with self.assertRaises(ValueError):
            parse_tutorial_text('<TALK1>\na\n</TALK>\n<TALK1>\nb\n</TALK>\n')
        with self.assertRaises(ValueError):
            parse_tutorial_text('<TALK1>\n<RGB256,0,0>\n</TALK>\n')

    def test_help_blocks_steps_and_records(self):
        parsed=parse_help_script_text(
            'HELP1\nSTEP1\n1 0 0 0\nHELP2\nSTEP1\n2 6 103 169\n2 5 238 0\nSTEP2\n2 7 128 169\n;STEP3\n;2 8 1 2\n;999\n'
        )
        self.assertEqual(parsed['summary']['help_count'],2)
        self.assertEqual(parsed['summary']['step_count'],3)
        self.assertEqual(parsed['summary']['record_count'],4)
        self.assertEqual(parsed['helps'][1]['steps'][1]['records'][0],[2,7,128,169])
        self.assertEqual(parsed['summary']['comment_count'],3)

    def test_help_rejects_nonsequential_step_and_bad_record(self):
        with self.assertRaises(ValueError):
            parse_help_script_text('HELP1\nSTEP2\n1 0 0 0\n')
        with self.assertRaises(ValueError):
            parse_help_script_text('HELP1\nSTEP1\n1 2 3\n')


if __name__=='__main__':
    unittest.main()
