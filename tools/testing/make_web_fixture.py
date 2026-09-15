#!/usr/bin/env python3
"""Generate synthetic assets for CI, never disguised as original game art."""
from pathlib import Path
import argparse,json,sys,hashlib
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools/convert'))
from spr import write_png

def generate(out:Path):
    if out.exists():raise FileExistsError('Refusing existing pack')
    out.mkdir(parents=True)
    manifest={'schema':1,'provenance':{'kind':'synthetic','evidence':'VERIFIED'},'characters':{},'map':{'id':0,'name':'Synthetic fixture','png':'maps/map.png','collision':'maps/collision.json','inspector':'maps/inspector.json','render':{'width':1536,'height':768}}}
    write_png(out/'maps/map.png',1536,768,bytes((38,62,52,255))*(1536*768))
    grid=[1 if (x+y)%2==0 and 2<x<44 and 2<y<44 else 0 for x in range(47) for y in range(47)]
    (out/'maps/collision.json').write_text(json.dumps({'width':47,'height':47,'grid_order':'first-major','grid':grid}))
    (out/'maps/inspector.json').write_text(json.dumps({'width':24,'height':24,'cells':[{'resource_id':1,'directory_path':[0,0,0,0]}]*576}))
    for cid,label,color in [(100,'swordsman',(205,185,110,255)),(109,'wizard',(136,139,196,255))]:
        char={'class_id':cid,'label':label,'actions':{}}
        for action in ['00','01','02','03','05']:
            n=11 if cid==109 and action=='05' else 4
            rel=f'characters/B{cid}/{action}';bounds=[]
            for i in range(n*8):
                left=-12-i%2;bounds.append({'index':i,'left':left,'top':-42,'right':12,'bottom':2})
                write_png(out/f'{rel}/frames/frame-{i:03d}.png',12-left,44,bytes(color)*(12-left)*44)
            anim={'action_slot':action,'frames_per_direction':n,'raw_timing':5,'directions':[[d*n+j for j in range(n)] for d in range(8)],'spr_frame_count':n*8,'frame_bounds':bounds}
            (out/f'{rel}/animation.json').write_text(json.dumps(anim));char['actions'][action]={'animation':f'{rel}/animation.json','frames_dir':f'{rel}/frames'}
        manifest['characters'][str(cid)]=char
    (out/'prototype.json').write_text(json.dumps(manifest))
    files={p.relative_to(out).as_posix():{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':p.stat().st_size} for p in sorted(out.rglob('*')) if p.is_file()}
    (out/'asset-index.json').write_text(json.dumps({'schema':1,'files':files},indent=2))
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--out',type=Path,required=True);a=ap.parse_args();generate(a.out)
