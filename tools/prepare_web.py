#!/usr/bin/env python3
"""Generate a private Web pack using existing project-owned format parsers.

Never executes original client software. Existing output is not overwritten.
"""
from __future__ import annotations
import argparse,hashlib,json,shutil,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/convert'))
from map_bundle import parse_mmf
INSTALLER_SHA='c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88'
def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def generate(client:Path,out:Path):
    if out.exists():raise FileExistsError(f'Refusing existing output: {out}')
    client=client.resolve();out.parent.mkdir(parents=True,exist_ok=True)
    if not (client/'Char').is_dir() or not (client/'SGRes').is_dir():raise ValueError('Expected extracted client/ containing Char and SGRes')
    with tempfile.TemporaryDirectory(prefix='lapis-web-',dir=out.parent) as tmp:
        stage=Path(tmp)/'pack'
        subprocess.run([sys.executable,str(ROOT/'tools/prepare_prototype.py'),'--char-dir',str(client/'Char'),'--sgres-dir',str(client/'SGRes'),'--out',str(stage)],check=True,capture_output=True,text=True)
        manifest=json.loads((stage/'prototype.json').read_text())
        manifest['provenance']={'kind':'private-original','evidence':'VERIFIED','installer_sha256':INSTALLER_SHA,'scope':'Decoded assets only. Timing and training rules are UNVERIFIED.'}
        manifest['map']['render'].pop('output',None)
        paths=[p for p in (client/'SGRes').iterdir() if p.name.lower()=='sz-0000.mmf']
        if len(paths)!=1:raise ValueError('Expected exactly one map 0 MMF')
        mmf=parse_mmf(paths[0]);ins={'width':mmf['width'],'height':mmf['height'],'cells':[{'resource_id':c['resource_id'],'directory_path':c['directory_path']} for c in mmf['cells']]}
        manifest['map']['inspector']='maps/map-0000-inspector.json'
        (stage/manifest['map']['inspector']).write_text(json.dumps(ins,separators=(',',':'))+'\n')
        sources={}
        for p in sorted((client/'Char').iterdir()):
            if p.stem.split('_')[0] in ('B100','B109') and p.suffix.lower() in ('.ani','.spr'):
                sources['Char/'+p.name]=digest(p)
        for p in sorted((client/'SGRes').iterdir()):
            if p.stem.lower()=='sz-0000' and p.suffix.lower() in ('.mmf','.smf','.imf'):sources['SGRes/'+p.name]=digest(p)
        for p in stage.rglob('index.json'):
            obj=json.loads(p.read_text());obj['source']=Path(obj['source']).name;p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
        (stage/'prototype.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        files={p.relative_to(stage).as_posix():{'sha256':digest(p),'size':p.stat().st_size} for p in sorted(stage.rglob('*')) if p.is_file()}
        (stage/'asset-index.json').write_text(json.dumps({'schema':1,'inputs':sources,'files':files},indent=2)+'\n')
        stage.rename(out)
    print(json.dumps({'output':str(out),'files':len(files)+1,'bytes':sum(p.stat().st_size for p in out.rglob('*') if p.is_file()),'mode':'private-original'}))
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--client-root',type=Path,required=True);ap.add_argument('--out',type=Path,default=ROOT/'web/public/game-data');a=ap.parse_args();generate(a.client_root,a.out)
