#!/usr/bin/env python3
"""Find likely NPC/quest resources in an extracted 2.2 client without executing it.

The probe is deliberately metadata-first. It records paths, hashes, sizes and
keyword hit counts, never source-text excerpts. Text scanning is bounded by
extension, file size and a total byte budget so a malformed client cannot turn
this into an unbounded corpus dump.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

NAME_TOKENS=(
    'npc','quest','mission','dialog','dialogue','dlg','talk','event','scenario',
    'script','story','message','msg','guide','task',
)
CONTENT_TOKENS={
    'npc':['NPC','npc'],
    'quest':['quest','Quest','任务','퀘스트'],
    'dialog':['dialog','Dialog','对话','대화'],
    'mission':['mission','Mission','使命','임무'],
    'reward':['reward','Reward','奖励','보상'],
    'story':['scenario','Scenario','story','Story','剧情'],
}
TEXT_EXTENSIONS={'.txt','.ini','.cfg','.csv','.xml','.json','.lst','.tbl','.atr','.dat','.scr','.lua','.js','.res'}
SKIP_EXTENSIONS={'.exe','.dll','.sys','.ani','.spr','.sgr','.mmf','.smf','.imf','.png','.jpg','.jpeg','.gif','.bmp','.wav','.mp3','.ogg','.zip','.7z','.rar'}
MAX_FILE_BYTES=2*1024*1024
DEFAULT_TOTAL_BYTES=128*1024*1024
MAX_CANDIDATES=250


def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()


def keyword_counts(data:bytes)->dict[str,int]:
    # Old client material mixes GBK/GB18030, CP949 and ASCII. Keep the maximum
    # occurrence count per semantic bucket across decodings rather than adding
    # them, which avoids triple-counting the same byte sequence.
    result={key:0 for key in CONTENT_TOKENS}
    for encoding in ('utf-8','gb18030','cp949'):
        text=data.decode(encoding,errors='ignore')
        for key,tokens in CONTENT_TOKENS.items():
            result[key]=max(result[key],sum(text.count(token) for token in tokens))
    return {key:value for key,value in result.items() if value}


def main()->int:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--client-root',type=Path,required=True)
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--total-byte-budget',type=int,default=DEFAULT_TOTAL_BYTES)
    args=ap.parse_args()
    root=args.client_root.resolve()
    if not root.is_dir():raise ValueError(f'not a client directory: {root}')
    if args.total_byte_budget<0:raise ValueError('negative byte budget')

    files=[p for p in root.rglob('*') if p.is_file()]
    ext_counts=Counter((p.suffix.lower() or '<none>') for p in files)
    top_counts=Counter(p.relative_to(root).parts[0] if p.relative_to(root).parts else '.' for p in files)
    candidates=[];scanned_text=0;scanned_bytes=0

    # Name hits do not spend the text byte budget. Text scanning is limited to
    # plausible text/data extensions and skips known graphics/executable types.
    for path in files:
        rel=path.relative_to(root).as_posix();lower=rel.lower();size=path.stat().st_size;ext=path.suffix.lower()
        name_hits=sorted({token for token in NAME_TOKENS if token in lower})
        content_hits={}
        if ext in TEXT_EXTENSIONS and ext not in SKIP_EXTENSIONS and size<=MAX_FILE_BYTES and scanned_bytes+size<=args.total_byte_budget:
            data=path.read_bytes();scanned_text+=1;scanned_bytes+=size;content_hits=keyword_counts(data)
        score=len(name_hits)*20+sum(min(v,25) for v in content_hits.values())
        if score:
            candidates.append({'path':rel,'size':size,'extension':ext or '<none>','score':score,'name_hits':name_hits,'content_hits':content_hits,'sha256':sha256(path)})

    candidates.sort(key=lambda r:(-r['score'],r['path'].lower()))
    payload={
        'schema':1,
        'evidence':'VERIFIED_STATIC_METADATA_PROBE',
        'scope':'Filename and bounded keyword-count discovery only; no original executable run and no text excerpts exported.',
        'root_name':root.name,
        'file_count':len(files),
        'text_files_scanned':scanned_text,
        'text_bytes_scanned':scanned_bytes,
        'byte_budget':args.total_byte_budget,
        'top_level_counts':dict(sorted(top_counts.items())),
        'extension_counts':dict(sorted(ext_counts.items())),
        'candidate_count':len(candidates),
        'candidates':candidates[:MAX_CANDIDATES],
        'truncated':len(candidates)>MAX_CANDIDATES,
    }
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'files':len(files),'text_files_scanned':scanned_text,'text_bytes_scanned':scanned_bytes,'candidates':len(candidates),'output':str(args.out)},ensure_ascii=False))
    return 0

if __name__=='__main__':raise SystemExit(main())
