#!/usr/bin/env python3
"""Validate every Tip sprite library in an extracted hash-pinned client tree."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'/'convert'))
from tip import parse_tip,summarize


def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()


def main()->int:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--client-root',type=Path,required=True)
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--expected-count',type=int,default=27)
    args=ap.parse_args()
    root=args.client_root.resolve()
    if not root.is_dir():raise ValueError(f'not a client root: {root}')
    tips=sorted((p for p in root.rglob('*') if p.is_file() and p.suffix.lower()=='.tip'),key=lambda p:p.relative_to(root).as_posix().lower())
    if len(tips)!=args.expected_count:raise ValueError(f'expected {args.expected_count} Tip files, found {len(tips)}')
    rows=[];run_counts=Counter();flags=Counter();frame_total=0
    for path in tips:
        lib=parse_tip(path);summary=summarize(lib);frame_total+=len(lib.frames);flags[summary['flag']]+=1
        for kind,count in summary['run_counts'].items():run_counts[kind]+=count
        rows.append({
            'path':path.relative_to(root).as_posix(),
            'size':path.stat().st_size,
            'sha256':sha256(path),
            'flag':summary['flag'],
            'canvas':summary['canvas'],
            'frame_count':summary['frame_count'],
            'stream_words':summary['stream_words'],
            'run_counts':summary['run_counts'],
        })
    result={
        'schema':1,
        'evidence':'VERIFIED_STATIC_TIP_STRUCTURE',
        'scope':'All Tip files in the extracted 2.2 client; container and row/run payload sizing only. Run kinds 2/3/4 visual semantics remain UNVERIFIED.',
        'file_count':len(rows),
        'frame_count':frame_total,
        'flag_counts':dict(sorted(flags.items())),
        'run_counts':dict(sorted(run_counts.items(),key=lambda item:int(item[0]))),
        'files':rows,
    }
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'tip_files':len(rows),'frames':frame_total,'flags':result['flag_counts'],'run_counts':result['run_counts'],'out':str(args.out)},ensure_ascii=False));return 0


if __name__=='__main__':raise SystemExit(main())
