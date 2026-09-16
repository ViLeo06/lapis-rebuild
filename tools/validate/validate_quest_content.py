#!/usr/bin/env python3
"""Validate the recovered 2.2 Quest.lib content grammar without exporting text."""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'/'extract'))
sys.path.insert(0,str(ROOT/'tools'/'convert'))
from lib_archive import extract
from quest_content import parse_extracted_dir

EXPECTED_NPCS=39
EXPECTED_QUEST_FILES=10
EXPECTED_STEPS=42
EXPECTED_DIALOGUE_LINES=179
EXPECTED_ACTIONS={'CANCEL':161,'SELECT':9,'SCRIPT':9}


def validate(path:Path,out:Path|None=None)->dict:
    with tempfile.TemporaryDirectory(prefix='lapis-quest-validate-') as tmp:
        extracted=Path(tmp)/'quest'
        extract(path,extracted)
        parsed_dir=Path(tmp)/'parsed'
        summary=parse_extracted_dir(extracted,parsed_dir,include_text=False)
    actions={}
    for quest in summary['quests']:
        for name,count in quest['action_counts'].items():actions[name]=actions.get(name,0)+count
    actual={
        'npc_count':summary['npc']['npc_count'],
        'active_npc_entries':summary['npc']['active_entry_count'],
        'disabled_npc_entries':summary['npc']['disabled_entry_count'],
        'quest_files':len(summary['quests']),
        'quest_steps':sum(q['step_count'] for q in summary['quests']),
        'dialogue_lines':sum(q['dialogue_line_count'] for q in summary['quests']),
        'actions':dict(sorted(actions.items())),
        'quest_sources':[q['source'] for q in summary['quests']],
        'evidence':'VERIFIED_STATIC_CONTENT_STRUCTURE',
    }
    expected={'npc_count':EXPECTED_NPCS,'quest_files':EXPECTED_QUEST_FILES,'quest_steps':EXPECTED_STEPS,'dialogue_lines':EXPECTED_DIALOGUE_LINES,'actions':EXPECTED_ACTIONS}
    for key,value in expected.items():
        if actual[key]!=value:raise ValueError(f'{key}: expected {value!r}, got {actual[key]!r}')
    if out:
        out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(actual,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return actual


def main()->int:
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('quest_lib',type=Path);ap.add_argument('--out',type=Path);args=ap.parse_args()
    print(json.dumps(validate(args.quest_lib,args.out),ensure_ascii=False));return 0


if __name__=='__main__':raise SystemExit(main())
