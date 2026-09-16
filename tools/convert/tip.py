#!/usr/bin/env python3
"""Parse NeoDark/YBCS ``*.Tip`` sprite libraries without executing the client.

Verified against all 27 Tip files in the hash-pinned 2.2 client. The container,
frame table, row/run framing and run payload *sizes* are recovered. Rendering
semantics for run kinds 2/3/4 remain deliberately uninterpreted; payload words
are preserved raw instead of guessing alpha/blend behavior.
"""
from __future__ import annotations

import argparse
import json
import struct
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

MAGIC=b'NORMAL LIBRARY.\0'
HEADER_SIZE=0x25
ALLOWED_FLAGS={0x0200,0x0600}
MARKER_A=0x20
MARKER_B=0x08


@dataclass(frozen=True)
class TipRun:
    kind:int
    length:int
    payload:tuple[int,...]


@dataclass(frozen=True)
class TipRow:
    runs:tuple[TipRun,...]


@dataclass(frozen=True)
class TipFrame:
    index:int
    left:int
    top:int
    right:int
    bottom:int
    rows:tuple[TipRow,...]

    @property
    def width(self)->int:return self.right-self.left

    @property
    def height(self)->int:return self.bottom-self.top


@dataclass(frozen=True)
class TipLibrary:
    source:str
    flag:int
    canvas_width:int
    canvas_height:int
    frames:tuple[TipFrame,...]
    offsets:tuple[int,...]


def _payload_words(kind:int,length:int)->int:
    """Return structurally verified payload word count for one run code."""
    if kind==0:return 0
    if kind==1:return length
    if kind==2:return 1
    if kind==3:return length*2
    if kind==4:return 2
    raise ValueError(f'unsupported TIP run kind {kind}')


def parse_tip(path:str|Path)->TipLibrary:
    path=Path(path);data=path.read_bytes()
    if len(data)<HEADER_SIZE+4:raise ValueError('TIP shorter than header')
    if data[:len(MAGIC)]!=MAGIC:raise ValueError('invalid TIP magic')
    flag=struct.unpack_from('<H',data,0x10)[0]
    if flag not in ALLOWED_FLAGS:raise ValueError(f'unsupported TIP flag 0x{flag:04x}')
    if any(data[0x12:0x1b]):raise ValueError('nonzero TIP reserved header bytes')
    width,height=struct.unpack_from('<HH',data,0x1b)
    if not width or not height:raise ValueError('invalid TIP canvas dimensions')
    if data[0x1f]!=MARKER_A or data[0x20]!=MARKER_B:raise ValueError('unsupported TIP header markers')
    frame_count=struct.unpack_from('<I',data,0x21)[0]
    if not 1<=frame_count<=100000:raise ValueError('invalid TIP frame count')

    table_end=HEADER_SIZE+4*(frame_count+1)
    if table_end>len(data):raise ValueError('truncated TIP offset table')
    offsets=struct.unpack_from('<'+'I'*(frame_count+1),data,HEADER_SIZE)
    if offsets[0]!=0 or any(b<a for a,b in zip(offsets,offsets[1:])):raise ValueError('invalid TIP frame offsets')

    pixel_start=table_end
    tail_start=pixel_start+offsets[-1]*2
    expected_size=tail_start+4+16*frame_count
    if expected_size!=len(data):raise ValueError(f'TIP size mismatch expected={expected_size} got={len(data)}')
    repeated_count=struct.unpack_from('<I',data,tail_start)[0]
    if repeated_count!=frame_count:raise ValueError('TIP repeated frame count mismatch')

    descriptors=[];pos=tail_start+4
    for index in range(frame_count):
        left,top,bottom,right=struct.unpack_from('<4i',data,pos);pos+=16
        if not (0<=left<right<=width and 0<=top<bottom<=height):
            raise ValueError(f'TIP frame {index} rectangle outside canvas: {(left,top,bottom,right)}')
        descriptors.append((left,top,right,bottom))

    frames=[]
    for index,((word_start,word_end),(left,top,right,bottom)) in enumerate(zip(zip(offsets,offsets[1:]),descriptors)):
        byte_start=pixel_start+word_start*2;byte_end=pixel_start+word_end*2
        word_count=word_end-word_start
        words=struct.unpack_from('<'+'H'*word_count,data,byte_start) if word_count else ()
        cursor=0;rows=[];frame_width=right-left;frame_height=bottom-top
        for row_index in range(frame_height):
            if cursor>=len(words):raise ValueError(f'TIP frame {index} row {row_index}: missing span count')
            span_count=words[cursor];cursor+=1;x=0;runs=[]
            for span_index in range(span_count):
                if cursor>=len(words):raise ValueError(f'TIP frame {index} row {row_index}: missing run code')
                code=words[cursor];cursor+=1;kind=code>>12;length=code&0x0fff
                if length==0:raise ValueError(f'TIP frame {index} row {row_index}: zero-length run')
                payload_count=_payload_words(kind,length)
                if cursor+payload_count>len(words):raise ValueError(f'TIP frame {index} row {row_index}: truncated kind {kind} payload')
                payload=tuple(words[cursor:cursor+payload_count]);cursor+=payload_count;x+=length
                if x>frame_width:raise ValueError(f'TIP frame {index} row {row_index}: runs exceed row width')
                runs.append(TipRun(kind,length,payload))
            if x!=frame_width:raise ValueError(f'TIP frame {index} row {row_index}: run width {x} != {frame_width}')
            rows.append(TipRow(tuple(runs)))
        if cursor!=len(words):raise ValueError(f'TIP frame {index}: {len(words)-cursor} trailing stream words')
        if byte_end!=pixel_start+word_end*2:raise AssertionError('TIP frame byte accounting error')
        frames.append(TipFrame(index,left,top,right,bottom,tuple(rows)))
    return TipLibrary(str(path),flag,width,height,tuple(frames),tuple(offsets))


def summarize(lib:TipLibrary)->dict:
    kinds=Counter(run.kind for frame in lib.frames for row in frame.rows for run in row.runs)
    pixels=Counter()
    payload_words=Counter()
    for frame in lib.frames:
        for row in frame.rows:
            for run in row.runs:
                pixels[run.kind]+=run.length;payload_words[run.kind]+=len(run.payload)
    return {
        'source':lib.source,
        'flag':f'0x{lib.flag:04x}',
        'canvas':{'width':lib.canvas_width,'height':lib.canvas_height},
        'frame_count':len(lib.frames),
        'stream_words':lib.offsets[-1],
        'run_counts':{str(k):v for k,v in sorted(kinds.items())},
        'pixel_counts':{str(k):v for k,v in sorted(pixels.items())},
        'payload_word_counts':{str(k):v for k,v in sorted(payload_words.items())},
        'run_semantics':{
            '0':'payload_words=0; visual meaning not asserted by parser',
            '1':'payload_words=run_length; RGB565-like literal interpretation remains a separate rendering claim',
            '2':'payload_words=1; visual meaning UNVERIFIED',
            '3':'payload_words=2*run_length; visual meaning UNVERIFIED',
            '4':'payload_words=2; visual meaning UNVERIFIED',
        },
    }


def main()->int:
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('tip',type=Path);ap.add_argument('--json',type=Path);args=ap.parse_args()
    result=summarize(parse_tip(args.tip));text=json.dumps(result,ensure_ascii=False,indent=2)+'\n'
    if args.json:args.json.parent.mkdir(parents=True,exist_ok=True);args.json.write_text(text,encoding='utf-8')
    else:print(text,end='')
    return 0


if __name__=='__main__':raise SystemExit(main())
