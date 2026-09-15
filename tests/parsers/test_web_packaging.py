"""Adversarial tests for the standalone private-preview packaging boundary."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('package_web_preview',ROOT/'tools/package_web_preview.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class PackagingTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);self.dist=self.root/'dist';self.pack=self.root/'pack'
        self.dist.mkdir();self.pack.mkdir()
        (self.dist/'index.html').write_text('<html><head><script type="module" src="./entry.js"></script><link rel="stylesheet" href="./style.css"></head><body><div id="app"></div></body></html>')
        (self.dist/'entry.js').write_text('window.testValue=1;')
        (self.dist/'style.css').write_text('body{margin:0}')
        data=b'{"schema":1}'
        (self.pack/'prototype.json').write_bytes(data)
        self.index={'files':{'prototype.json':{'sha256':hashlib.sha256(data).hexdigest(),'size':len(data)}}}
        self.write_index();self.out=self.root/'preview.html'
    def write_index(self):
        (self.pack/'asset-index.json').write_text(json.dumps(self.index))
    def run_pack(self):return module.package(self.dist,self.pack,self.out)
    def test_packages_inline_and_retains_license(self):
        result=self.run_pack();text=self.out.read_text()
        self.assertEqual(result['visibility'],'private-only')
        self.assertIn('window.__LAPIS_PACK__',text)
        self.assertIn('Phaser Studio',text)
        self.assertNotIn('src="./entry.js"',text)
    def test_body_marker_inside_javascript_is_not_replaced(self):
        js='window.literal="</body>";'
        (self.dist/'entry.js').write_text(js)
        self.run_pack();text=self.out.read_text()
        self.assertIn(js,text)
        self.assertEqual(text.count('Third-party software licenses'),1)
    def test_hash_mismatch(self):
        (self.pack/'prototype.json').write_text('modified')
        with self.assertRaises(ValueError):self.run_pack()
        self.assertFalse(self.out.exists())
    def test_size_mismatch(self):
        self.index['files']['prototype.json']['size']+=1;self.write_index()
        with self.assertRaises(ValueError):self.run_pack()
    def test_escape_is_rejected(self):
        self.index['files']['../outside.json']={'sha256':'x','size':1};self.write_index()
        with self.assertRaises(ValueError):self.run_pack()
    def test_refuses_overwrite(self):
        self.out.write_text('existing')
        with self.assertRaises(FileExistsError):self.run_pack()
        self.assertEqual(self.out.read_text(),'existing')
    def test_external_chunk_rejected(self):
        (self.dist/'entry.js').write_text('import("./chunk.js")')
        with self.assertRaises(ValueError):self.run_pack()
    def test_two_entries_rejected(self):
        p=self.dist/'index.html';p.write_text(p.read_text()+'<script src="extra.js"></script>')
        with self.assertRaises(ValueError):self.run_pack()
    def test_worker_property_is_not_es_import(self):
        (self.dist/'entry.js').write_text('window.importScripts;')
        self.run_pack()

if __name__=='__main__':unittest.main()
