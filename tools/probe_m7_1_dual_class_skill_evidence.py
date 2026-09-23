#!/usr/bin/env python3
"""Validate S35 fixed-hash Magictbl rows against the committed 60-row authority."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

MAGICTBL_SHA256='d885bbd1bddffd3d4bf05b2b4e36232c62d94fc78209d46861b01986779ef0d9'
FIELDS=['skill_id','name','att','dist','area','mp','time','team','unit','ea','eb','ec','tick','lvpt','magic_ptn','icon','iter','explanation']
NUM=set(FIELDS)-{'name','explanation'}
RANGES=((1101,1106),(1201,1206),(1301,1306),(1401,1406),(1501,1506),(19101,19106),(19201,19206),(19301,19306),(19401,19406),(19501,19506))

def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def target(sid:int)->bool:
    return any(a<=sid<=b for a,b in RANGES)

def parse(path:Path):
    out=[]
    for line in path.read_bytes().decode('gb18030','replace').splitlines():
        line=line.strip('\ufeff\r\n')
        if not line or line.startswith(';'): continue
        p=line.split('\t')
        if len(p)<18: continue
        try: sid=int(p[0])
        except ValueError: continue
        if not target(sid): continue
        out.append({k:(int(v) if k in NUM else v) for k,v in zip(FIELDS,p[:18])})
    return sorted(out,key=lambda r:r['skill_id'])

def canonical_rows(manifest:Path):
    d=json.loads(manifest.read_text(encoding='utf-8'))
    return [{k:r[k] for k in FIELDS} for r in d['rows']]

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--magictbl',type=Path)
    ap.add_argument('--manifest',type=Path,default=Path('manifests/m7-1-dual-class-skill-evidence.json'))
    ap.add_argument('--allow-unpinned',action='store_true')
    a=ap.parse_args()
    d=json.loads(a.manifest.read_text(encoding='utf-8'))
    assert d['row_count']==60 and len(d['rows'])==60
    if a.magictbl:
        actual=sha256(a.magictbl)
        if not a.allow_unpinned and actual!=MAGICTBL_SHA256:
            raise SystemExit(f'Magictbl SHA-256 mismatch: {actual}')
        got=parse(a.magictbl); exp=canonical_rows(a.manifest)
        if got!=exp: raise SystemExit('S35 raw-row mismatch')
        print(json.dumps({'status':'ok','rows':len(got),'magictbl_sha256':actual},ensure_ascii=False))
    else:
        print(json.dumps({'status':'ok','rows':len(d['rows']),'manifest':str(a.manifest)},ensure_ascii=False))
    return 0

if __name__=='__main__': raise SystemExit(main())
