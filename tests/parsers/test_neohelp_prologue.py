import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'/'convert'))
from neohelp_prologue import parse_neohelp_text,parse_prologue_text


class NeohelpPrologueTests(unittest.TestCase):
    def test_neohelp_sections_keep_raw_numeric_semantics(self):
        parsed=parse_neohelp_text(
            ';\n0 2\n0 1 -1 15 Help\n0 2 1 2 Child\n1 1\n1 1 0 13 Back\n;999\n',
            'synthetic.txt',
        )
        self.assertEqual(parsed['summary']['section_count'],2)
        self.assertEqual(parsed['summary']['record_count'],3)
        self.assertTrue(parsed['summary']['nonnegative_third_fields_reference_existing_sections'])
        self.assertEqual(parsed['sections'][0]['records'][1]['raw_numeric'],[0,2,1,2])
        self.assertEqual(parsed['summary']['fourth_field_counts'],{'2':1,'13':1,'15':1})

    def test_neohelp_allows_duplicate_second_field_but_not_wrong_section(self):
        parsed=parse_neohelp_text('1 2\n1 4 -1 1 first\n1 4 -1 4 continuation\n;999\n')
        self.assertEqual(parsed['sections'][0]['records'][0]['raw_numeric'][1],4)
        self.assertEqual(parsed['sections'][0]['records'][1]['raw_numeric'][1],4)
        with self.assertRaises(ValueError):
            parse_neohelp_text('1 1\n2 1 -1 1 wrong\n;999\n')

    def test_neohelp_rejects_truncation_and_unknown_trailing_text(self):
        with self.assertRaises(ValueError):
            parse_neohelp_text('0 2\n0 1 -1 1 only\n')
        with self.assertRaises(ValueError):
            parse_neohelp_text('0 1\n0 1 -1 1 ok\nnot a header\n')

    def test_prologue_preserves_order_and_blank_lines(self):
        parsed=parse_prologue_text('Title\n\nFirst line\n;999\n')
        self.assertEqual([row['text'] for row in parsed['lines']],['Title','','First line'])
        self.assertEqual(parsed['summary']['nonempty_line_count'],2)

    def test_prologue_requires_final_marker(self):
        with self.assertRaises(ValueError):
            parse_prologue_text('Title\n')


if __name__=='__main__':unittest.main()
