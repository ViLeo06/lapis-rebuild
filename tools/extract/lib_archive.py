#!/usr/bin/env python3
"""List/extract Lapis .lib containers using the recovered client format."""
from __future__ import annotations
import argparse,csv,hashlib,struct,sys
from dataclasses import dataclass,asdict
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from pkware_blast import blast

KEY=bytes.fromhex('cd0976ccff44cebd'); ENTRY_SIZE=44
@dataclass(frozen=True)
class Entry: name:str;offset:int;unpacked_size:int;packed_size:int

def decode_directory_block(data:bytes)->bytes:
    length=len(data);mask=(length*157)&255;seed=2157;out=bytearray(length)
    for i,v in enumerate(data): out[i]=v^KEY[i&7]^((seed>>8)&255)^mask;seed=(seed*2171)&0xffffffff
    return bytes(out)

def read_archive(path:str|Path):
    path=Path(path);data=path.read_bytes()
    if len(data)<10: raise ValueError('archive shorter than header')
    directory_size,packed_size,check=struct.unpack_from('<IHI',data,0);data_base=10+packed_size
    if directory_size%ENTRY_SIZE: raise ValueError('directory size is not divisible by 44')
    if data_base>len(data): raise ValueError('packed directory exceeds archive')
    directory=blast(decode_directory_block(data[10:data_base]))
    if len(directory)!=directory_size: raise ValueError(f'directory size mismatch {len(directory)} != {directory_size}')
    entries=[]
    for off in range(0,len(directory),ENTRY_SIZE):
        rec=directory[off:off+ENTRY_SIZE];raw=rec[:32].split(b'\0',1)[0]
        name=raw.decode('cp949','replace');member_offset,usize,psize=struct.unpack_from('<III',rec,32)
        if data_base+member_offset+psize>len(data): raise ValueError(f'member {name!r} exceeds archive')
        entries.append(Entry(name,member_offset,usize,psize))
    return data,data_base,check,entries

def safe_member(root:Path,name:str)->Path:
    parts=[p for p in name.replace('\\','/').split('/') if p not in ('','.','..')]
    if not parts: raise ValueError(f'unsafe member name {name!r}')
    return root.joinpath(*parts)

def extract(path:Path,out:Path):
    data,base,check,entries=read_archive(path);out.mkdir(parents=True,exist_ok=True);manifest=[]
    for e in entries:
        packed=data[base+e.offset:base+e.offset+e.packed_size];raw=blast(packed)
        if len(raw)!=e.unpacked_size: raise ValueError(f'{e.name}: size {len(raw)} != {e.unpacked_size}')
        dest=safe_member(out,e.name);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
        manifest.append({**asdict(e),'sha256':hashlib.sha256(raw).hexdigest()})
    return check,manifest

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('archive',type=Path);ap.add_argument('--extract-dir',type=Path);ap.add_argument('--csv',type=Path);a=ap.parse_args()
    if a.extract_dir: check,rows=extract(a.archive,a.extract_dir)
    else:
        _,_,check,entries=read_archive(a.archive);rows=[asdict(e) for e in entries]
    print(f'archive={a.archive} entries={len(rows)} check=0x{check:08x}')
    for row in rows: print(f"{row['name']}\toffset=0x{row['offset']:x}\tunpacked={row['unpacked_size']}\tpacked={row['packed_size']}")
    if a.csv:
        a.csv.parent.mkdir(parents=True,exist_ok=True)
        keys=list(rows[0]) if rows else ['name','offset','unpacked_size','packed_size']
        with a.csv.open('w',newline='',encoding='utf-8') as f:w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(rows)
if __name__=='__main__':main()
