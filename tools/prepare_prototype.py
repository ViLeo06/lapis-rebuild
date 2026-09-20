#!/usr/bin/env python3
"""Build private/generated assets for the first Godot prototype.

Inputs are extracted original resources kept outside Git. Outputs are derived
PNGs/JSON under game/generated (also excluded from Git). This keeps the public
code/data tree separated from copyright-sensitive original assets.
"""
from __future__ import annotations
import argparse,json,sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'convert'))
from ani import parse_ani,validate_frame_indices
from spr import parse_spr,export_spr
from map_bundle import parse_imf
from render_map import render

CHARACTERS={**{cid:'swordsman' for cid in range(100,191,10)},**{cid:'wizard' for cid in range(109,200,10)}}
ACTIONS=['00','01','02','03','05']


def find_ci(root:Path,name:str)->Path:
    hits=[p for p in root.iterdir() if p.is_file() and p.name.lower()==name.lower()]
    if len(hits)!=1: raise FileNotFoundError(f'expected exactly one {name} in {root}, got {len(hits)}')
    return hits[0]


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--char-dir',type=Path,required=True)
    ap.add_argument('--sgres-dir',type=Path,required=True)
    ap.add_argument('--out',type=Path,required=True)
    args=ap.parse_args(); args.out.mkdir(parents=True,exist_ok=True)
    manifest={'schema':1,'characters':{},'map':{}}
    for cid,label in CHARACTERS.items():
        c={'class_id':cid,'label':label,'actions':{}}
        for action in ACTIONS:
            base=f'B{cid:03d}_{action}'
            ani_path=find_ci(args.char_dir,base+'.ani'); spr_path=find_ci(args.char_dir,base+'.spr')
            ani=parse_ani(ani_path); spr=parse_spr(spr_path); errors=validate_frame_indices(ani,spr.frame_count)
            if errors: raise ValueError(f'{base}: '+errors[0])
            rel=Path('characters')/f'B{cid:03d}'/action
            export_spr(spr,args.out/rel/'frames')
            action_payload={
                'action_slot':action,'frames_per_direction':ani.frames_per_direction,
                'raw_timing':ani.raw_timing,'directions':ani.directions,
                'spr_frame_count':spr.frame_count,'frame_bounds':[
                    {'index':f.index,'left':f.left,'top':f.top,'right':f.right,'bottom':f.bottom}
                    for f in spr.frames
                ],
            }
            (args.out/rel/'animation.json').write_text(json.dumps(action_payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            c['actions'][action]={'animation':(rel/'animation.json').as_posix(),'frames_dir':(rel/'frames').as_posix()}
        manifest['characters'][str(cid)]=c
    map_png=args.out/'maps'/'map-0000.png'; map_png.parent.mkdir(parents=True,exist_ok=True)
    render_result=render(args.sgres_dir,0,map_png)
    imf=parse_imf(find_ci(args.sgres_dir,'sz-0000.imf'))
    collision={'width':imf['width'],'height':imf['height'],'grid_order':imf['grid_order'],'grid':imf['grid'],'sparse_records':imf['sparse_records']}
    collision_path=args.out/'maps'/'map-0000-collision.json';collision_path.write_text(json.dumps(collision,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    manifest['map']={'id':0,'name':'对练场','png':'maps/map-0000.png','collision':'maps/map-0000-collision.json','render':render_result}
    (args.out/'prototype.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'output':str(args.out),'characters':list(CHARACTERS),'map':render_result},ensure_ascii=False))

if __name__=='__main__':main()
