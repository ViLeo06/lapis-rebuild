import struct
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'/'convert'))
from tip import MAGIC,parse_tip,summarize


def run_words(kind,length,payload):
    return [(kind<<12)|length,*payload]


def make_tip(rows,width,flag=0x0600):
    stream=[]
    for runs in rows:
        stream.append(len(runs))
        for kind,length,payload in runs:
            stream.extend(run_words(kind,length,payload))
    offsets=[0,len(stream)]
    header=bytearray()
    header.extend(MAGIC)
    header.extend(struct.pack('<H',flag))
    header.extend(b'\0'*9)
    header.extend(struct.pack('<HH',width,len(rows)))
    header.extend(bytes((0x20,0x08)))
    header.extend(struct.pack('<I',1))
    header.extend(struct.pack('<2I',*offsets))
    pixels=struct.pack('<'+'H'*len(stream),*stream)
    tail=struct.pack('<I4i',1,0,0,len(rows),width)
    return bytes(header)+pixels+tail


class TipTests(unittest.TestCase):
    def write(self,data):
        tmp=tempfile.TemporaryDirectory();path=Path(tmp.name)/'fixture.Tip';path.write_bytes(data);return tmp,path

    def test_all_recovered_run_kinds_and_payload_sizes(self):
        rows=[[
            (0,2,[]),
            (2,3,[0x1234]),
            (1,2,[0x1111,0x2222]),
            (3,2,[1,2,3,4]),
            (4,3,[0xaaaa,0xbbbb]),
        ]]
        tmp,path=self.write(make_tip(rows,12))
        try:
            lib=parse_tip(path);runs=lib.frames[0].rows[0].runs
            self.assertEqual([(r.kind,r.length,len(r.payload)) for r in runs],[(0,2,0),(2,3,1),(1,2,2),(3,2,4),(4,3,2)])
            self.assertEqual(runs[1].payload,(0x1234,))
            summary=summarize(lib)
            self.assertEqual(summary['run_counts'],{'0':1,'1':1,'2':1,'3':1,'4':1})
        finally:tmp.cleanup()

    def test_rows_must_exactly_cover_descriptor_width(self):
        tmp,path=self.write(make_tip([[(0,4,[])]],5))
        try:
            with self.assertRaisesRegex(ValueError,'run width 4 != 5'):parse_tip(path)
        finally:tmp.cleanup()

    def test_kind2_consumes_one_word_even_for_long_run(self):
        tmp,path=self.write(make_tip([[(2,20,[0x07e0])]],20,flag=0x0200))
        try:
            run=parse_tip(path).frames[0].rows[0].runs[0]
            self.assertEqual(run.length,20);self.assertEqual(run.payload,(0x07e0,))
        finally:tmp.cleanup()

    def test_unknown_kind_rejected(self):
        tmp,path=self.write(make_tip([[(5,1,[])]],1))
        try:
            with self.assertRaisesRegex(ValueError,'unsupported TIP run kind 5'):parse_tip(path)
        finally:tmp.cleanup()

    def test_bad_offset_table_rejected(self):
        data=bytearray(make_tip([[(0,1,[])]],1))
        struct.pack_into('<I',data,0x25,1)
        tmp,path=self.write(bytes(data))
        try:
            with self.assertRaisesRegex(ValueError,'invalid TIP frame offsets'):parse_tip(path)
        finally:tmp.cleanup()

    def test_trailing_data_rejected(self):
        tmp,path=self.write(make_tip([[(0,1,[])]],1)+b'junk')
        try:
            with self.assertRaisesRegex(ValueError,'TIP size mismatch'):parse_tip(path)
        finally:tmp.cleanup()


if __name__=='__main__':unittest.main()
