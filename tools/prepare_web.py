#!/usr/bin/env python3
"""Generate a private Web pack using project-owned parsers and pinned inputs.

Never executes original client software. Existing output is not overwritten.
MagicRes is exported as sequential SPR diagnostic frames only; this script does
not claim FOCUS direction, timing, blend or placement semantics.
"""
from __future__ import annotations
import argparse,hashlib,json,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/convert'))
from ani import parse_ani
from map_bundle import parse_mmf,parse_imf
from render_map import render
from spr import parse_spr,export_spr
INSTALLER_SHA='c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88'
WEB_MAPS={0:'对练场',1:'布日古斯_外城'}
WEB_EFFECTS=(1,2,3,35,36,37,38)
def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def find_ci(root:Path,name:str)->Path:
    hits=[p for p in root.iterdir() if p.is_file() and p.name.lower()==name.lower()]
    if len(hits)!=1:raise FileNotFoundError(f'expected exactly one {name} in {root}, got {len(hits)}')
    return hits[0]
def map_payload(sgres:Path,stage:Path,map_id:int,name:str)->dict:
    map_png=stage/'maps'/f'map-{map_id:04d}.png';map_png.parent.mkdir(parents=True,exist_ok=True)
    result=render(sgres,map_id,map_png);result.pop('output',None)
    imf=parse_imf(find_ci(sgres,f'sz-{map_id:04d}.imf'))
    collision={'width':imf['width'],'height':imf['height'],'grid_order':imf['grid_order'],'grid':imf['grid'],'sparse_records':imf['sparse_records']}
    collision_rel=f'maps/map-{map_id:04d}-collision.json';(stage/collision_rel).write_text(json.dumps(collision,ensure_ascii=False,separators=(',',':'))+'\n')
    mmf=parse_mmf(find_ci(sgres,f'sz-{map_id:04d}.mmf'))
    inspector={'width':mmf['width'],'height':mmf['height'],'cells':[{'resource_id':c['resource_id'],'directory_path':c['directory_path']} for c in mmf['cells']]}
    inspector_rel=f'maps/map-{map_id:04d}-inspector.json';(stage/inspector_rel).write_text(json.dumps(inspector,separators=(',',':'))+'\n')
    return {'id':map_id,'name':name,'png':f'maps/map-{map_id:04d}.png','collision':collision_rel,'inspector':inspector_rel,'render':result,'evidence':'VERIFIED_STATIC_RESOURCE'}
def effect_payload(magic:Path,stage:Path,rid:int)->dict:
    stem=f'magic-{rid:03d}';ani=parse_ani(find_ci(magic,stem+'.ani'));spr=parse_spr(find_ci(magic,stem+'.spr'))
    if ani.layer_name!='FOCUS':raise ValueError(f'{stem}: expected FOCUS layer, got {ani.layer_name!r}')
    if ani.frames_per_direction!=spr.frame_count:raise ValueError(f'{stem}: ANI active count {ani.frames_per_direction} != SPR count {spr.frame_count}')
    expected=list(range(spr.frame_count))
    if ani.directions[0]!=expected:raise ValueError(f'{stem}: first ANI row is not the sequential SPR range')
    rel=Path('effects')/stem/'frames';export_spr(spr,stage/rel)
    return {'resource_id':rid,'layer_name':ani.layer_name,'raw_timing':ani.raw_timing,'frame_count':spr.frame_count,'sequence':expected,'frames_dir':rel.as_posix(),'frame_bounds':[{'index':f.index,'left':f.left,'top':f.top,'right':f.right,'bottom':f.bottom} for f in spr.frames],'sequence_evidence':'VERIFIED_FILE_ORDER','timing_semantics':'UNVERIFIED','placement_semantics':'UNVERIFIED','warning':'FOCUS is not treated as an eight-direction Body_ animation.'}
def generate(client:Path,out:Path):
    if out.exists():raise FileExistsError(f'Refusing existing output: {out}')
    client=client.resolve();out.parent.mkdir(parents=True,exist_ok=True)
    if not (client/'Char').is_dir() or not (client/'SGRes').is_dir() or not (client/'MagicRes').is_dir():raise ValueError('Expected extracted client/ containing Char, SGRes and MagicRes')
    baseline=json.loads((ROOT/'manifests/web-source-baseline.json').read_text())
    for rel,expected in baseline['files'].items():
        if digest(client/rel)!=expected:raise ValueError(f'Input differs from verified 2.2 baseline: {rel}')
    with tempfile.TemporaryDirectory(prefix='lapis-web-',dir=out.parent) as tmp:
        stage=Path(tmp)/'pack'
        subprocess.run([sys.executable,str(ROOT/'tools/prepare_prototype.py'),'--char-dir',str(client/'Char'),'--sgres-dir',str(client/'SGRes'),'--out',str(stage)],check=True,capture_output=True,text=True)
        manifest=json.loads((stage/'prototype.json').read_text())
        manifest['provenance']={'kind':'private-original','evidence':'VERIFIED','installer_sha256':INSTALLER_SHA,'scope':'Decoded assets only. Timing, FOCUS placement and training rules are UNVERIFIED.'}
        manifest['map']['render'].pop('output',None)
        # Rebuild map 0 metadata consistently, then add the first verified city map.
        maps={str(mid):map_payload(client/'SGRes',stage,mid,name) for mid,name in WEB_MAPS.items()}
        manifest['map']=maps['0'];manifest['maps']=maps
        manifest['effects']={str(rid):effect_payload(client/'MagicRes',stage,rid) for rid in WEB_EFFECTS}
        sources=baseline['files']
        manifest['provenance']['pack_sha256']=hashlib.sha256(json.dumps({'schema':2,'inputs':sources,'maps':sorted(WEB_MAPS),'effects':list(WEB_EFFECTS)},sort_keys=True,separators=(',',':')).encode()).hexdigest()
        for p in stage.rglob('index.json'):
            obj=json.loads(p.read_text());obj['source']=Path(obj['source']).name;p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
        (stage/'prototype.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        files={p.relative_to(stage).as_posix():{'sha256':digest(p),'size':p.stat().st_size} for p in sorted(stage.rglob('*')) if p.is_file()}
        (stage/'asset-index.json').write_text(json.dumps({'schema':1,'inputs':sources,'files':files},indent=2)+'\n')
        stage.rename(out)
    print(json.dumps({'output':str(out),'files':len(files)+1,'bytes':sum(p.stat().st_size for p in out.rglob('*') if p.is_file()),'mode':'private-original','maps':list(WEB_MAPS),'effects':list(WEB_EFFECTS)}))
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--client-root',type=Path,required=True);ap.add_argument('--out',type=Path,default=ROOT/'web/public/game-data');a=ap.parse_args();generate(a.client_root,a.out)
