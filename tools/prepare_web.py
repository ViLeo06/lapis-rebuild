#!/usr/bin/env python3
"""Generate a private Web pack using project-owned parsers and pinned inputs.

Never executes original client software. Existing output is not overwritten.
MagicRes is exported as sequential SPR diagnostic frames only; this script does
not claim FOCUS direction, timing, blend or placement semantics. Quest/NPC text
is decoded from the hash-pinned Quest.lib only into private generated output.
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
def build_content(client:Path,stage:Path,tmp:Path)->dict:
    raw=tmp/'quest-source'
    subprocess.run([sys.executable,str(ROOT/'tools/extract/lib_archive.py'),str(client/'NRes/Quest.lib'),'--extract-dir',str(raw)],check=True,capture_output=True,text=True)
    out=stage/'content'
    subprocess.run([sys.executable,str(ROOT/'tools/convert/quest_content.py'),'--extracted-dir',str(raw),'--out',str(out)],check=True,capture_output=True,text=True)
    return {
        'evidence':'VERIFIED_STATIC_CONTENT_STRUCTURE',
        'scope':'Private generated content from hash-pinned Quest.lib; trigger/map semantics are not yet reconstructed.',
        'summary':'content/summary.json',
        'npc_script':'content/npc-script.json',
        'quests':{str(i):f'content/quests/quest{i}.json' for i in range(10)},
    }
def generate(client:Path,out:Path):
    if out.exists():raise FileExistsError(f'Refusing existing output: {out}')
    client=client.resolve();out.parent.mkdir(parents=True,exist_ok=True)
    if not (client/'Char').is_dir() or not (client/'SGRes').is_dir() or not (client/'MagicRes').is_dir() or not (client/'NRes').is_dir():raise ValueError('Expected extracted client/ containing Char, SGRes, MagicRes and NRes')
    base=json.loads((ROOT/'manifests/web-source-baseline.json').read_text());effects=json.loads((ROOT/'manifests/web-effects-baseline.json').read_text());content=json.loads((ROOT/'manifests/content-source-baseline.json').read_text())
    if any(m['installer_sha256']!=INSTALLER_SHA for m in (base,effects,content)):raise ValueError('Baseline installer identity mismatch')
    sources={**base['files'],**effects['files'],**content['files']}
    for rel,expected in sources.items():
        if digest(client/rel)!=expected:raise ValueError(f'Input differs from verified 2.2 baseline: {rel}')
    with tempfile.TemporaryDirectory(prefix='lapis-web-',dir=out.parent) as tmp_name:
        tmp=Path(tmp_name);stage=tmp/'pack'
        subprocess.run([sys.executable,str(ROOT/'tools/prepare_prototype.py'),'--char-dir',str(client/'Char'),'--sgres-dir',str(client/'SGRes'),'--out',str(stage)],check=True,capture_output=True,text=True)
        manifest=json.loads((stage/'prototype.json').read_text())
        manifest['provenance']={'kind':'private-original','evidence':'VERIFIED','installer_sha256':INSTALLER_SHA,'scope':'Decoded assets/content only. Timing, FOCUS placement, quest triggers and training rules may remain UNVERIFIED.'}
        manifest['map']['render'].pop('output',None)
        maps={str(mid):map_payload(client/'SGRes',stage,mid,name) for mid,name in WEB_MAPS.items()}
        manifest['map']=maps['0'];manifest['maps']=maps
        manifest['effects']={str(rid):effect_payload(client/'MagicRes',stage,rid) for rid in WEB_EFFECTS}
        manifest['content']=build_content(client,stage,tmp)
        manifest['provenance']['pack_sha256']=hashlib.sha256(json.dumps({'schema':3,'inputs':sources,'maps':sorted(WEB_MAPS),'effects':list(WEB_EFFECTS),'content':'quest-lib'},sort_keys=True,separators=(',',':')).encode()).hexdigest()
        for p in stage.rglob('index.json'):
            obj=json.loads(p.read_text());obj['source']=Path(obj['source']).name;p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
        (stage/'prototype.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        files={p.relative_to(stage).as_posix():{'sha256':digest(p),'size':p.stat().st_size} for p in sorted(stage.rglob('*')) if p.is_file()}
        (stage/'asset-index.json').write_text(json.dumps({'schema':1,'inputs':sources,'files':files},indent=2)+'\n')
        stage.rename(out)
    print(json.dumps({'output':str(out),'files':len(files)+1,'bytes':sum(p.stat().st_size for p in out.rglob('*') if p.is_file()),'mode':'private-original','maps':list(WEB_MAPS),'effects':list(WEB_EFFECTS),'content':'Quest.lib'}))
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--client-root',type=Path,required=True);ap.add_argument('--out',type=Path,default=ROOT/'web/public/game-data');a=ap.parse_args();generate(a.client_root,a.out)
