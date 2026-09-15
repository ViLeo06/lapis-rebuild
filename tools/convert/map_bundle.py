#!/usr/bin/env python3
"""Parse old NeoDark/YBCS MMF+SMF+IMF map bundles without executing the client.

This module deliberately keeps low-level MMF selector words and IMF cell values
alongside interpreted fields.  SGR image decoding/rendering is handled
separately so map geometry and collision can be validated independently.
"""
from __future__ import annotations

import argparse, json, struct
from pathlib import Path


def _archive_string(data: bytes, pos: int) -> tuple[bytes, int]:
    if pos >= len(data): raise ValueError('truncated archive string')
    first=data[pos]; pos+=1
    if first < 0xff: size=first
    else:
        if pos+2>len(data): raise ValueError('truncated archive marker')
        marker=struct.unpack_from('<H',data,pos)[0]; pos+=2
        if marker==0xfffe: raise ValueError('wide archive strings unsupported')
        if marker==0xffff:
            if pos+4>len(data): raise ValueError('truncated archive length')
            size=struct.unpack_from('<I',data,pos)[0]; pos+=4
        else: size=marker
    if pos+size>len(data): raise ValueError('archive string exceeds file')
    return data[pos:pos+size], pos+size


def parse_mmf(path: str|Path) -> dict:
    path=Path(path); data=path.read_bytes(); pos=0
    def i32():
        nonlocal pos
        if pos+4>len(data): raise ValueError('truncated MMF')
        v=struct.unpack_from('<i',data,pos)[0]; pos+=4; return v
    version=i32(); resource_count=i32()
    if not 0<=resource_count<=0x10000: raise ValueError('invalid MMF resource count')
    resources=[]
    for _ in range(resource_count):
        rid=i32(); groups=[]
        if version<=-300:
            for _ in range(2):
                count=i32()
                if not 0<=count<=0x100000: raise ValueError('invalid MMF string count')
                vals=[]
                for _ in range(count):
                    raw,pos=_archive_string(data,pos); vals.append(raw.decode('ascii','replace'))
                groups.append(vals)
        resources.append({'resource_id':rid,'string_groups':groups})
    width=i32(); height=i32()
    if width<=0 or height<=0: raise ValueError('invalid MMF dimensions')
    cell_offset=pos; cells=[]
    resource_ids={r['resource_id'] for r in resources}
    for index in range(width*height):
        if pos+4>len(data): raise ValueError(f'truncated MMF cell {index}')
        packed=struct.unpack_from('<I',data,pos)[0]; pos+=4
        ext=None
        if packed&1:
            if pos+4>len(data): raise ValueError(f'truncated MMF extension {index}')
            ext=struct.unpack_from('<I',data,pos)[0]; pos+=4
        resource_id=(packed>>23)&0x3f
        if ext is None:
            directory=[(packed>>15)&0xff,(packed>>11)&0x0f,(packed>>5)&0x3f,(packed>>1)&0x0f]
            storage='compact-8-4-6-4'
        else:
            directory=[ext&0xff,(packed>>5)&0x3f,(ext>>8)&0xfff,(ext>>20)&0xfff]
            storage='extended-8-6-12-12'
        cells.append({'packed':packed,'extension':ext,'resource_id':resource_id,
                      'resource_declared':resource_id in resource_ids,
                      'storage_form':storage,'directory_path':directory,'high_flags':(packed>>29)&7})
    if pos!=len(data): raise ValueError(f'MMF trailing bytes: {len(data)-pos}')
    return {'source':str(path),'version':version,'resource_count':resource_count,'resources':resources,
            'width':width,'height':height,'cell_data_offset':cell_offset,'cells':cells}


def parse_smf(path: str|Path) -> dict:
    path=Path(path); data=path.read_bytes(); pos=0
    def take(n):
        nonlocal pos
        if pos+n>len(data): raise ValueError(f'truncated SMF at 0x{pos:x}')
        b=data[pos:pos+n]; pos+=n; return b
    def unpack(fmt): return struct.unpack(fmt,take(struct.calcsize(fmt)))
    version,width,height=unpack('<3i')
    if version!=-200: raise ValueError(f'unsupported SMF version {version}')
    if len(data)==12: return {'source':str(path),'version':version,'width':width,'height':height,'records':[]}
    ex,ey=unpack('<HH')
    if min(width,height,ex,ey)<=0: raise ValueError('invalid SMF dimensions')
    records=[]
    while pos<len(data):
        off=pos; x,y,kind,obj=unpack('<iiHi')
        raw,pos2=_archive_string(data,pos); pos=pos2
        if not raw or any(v>0x7f for v in raw): raise ValueError(f'invalid SMF name at 0x{off:x}')
        layer,flags=unpack('<hB')
        records.append({'x':x,'y':y,'file_offset':off,'kind':kind,'object_id':obj,'name':raw.decode('ascii'),
                        'layer':layer,'flags':flags,'extent_x':ex,'extent_y':ey})
        if pos<len(data): ex,ey=unpack('<HH')
    return {'source':str(path),'version':version,'width':width,'height':height,'records':records}


def parse_imf(path: str|Path) -> dict:
    path=Path(path); data=path.read_bytes()
    if len(data)<20 or data[:4]!=b'\x70\xfe\xff\xff': raise ValueError('invalid IMF header')
    width,height=struct.unpack_from('<II',data,4)
    if not width or not height: raise ValueError('invalid IMF dimensions')
    grid_end=12+width*height*2
    if grid_end+8>len(data): raise ValueError('truncated IMF grid')
    count=struct.unpack_from('<I',data,grid_end)[0]
    expected=grid_end+4+count*6+4
    if expected!=len(data): raise ValueError(f'IMF size mismatch expected={expected} got={len(data)}')
    records=[struct.unpack_from('<HHH',data,grid_end+4+i*6) for i in range(count)]
    if struct.unpack_from('<I',data,len(data)-4)[0]!=0: raise ValueError('nonzero IMF terminator')
    if any(x>=width or y>=height for x,y,_ in records): raise ValueError('IMF sparse record out of bounds')
    disk=[struct.unpack_from('<H',data,12+i*2)[0] for i in range(width*height)]
    grid=[0]*(width*height); evens=(width+1)//2; compact_seconds=(height+1)//2
    for compact_second in range(compact_seconds):
        for source_column in range(width):
            first=source_column*2 if source_column<evens else (source_column-evens)*2+1
            second=compact_second*2+(first&1)
            if second>=height: continue
            grid[first*height+second]=disk[compact_second*width+source_column]
    return {'source':str(path),'width':width,'height':height,'grid_order':'first-major','grid':grid,
            'sparse_records':[{'x':x,'y':y,'resource_id':rid} for x,y,rid in records]}


def main():
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument('stem',type=Path,help='path without .mmf/.smf/.imf suffix')
    ap.add_argument('--json',type=Path); a=ap.parse_args()
    out={'map_stem':str(a.stem),'mmf':parse_mmf(a.stem.with_suffix('.mmf')),
         'smf':parse_smf(a.stem.with_suffix('.smf')),'imf':parse_imf(a.stem.with_suffix('.imf'))}
    text=json.dumps(out,ensure_ascii=False,indent=2)+'\n'
    if a.json: a.json.parent.mkdir(parents=True,exist_ok=True); a.json.write_text(text,encoding='utf-8')
    else: print(text,end='')

if __name__=='__main__': main()
