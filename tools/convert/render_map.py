#!/usr/bin/env python3
"""Render an old MMF+SMF scene to PNG using project-owned parsers."""
from __future__ import annotations

import argparse
from pathlib import Path

from map_bundle import parse_mmf, parse_smf
from sgr import parse_sgr, decode_dib_frame, decode_middle_image
from spr import write_png

TILE_W=64; TILE_H=32


def _find(root:Path,name:str)->Path:
    matches=[p for p in root.iterdir() if p.is_file() and p.name.lower()==name.lower()]
    if len(matches)!=1: raise ValueError(f'expected one {name}, found {len(matches)}')
    return matches[0]


def _sgr(root:Path,rid:int,cache:dict):
    if rid not in cache:
        p=_find(root,f'sg-{rid}.sgr'); cache[rid]=(p.read_bytes(),parse_sgr(p))
    return cache[rid]


def _matching_frame(model:dict,cell:dict):
    records=model['extended_records'] if cell['storage_form'].startswith('extended') else model['compact_records']
    idx=cell['directory_path'][0]
    if not 0<=idx<len(records): raise ValueError(f'SGR record {idx} out of range')
    record=records[idx]
    candidates=[f for f in record['frames'] if f['directory_path']==cell['directory_path']]
    if not candidates: raise ValueError(f"no frame for path {cell['directory_path']}")
    return record,min(candidates,key=lambda f:f['frame_index'])


def _copy_rgba(target:bytearray,tw:int,th:int,source:bytes,sw:int,sh:int,x0:int,y0:int):
    painted=False
    for y in range(sh):
        ty=y0+y
        if not 0<=ty<th: continue
        for x in range(sw):
            tx=x0+x
            if not 0<=tx<tw: continue
            so=(y*sw+x)*4
            if source[so+3]==0: continue
            to=(ty*tw+tx)*4; target[to:to+4]=source[so:so+4]; painted=True
    return painted


def _darken_rgba(target:bytearray,tw:int,th:int,mask_rgba:bytes,sw:int,sh:int,x0:int,y0:int):
    painted=False
    for y in range(sh):
        ty=y0+y
        if not 0<=ty<th: continue
        for x in range(sw):
            tx=x0+x
            if not 0<=tx<tw: continue
            so=(y*sw+x)*4
            if mask_rgba[so+3]==0: continue
            to=(ty*tw+tx)*4
            r,g,b,a=target[to:to+4]
            rgb565=((r*31//255)<<11)|((g*63//255)<<5)|(b*31//255)
            v=(rgb565 & 0xF7DE)>>1
            rr=((v>>11)&31)*255//31; gg=((v>>5)&63)*255//63; bb=(v&31)*255//31
            target[to:to+4]=bytes((rr,gg,bb,a)); painted=True
    return painted


def render(root:Path,map_id:int,out:Path)->dict:
    mmf=parse_mmf(_find(root,f'sz-{map_id:04d}.mmf')); smf=parse_smf(_find(root,f'sz-{map_id:04d}.smf'))
    width=mmf['width']*TILE_W; height=mmf['height']*TILE_H
    target=bytearray(width*height*4); cache={}; tile_cache={}
    for first in range(mmf['width']):
        for second in range(mmf['height']):
            cell=mmf['cells'][first*mmf['height']+second]
            rid=cell['resource_id']
            key=(rid,tuple(cell['directory_path']),cell['storage_form'])
            tile=tile_cache.get(key)
            if tile is None:
                data,model=_sgr(root,rid,cache); record,frame=_matching_frame(model,cell); tile=decode_dib_frame(data,record,frame)
                if tile[:2]!=(TILE_W,TILE_H): raise ValueError(f'non-tile DIB {tile[:2]}')
                tile_cache[key]=tile
            _copy_rgba(target,width,height,tile[2],TILE_W,TILE_H,first*TILE_W,second*TILE_H)
    prepared=[]; missing=0
    for index,record in enumerate(smf['records']):
        data,model=_sgr(root,record['kind'],cache)
        middle=next((r for r in model['middle_records'] if r['name']==record['name']),None)
        images=[]
        for section in (0,1):
            image=(middle['images'][section][0] if middle and middle['images'][section] else None)
            if image is None: missing+=1
            images.append(image)
        prepared.append((record['y']+record['extent_y'],record['y'],index,record,data,images))
    prepared.sort(key=lambda r:(r[0],r[1],r[2]))
    painted=0
    for section in (1,0):
        decoded_cache={}
        for _,_,_,record,data,images in prepared:
            image=images[section]
            if image is None: continue
            key=(record['kind'],record['name'],section,image['payload_offset'])
            dec=decoded_cache.get(key)
            if dec is None: dec=decode_middle_image(data,image); decoded_cache[key]=dec
            fn=_darken_rgba if section==1 else _copy_rgba
            if fn(target,width,height,dec[2],dec[0],dec[1],record['x'],record['y']): painted+=1
    write_png(out,width,height,bytes(target))
    return {'map_id':map_id,'width':width,'height':height,'background_cells':mmf['width']*mmf['height'],'object_images':painted,'missing_object_images':missing,'output':str(out)}


def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('sgres',type=Path);ap.add_argument('--map',type=int,default=0);ap.add_argument('--out',type=Path,required=True);a=ap.parse_args();print(render(a.sgres,a.map,a.out))
if __name__=='__main__':main()
