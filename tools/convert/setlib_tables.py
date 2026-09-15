#!/usr/bin/env python3
"""Export reconstruction-focused class/skill data from extracted Set.lib members.

Set.lib is extracted with tools/extract/lib_archive.py. The localized client
uses different encodings per table: class/skill display text is GB18030 while
Magicptn.atr retains Korean CP949 labels. Source tables remain the raw evidence;
generated JSON intentionally keeps only typed fields needed by the rebuild.
"""
from __future__ import annotations
import argparse,json
from pathlib import Path

SWORDSMAN_IDS=list(range(100,191,10))
WIZARD_IDS=list(range(109,200,10))
MVP_SKILLS=[1101,1201,1301,19101,19201,19301]


def rows(path:Path,encoding:str):
    out=[]
    for line in path.read_bytes().decode(encoding,'replace').splitlines():
        line=line.strip('\ufeff\r\n')
        if not line or line.startswith(';'): continue
        out.append(line.split('\t'))
    return out


def parse_classes(root:Path):
    wanted=set(SWORDSMAN_IDS+WIZARD_IDS);result={}
    for r in rows(root/'ability.atr','gb18030'):
        if len(r)<46: continue
        try: cid=int(r[0])
        except ValueError: continue
        if cid not in wanted: continue
        result[cid]={
            'class_id':cid,'portrait_id':int(r[1]),'hp':int(r[2]),'mp':int(r[3]),
            'move':int(r[17]),'hit':int(r[18]),'magic_hit':int(r[21]),'range':int(r[23]),
            'class_name_raw':r[44],'class_description_raw':r[45],
        }
    first_skill={}
    for r in rows(root/'levelabl.atr','cp949'):
        if len(r)<17: continue
        try: cid,level=int(r[0]),int(r[1])
        except ValueError: continue
        if cid in wanted and level==1: first_skill[cid]=int(r[14])
    for cid,item in result.items(): item['stage_entry_skill_id']=first_skill.get(cid,0)
    return result


def parse_magic_patterns(root:Path):
    result={}
    for r in rows(root/'Magicptn.atr','cp949'):
        if len(r)<25: continue
        try: pid=int(r[0])
        except ValueError: continue
        refs=[]
        for role,col,draw_col,start_col,kind_col in [
            ('phase1_front',2,3,6,7),('phase1_back',4,5,6,7),
            ('phase2_front',8,9,12,13),('phase2_back',10,11,12,13),
            ('phase3_front',14,15,18,19),('phase3_back',16,17,18,19)]:
            resource=int(r[col])
            if resource>=0:
                refs.append({'role':role,'magic_resource_id':resource,'draw_type':int(r[draw_col]),'start_tick':int(r[start_col]),'kind':int(r[kind_col])})
        result[pid]={
            'pattern_id':pid,'pattern_name_ko':r[1],'magic_resources':refs,
            'hit_frame':int(r[20]),'special_motion':int(r[21]),'burst_speed':int(r[22]),
            'screen_shake':int(r[23]),'sound_id':int(r[24]),
        }
    return result


def parse_skills(root:Path,patterns:dict):
    result={}
    for r in rows(root/'Magictbl.atr','gb18030'):
        if len(r)<18: continue
        try: sid=int(r[0])
        except ValueError: continue
        if sid not in MVP_SKILLS: continue
        pid=int(r[14])
        result[sid]={
            'skill_id':sid,'name':r[1],'attack_type':int(r[2]),'distance':int(r[3]),'area':int(r[4]),
            'mp_cost':int(r[5]),'time_raw':int(r[6]),'team_mask':int(r[7]),'unit_mask':int(r[8]),
            'effect_a':int(r[9]),'effect_b':int(r[10]),'effect_c':int(r[11]),'tick':int(r[12]),
            'skill_level':int(r[13]),'magic_pattern_id':pid,'icon_index':int(r[15]),'iteration':int(r[16]),
            'explanation':r[17],'magic_pattern':patterns.get(pid),
        }
    return result


def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('setlib_dir',type=Path);ap.add_argument('output_dir',type=Path);a=ap.parse_args()
    classes=parse_classes(a.setlib_dir);patterns=parse_magic_patterns(a.setlib_dir);skills=parse_skills(a.setlib_dir,patterns)
    a.output_dir.mkdir(parents=True,exist_ok=True)
    payloads={
        'classes/swordsman.json':[classes[c] for c in SWORDSMAN_IDS],
        'classes/wizard.json':[classes[c] for c in WIZARD_IDS],
        'skills/mvp.json':[skills[s] for s in MVP_SKILLS],
    }
    for rel,payload in payloads.items():
        p=a.output_dir/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(p)

if __name__=='__main__': main()
