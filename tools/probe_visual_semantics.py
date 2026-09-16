#!/usr/bin/env python3
"""Verify fixed-hash NeoDark visual/audio runtime semantics without executing it."""
from __future__ import annotations
import argparse, hashlib, json, struct
from dataclasses import dataclass
from pathlib import Path

EXPECTED_SHA256 = '432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7'

@dataclass(frozen=True)
class Section:
    rva:int; vsize:int; raw:int; rsize:int
@dataclass(frozen=True)
class PE:
    image_base:int; sections:tuple[Section,...]

def parse_pe(data:bytes)->PE:
    pe=struct.unpack_from('<I',data,0x3c)[0]
    if data[pe:pe+4] != b'PE\0\0': raise ValueError('not PE')
    n=struct.unpack_from('<H',data,pe+6)[0]
    osz=struct.unpack_from('<H',data,pe+20)[0]
    opt=pe+24
    if struct.unpack_from('<H',data,opt)[0] != 0x10b: raise ValueError('not PE32')
    base=struct.unpack_from('<I',data,opt+28)[0]
    table=opt+osz; secs=[]
    for i in range(n):
        o=table+i*40
        vs,rva,rs,raw=struct.unpack_from('<IIII',data,o+8)
        secs.append(Section(rva,vs,raw,rs))
    return PE(base,tuple(secs))

def va_to_offset(pe:PE,va:int)->int:
    rva=va-pe.image_base
    for s in pe.sections:
        if s.rva <= rva < s.rva+max(s.vsize,s.rsize):
            delta=rva-s.rva
            if delta>=s.rsize: raise ValueError(f'VA 0x{va:x} not file-backed')
            return s.raw+delta
    raise ValueError(f'VA 0x{va:x} unmapped')

def read_at(data:bytes,pe:PE,va:int,n:int)->bytes:
    o=va_to_offset(pe,va); return data[o:o+n]

def expect_hex(data:bytes,pe:PE,va:int,hx:str,label:str)->dict:
    want=bytes.fromhex(hx); got=read_at(data,pe,va,len(want))
    if got != want: raise ValueError(f'{label} mismatch at 0x{va:x}: {got.hex()} != {want.hex()}')
    return {'label':label,'va':f'0x{va:08x}','bytes':want.hex()}

def cstr(data:bytes,pe:PE,va:int)->str:
    o=va_to_offset(pe,va); e=data.find(b'\0',o,o+512)
    if e<0: raise ValueError(f'unterminated string at 0x{va:x}')
    return data[o:e].decode('ascii','strict')

def expect_string(data:bytes,pe:PE,va:int,text:str)->dict:
    got=cstr(data,pe,va)
    if got!=text: raise ValueError(f'string mismatch at 0x{va:x}: {got!r}')
    return {'va':f'0x{va:08x}','text':text}

def dword_table(data:bytes,pe:PE,va:int,count:int)->list[str]:
    o=va_to_offset(pe,va); return [f'0x{x:08x}' for x in struct.unpack_from('<'+'I'*count,data,o)]

def scan_normal_cadence(data:bytes,pe:PE)->list[str]:
    prefix=bytes.fromhex('d905d8414e00')  # fld dword ptr [0x4e41d8] == 1000.0f
    out=[]
    for s in pe.sections:
        blob=data[s.raw:s.raw+s.rsize]; pos=0
        while True:
            i=blob.find(prefix,pos)
            if i<0: break
            tail=blob[i+6:i+24]
            matched=False
            for j in range(max(0,len(tail)-5)):
                if tail[j]==0xd8 and tail[j+2:j+6]==bytes.fromhex('44040000'):
                    matched=True; break
            if matched:
                va=pe.image_base+s.rva+i
                out.append(f'0x{va:08x}')
            pos=i+1
    return out

def main()->int:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--image',type=Path,required=True)
    ap.add_argument('--out',type=Path,required=True)
    a=ap.parse_args(); data=a.image.read_bytes()
    digest=hashlib.sha256(data).hexdigest()
    if digest!=EXPECTED_SHA256: raise SystemExit(f'SHA-256 mismatch: {digest}')
    pe=parse_pe(data)
    sig=[]
    # High-resolution timer normalized to integer milliseconds.
    sig.append(expect_hex(data,pe,0x4bedd1,'ff15ec224e00','QueryPerformanceFrequency call'))
    sig.append(expect_hex(data,pe,0x4bedec,'68e8030000','divide frequency by 1000'))
    sig.append(expect_hex(data,pe,0x4bee21,'ff15c4224e00','QueryPerformanceCounter call'))
    # ANI loader: 0x44-byte global header followed by layer_count records of 0x490 bytes.
    sig.append(expect_hex(data,pe,0x478867,'6a4451','ANI 0x44-byte header read'))
    sig.append(expect_hex(data,pe,0x478903,'6890040000','ANI 0x490-byte layer allocation'))
    sig.append(expect_hex(data,pe,0x478919,'6890040000','ANI 0x490-byte layer read'))
    sig.append(expect_hex(data,pe,0x40fd5f,'6850484f00','character ANI format-string reference'))
    sig.append(expect_hex(data,pe,0x40fd7d,'e87e8a0600','ANI loader call from character action loader'))
    # Normal cadence and one caller-specific transformed timing path.
    cadence=scan_normal_cadence(data,pe)
    required={'0x0045c852','0x00465516','0x0046fc7b','0x00470f49','0x004711d5','0x004889fd','0x004b21c1','0x004b2309','0x004b8a03'}
    if not required.issubset(set(cadence)):
        raise ValueError(f'missing expected cadence sites: {sorted(required-set(cadence))}')
    if struct.unpack('<f',read_at(data,pe,0x4e41d8,4))[0] != 1000.0: raise ValueError('1000.0 constant mismatch')
    if struct.unpack('<f',read_at(data,pe,0x4e4aac,4))[0] != 1.0: raise ValueError('1.0 constant mismatch')
    sig.append(expect_hex(data,pe,0x4960b4,'d98044040000eb04','special timing loads layer+0x444'))
    sig.append(expect_hex(data,pe,0x4960c0,'d825ac4a4e00d83dd8414e00','special timing computes 1000/(raw-1)'))
    # Damage presentation: positive HP loss -> audio -> action state 3 -> signed new HP write.
    sig.append(expect_hex(data,pe,0x405b5a,'8b56342bd785d20f8eb3000000','positive oldHP-newHP gate'))
    sig.append(expect_hex(data,pe,0x405b81,'8b4368','hit presentation type read'))
    sig.append(expect_hex(data,pe,0x405bf4,'b97097a400e872090100','hit SFX manager call'))
    sig.append(expect_hex(data,pe,0x405bfe,'6a006a038bcee8f7c30a00','set action state 3'))
    sig.append(expect_hex(data,pe,0x405c1a,'0fbf4424308b56348bc82bca894634','signed absolute HP write'))
    # State setter/end policy.
    sig.append(expect_hex(data,pe,0x4b2048,'8986ec020000','store action state'))
    sig.append(expect_hex(data,pe,0x4b20d1,'c786f002000000000000','reset frame index'))
    sig.append(expect_hex(data,pe,0x4b20db,'c1e0078b4c3844','select initial direction row frame'))
    sig.append(expect_hex(data,pe,0x4b2332,'8b96ec02000083c2fe83fa06','end-of-action state switch'))
    end_table=dword_table(data,pe,0x4b23e0,7)
    expected_end=['0x004b2347','0x004b2347','0x004b23a6','0x004b2347','0x004b23a6','0x004b2383','0x004b2399']
    if end_table!=expected_end: raise ValueError(f'action-end table mismatch: {end_table}')
    # Current zone is stored during map loading and drives BGM selection.
    sig.append(expect_hex(data,pe,0x48eabe,'a1b4484f003bc6','map loader compares current zone id'))
    sig.append(expect_hex(data,pe,0x48eaf1,'8935b4484f00','map loader stores current zone id'))
    sig.append(expect_hex(data,pe,0x48fd86,'a1b4484f0056578bf950b938f39900','BGM looks up metadata by current zone'))
    sig.append(expect_hex(data,pe,0x48fd9e,'8b700885f67d05be05000000','BGM reads record+8 and falls back to track 5'))
    sig.append(expect_hex(data,pe,0x48fdc1,'3d1a0400007f10743d2df2030000743683e80a7431','special-zone BGM branch 1010/1020/1050'))
    sig.append(expect_hex(data,pe,0x48fdd8,'3d1405000074283d280a00007537','special-zone BGM branch 1300/2600'))
    sig.append(expect_hex(data,pe,0x48fe1d,'568d54240c68a48d4f0052','format Sound/NDS-8 track path'))
    sig.append(expect_hex(data,pe,0x48fe34,'b97097a40050e82168f8ff','play selected BGM path'))

    # Resource/audio templates.
    strings=[]
    for va,text in [
        (0x4f4850,'%sCHAR\\B%03d_%02d.ani'),
        (0x4f4524,'NDS-000%d.wav'),(0x4f4514,'NDS-001%d.wav'),
        (0x4f4504,'NDS-0030.wav'),(0x4f44f4,'NDS-0040.wav'),(0x4f44e4,'NDS-0050.wav'),
        (0x4f81f4,'magic-%03d.ani'),(0x4f8204,'magic-%03d.spr'),(0x4f8214,'%sMagicRes\\%s'),
        (0x4f823c,'NDS-4%03d.wav'),(0x4f8da4,'Sound\\NDS-8%03d.mid')]:
        strings.append(expect_string(data,pe,va,text))
    payload={
      'schema':1,
      'evidence':'VERIFIED_STATIC_ORIGINAL_FIXED_HASH',
      'input':{'sha256':digest,'expected_sha256':EXPECTED_SHA256},
      'verified_signatures':sig,
      'ani_timing':{
        'layer_record_size':0x490,
        'file_raw_timing_offset':0x488,
        'runtime_layer_raw_timing_offset':0x444,
        'timer_unit':'milliseconds',
        'common_frame_threshold_formula':'1000.0 / raw_timing milliseconds',
        'common_rate_interpretation':'raw_timing behaves as authored frames-per-second-like rate in the common ANI consumers',
        'examples':{'5':200.0,'10':100.0,'30':1000.0/30.0,'200':5.0},
        'common_consumer_sites':cadence,
        'special_consumers':[{'va':'0x004960b4','formula':'1000.0 / (raw_timing - 1.0)','warning':'caller-specific transform; do not apply globally'}],
      },
      'battle_presentation':{
        'damage_gate':'old HP - incoming signed absolute HP > 0',
        'sequence':['choose hit presentation/audio family','play hit SFX','set character action state 3','write incoming signed absolute HP'],
        'state_3_resource_binding':'character action loader formats the action index into B%03d_%02d.ani; state 3 therefore selects the _03 action when present',
        'hit_sfx_families':['NDS-000%d.wav','NDS-001%d.wav','NDS-0030.wav','NDS-0040.wav','NDS-0050.wav'],
      },
      'action_end_policy':{
        'dispatch_range':'states 2..8 at final frame',
        'state_2':'reset to state 0; optionally state 1 when movement condition is active',
        'state_3':'reset to state 0; optionally state 1 when movement condition is active',
        'state_4':'continue/loop through normal frame advance path',
        'state_5':'reset to state 0; optionally state 1 when movement condition is active',
        'state_6':'continue/loop through normal frame advance path',
        'state_7':'reset to state 0',
        'state_8':'clear active flag and return terminal code 2',
        'semantic_warning':'numeric state behavior is verified; death meaning for state 7/8 is not established by this evidence',
      },
      'audio':{
        'verified_templates':strings,
        'bgm_template':{'text':'Sound\\NDS-8%03d.mid','status':'VERIFIED_ZONE_RUNTIME'},
        'bgm_selection':{
          'zone_id_global':'0x004f48b4',
          'normal':'lookup current zone metadata; use record +8 track id when nonnegative; fallback track 5',
          'special_zones':{'1010':'track 7 or 8 by mode','1020':'track 7 or 8 by mode','1050':'track 7 or 8 by mode','1300':'track 7 or 8 by mode'},
          'zone_2600':'normal selected track is retained; an additional special side path runs when object 0x1a2 exists',
        },
        'magic_sfx_template':{'text':'NDS-4%03d.wav','status':'VERIFIED_NEAR_MAGICRES_RUNTIME','warning':'exact spell-id/stage mapping remains unverified'},
      },
      'unresolved':['death action semantic binding','attack impact frame within state 2','MagicRes placement/anchor/blend/stage composition','SMF flags -> foreground occlusion semantics']
    }
    a.out.parent.mkdir(parents=True,exist_ok=True); a.out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'out':str(a.out),'cadence_sites':len(cadence),'verified_signatures':len(sig)},ensure_ascii=False))
    return 0
if __name__=='__main__': raise SystemExit(main())
