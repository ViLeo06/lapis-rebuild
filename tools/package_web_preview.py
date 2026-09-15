#!/usr/bin/env python3
"""Inline a Vite build and a verified local pack into one PRIVATE HTML preview.

This is not public deployment. No server, CDN, original executable or install is
needed to open the resulting file. Browser storage can vary on file:// origins;
JSON save export/import is always retained as the portable fallback.
"""
from __future__ import annotations
import argparse,base64,hashlib,json,re
from pathlib import Path

def package(dist:Path,pack:Path,out:Path):
    if out.exists():raise FileExistsError(f'Refusing existing output: {out}')
    index=json.loads((pack/'asset-index.json').read_text())
    embedded={}
    for rel,meta in index['files'].items():
        path=(pack/rel).resolve()
        if not path.is_relative_to(pack.resolve()):raise ValueError('Pack path escape')
        data=path.read_bytes()
        if hashlib.sha256(data).hexdigest()!=meta['sha256'] or len(data)!=meta['size']:raise ValueError(f'Pack checksum mismatch: {rel}')
        if path.suffix not in ('.png','.json'):continue
        mime='image/png' if path.suffix=='.png' else 'application/json'
        embedded[rel]='data:'+mime+';base64,'+base64.b64encode(data).decode('ascii')
    embedded['asset-index.json']='data:application/json;base64,'+base64.b64encode((pack/'asset-index.json').read_bytes()).decode('ascii')
    html=(dist/'index.html').read_text()
    scripts=re.findall(r'<script[^>]+src="([^"]+)"[^>]*></script>',html)
    if len(scripts)!=1:raise ValueError('Expected one self-contained Vite entry; chunked builds need explicit bundling')
    js=(dist/scripts[0].removeprefix('./')).read_text()
    if re.search(r'\bimport\b\s*(?:[\w{*]|\()',js):raise ValueError('Unexpected import in built entry')
    cssfiles=re.findall(r'<link[^>]+href="([^"]+\.css)"[^>]*>',html)
    for css in cssfiles:html=re.sub(r'<link[^>]+href="'+re.escape(css)+r'"[^>]*>',lambda _: '<style>'+(dist/css.removeprefix('./')).read_text()+'</style>',html)
    data_script='<script>window.__LAPIS_PACK__='+json.dumps(embedded,separators=(',',':')).replace('<','\\u003c')+';</script>'
    html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>',lambda _:data_script+'<script type="module">'+js.replace('</script','<\\/script')+'</script>',html)
    out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html)
    result={'filename':out.name,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'embedded_files':len(embedded),'visibility':'private-only'}
    print(json.dumps(result));return result
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--dist',type=Path,required=True);ap.add_argument('--pack',type=Path,required=True);ap.add_argument('--out',type=Path,required=True);a=ap.parse_args();package(a.dist,a.pack,a.out)
