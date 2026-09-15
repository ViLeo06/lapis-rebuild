#!/usr/bin/env python3
"""Validate hash-pinned Quest.lib members and extended text grammars.

This performs static extraction only. Output contains structural counts and
hashes, not original dialogue/story text.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'/'extract'))
sys.path.insert(0,str(ROOT/'tools'/'convert'))
from lib_archive import extract
from tutorial_help import parse_file as parse_tutorial_help_file
from neohelp_prologue import parse_file as parse_neohelp_prologue_file


def digest(path:Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()


def find_ci(root:Path,name:str)->Path:
    hits=[p for p in root.iterdir() if p.is_file() and p.name.lower()==name.lower()]
    if len(hits)!=1:raise FileNotFoundError(f'expected exactly one {name}, got {len(hits)}')
    return hits[0]


def main()->int:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('quest_lib',type=Path)
    ap.add_argument('--baseline',type=Path,default=ROOT/'manifests/content-source-baseline.json')
    ap.add_argument('--out',type=Path,required=True)
    args=ap.parse_args()
    baseline=json.loads(args.baseline.read_text(encoding='utf-8'))
    expected_archive=baseline['files']['NRes/Quest.lib']
    actual_archive=digest(args.quest_lib)
    if actual_archive!=expected_archive:raise ValueError(f'Quest.lib hash mismatch: {actual_archive}')
    with tempfile.TemporaryDirectory(prefix='lapis-quest-validate-') as tmp_name:
        tmp=Path(tmp_name);check,manifest=extract(args.quest_lib,tmp)
        expected_members=baseline['quest_lib']['members']
        actual_names={row['name'] for row in manifest}
        if {name.lower() for name in actual_names}!={name.lower() for name in expected_members}:raise ValueError('Quest.lib member set differs from baseline')
        checked={}
        for expected_name,meta in expected_members.items():
            path=find_ci(tmp,expected_name);sha=digest(path)
            if path.stat().st_size!=meta['size'] or sha!=meta['sha256']:raise ValueError(f'{expected_name}: member fingerprint mismatch')
            checked[expected_name]={'size':path.stat().st_size,'sha256':sha}
        tutorial=parse_tutorial_help_file(find_ci(tmp,'Tutorial.txt'),'tutorial')
        help_script=parse_tutorial_help_file(find_ci(tmp,'HelpScript.txt'),'help')
        neohelp=parse_neohelp_prologue_file(find_ci(tmp,'Neohelp.txt'),'neohelp')
        prologue=parse_neohelp_prologue_file(find_ci(tmp,'Prologue.txt'),'prologue')
    result={
        'schema':1,
        'evidence':'VERIFIED_STATIC_CONTENT_STRUCTURE',
        'scope':'Hash-pinned Quest.lib; structural counts/hashes only; no original executable run and no text excerpts exported.',
        'quest_lib_sha256':actual_archive,
        'quest_lib_check':f'0x{check:08x}',
        'member_count':len(checked),
        'tutorial':tutorial['summary'],
        'help_script':help_script['summary'],
        'neohelp':neohelp['summary'],
        'prologue':prologue['summary'],
    }
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'tutorial_talks':result['tutorial']['talk_count'],'help_blocks':result['help_script']['help_count'],'neohelp_sections':result['neohelp']['section_count'],'neohelp_records':result['neohelp']['record_count'],'prologue_nonempty_lines':result['prologue']['nonempty_line_count'],'out':str(args.out)},ensure_ascii=False));return 0


if __name__=='__main__':raise SystemExit(main())
