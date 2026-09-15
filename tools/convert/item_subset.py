#!/usr/bin/env python3
"""Export six verified item texts plus explicitly provisional training policy."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
# Roles, free starting ownership and bonuses are laboratory policy, not original balance.
POLICY={1:('weapon','swordsman',4,0),3:('weapon','swordsman',7,0),10:('weapon','wizard',4,0),12:('weapon','wizard',7,0),25:('armor','swordsman',0,2),31:('armor','wizard',0,2)}
def export(source:Path,out:Path):
    if out.exists():raise FileExistsError('Refusing existing output')
    data=source.read_bytes();rows={}
    for line in data.decode('gb18030','strict').splitlines():
        if not line or line.startswith(';'):continue
        r=line.split('\t')
        if not r[0].isdigit() or int(r[0]) not in POLICY:continue
        if len(r)!=55:raise ValueError('Unexpected item column count')
        iid=int(r[0])
        if iid in rows:raise ValueError('Duplicate item ID')
        rows[iid]=r
    if set(rows)!=set(POLICY):raise ValueError('Missing target item rows')
    items=[]
    for iid,(slot,role,attack,defense) in POLICY.items():
        r=rows[iid]
        items.append({'item_id':iid,'name':r[53],'description':r[54],'text_evidence':'VERIFIED','source_row':r,'training':{'slot':slot,'role':role,'attack_bonus':attack,'defense_bonus':defense,'evidence':'UNVERIFIED'}})
    result={'schema':1,'source':'Set.lib/itemtbl.atr','source_sha256':hashlib.sha256(data).hexdigest(),'items':items}
    out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('source',type=Path);ap.add_argument('output',type=Path);a=ap.parse_args();export(a.source,a.output)
