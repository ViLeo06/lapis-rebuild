#!/usr/bin/env python3
"""Static Quest/NPC runtime probe for the fixed Lapis 2.2 client.

Never executes NeoDark.exe and never exports dialogue/story payload text.
SMF joins are raw numeric-equality candidates only, not proven bindings.
"""
from __future__ import annotations
import argparse, hashlib, json, re, struct, sys
from collections import Counter
from pathlib import Path

EXPECTED_SHA256='432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7'
TOKENS={
'SCRIPT':(0,0x4f72dc,0x44df7a,0x44e17c),'SELECT':(1,0x4f72d4,0x44df99,0x44e19a),
'NAME':(2,0x4f72cc,0x44dfbf,0x44e1a6),'INVENTORY':(3,0x4f72c0,0x44dfe5,0x44e1c9),
'CANCEL':(4,0x4f72b8,0x44e00b,0x44e1f1),'REPAIR':(5,0x4f72b0,0x44e031,0x44e210)}
RESOURCES={
'quest_archive':('Quest.lib',0x4f6c10),'quest_file_format':('Quest%d.TXT',0x4f72ec),
'npc_script':('NPCScript.txt',0x4f77bc),'tutorial':('Tutorial.txt',0x4f7384),
'help_script':('HelpScript.txt',0x4f6c00),'prologue':('Prologue.txt',0x4f7ae4),
'neohelp':('Neohelp',0x4f6a50),'warp_tdg':(r'dlg\Warp.Tdg',0x4f4bd4),
'employ_tdg':(r'dlg\Employ.Tdg',0x4f4d40),'findnpc':('FINDNPC',0x4f9cb4)}
SIG={
0x44dca0:'8b54240833c089811c010000',0x44ddb6:'5168ec724f0052',0x44dea0:'8b96180100005552',
0x44da44:'c64424046ac644240555',0x44da50:'c644240449c6442405e7',
0x44da5a:'668b8614010000668b8e18010000',0x44da78:'8b8496b002000083f801',0x44da95:'83f8047514',
0x44dab5:'8d542404b91897a400526a08',0x44df85:'8b961c010000899c96b0020000',
0x44dfa4:'8b8e1c010000c7848eb002000001000000',0x44dfca:'8b861c010000c78486b002000002000000',
0x44dff0:'8b961c010000c78496b002000003000000',0x44e016:'8b8e1c010000c7848eb002000004000000',
0x44e03a:'8b861c0100007510c78486b002000005000000',0x44e175:'ff248d80e24400',
0x44e1e2:'8b8efc0000006a65e8818afcff',0x44e229:'8b8efc00000068ce000000e8378afcff',
0x4907ac:'0fbf58025768a20100000fbf38',0x4907d8:'53578bc8e8bfd4fbff',0x48cc87:'458bcb55e8103b0000',
0x457de0:'8b44240433d28a108991040100000fbf5001',0x457df2:'8991080100000fbf4003898124010000',
0x457e02:'e8f9f5ffff',0x457648:'3b88040100007460',0x45790a:'ff151c254e00',
0x4178f0:'68404d4f00e896630b00568bcfe84e740100',0x417ea4:'68d44b4f00e8e25d0b00568bcfe8ca370500',
0x4a8a87:'68b49c4f0052e88c740100'}


def sha(data): return hashlib.sha256(data).hexdigest()
def cstr(data,o):
    e=data.find(b'\0',o)
    if e<0: raise ValueError('unterminated string')
    return data[o:e].decode('ascii')

def pe(data):
    if data[:2]!=b'MZ': raise ValueError('not MZ')
    p=struct.unpack_from('<I',data,0x3c)[0]
    if data[p:p+4]!=b'PE\0\0': raise ValueError('not PE')
    coff=p+4; n=struct.unpack_from('<H',data,coff+2)[0]; optsz=struct.unpack_from('<H',data,coff+16)[0]; opt=coff+20
    if struct.unpack_from('<H',data,opt)[0]!=0x10b: raise ValueError('not PE32')
    base=struct.unpack_from('<I',data,opt+28)[0]; imp=struct.unpack_from('<II',data,opt+104)
    secs=[]; st=opt+optsz
    for i in range(n):
        o=st+i*40; name=data[o:o+8].split(b'\0',1)[0].decode('ascii','replace')
        vs,va,rs,rp=struct.unpack_from('<IIII',data,o+8); ch=struct.unpack_from('<I',data,o+36)[0]
        secs.append((name,vs,va,rs,rp,ch))
    return base,imp,secs

def rva_off(rva,secs):
    for _,vs,va,rs,rp,_ in secs:
        if va<=rva<va+max(vs,rs):
            d=rva-va
            if d>=rs: raise ValueError(f'RVA 0x{rva:x} unbacked')
            return rp+d
    raise ValueError(f'RVA 0x{rva:x} missing')
def voff(va,base,secs): return rva_off(va-base,secs)
def at(data,base,secs,va,hx):
    b=bytes.fromhex(hx); o=voff(va,base,secs)
    if data[o:o+len(b)]!=b: raise ValueError(f'signature mismatch 0x{va:08x}')
def refs(data,base,secs,target):
    needle=struct.pack('<I',target); out=[]
    for _,_,va,rs,rp,ch in secs:
        if not ch&0x20000000: continue
        body=data[rp:rp+rs]; start=0
        while True:
            j=body.find(needle,start)
            if j<0: break
            out.append(base+va+j); start=j+1
    return out

def imports(data,base,imp,secs):
    out={}; pos=rva_off(imp[0],secs)
    while True:
        oft,_,_,name,ft=struct.unpack_from('<IIIII',data,pos); pos+=20
        if not any((oft,name,ft)): break
        dll=cstr(data,rva_off(name,secs)); q=rva_off(oft or ft,secs); i=0
        while True:
            t=struct.unpack_from('<I',data,q+4*i)[0]
            if not t: break
            if not t&0x80000000: out[base+ft+4*i]={'dll':dll,'name':cstr(data,rva_off(t,secs)+2)}
            i+=1
    return out

def receive_opcodes(data,base,secs,target):
    trans=voff(0x48e90c,base,secs); jumps=voff(0x48e808,base,secs); out=[]
    for op in range(1,0xaa):
        idx=data[trans+op-1]
        if struct.unpack_from('<I',data,jumps+4*idx)[0]==target: out.append(op)
    return out

def verify_binary(path):
    data=path.read_bytes(); digest=sha(data)
    if digest!=EXPECTED_SHA256: raise ValueError(f'hash mismatch: {digest}')
    base,imp,secs=pe(data)
    for va,hx in SIG.items(): at(data,base,secs,va,hx)
    for name,(typ,sva,xva,_) in TOKENS.items():
        if cstr(data,voff(sva,base,secs))!=name or xva not in refs(data,base,secs,sva): raise ValueError(f'{name} xref mismatch')
    for _,(text,sva) in RESOURCES.items():
        if cstr(data,voff(sva,base,secs))!=text: raise ValueError(f'{text} mismatch')
    jt=list(struct.unpack_from('<6I',data,voff(0x44e280,base,secs)))
    expected=[TOKENS[k][3] for k in ('SCRIPT','SELECT','NAME','INVENTORY','CANCEL','REPAIR')]
    if jt!=expected: raise ValueError('quest jump table mismatch')
    ops=receive_opcodes(data,base,secs,0x48cc87)
    if ops!=[0x2b]: raise ValueError(f'quest opcode mismatch {ops}')
    imps=imports(data,base,imp,secs); sr=imps.get(0x4e251c)
    if not sr or sr['name']!='SetRect': raise ValueError('SetRect import mismatch')
    commands=[]
    effects={
      'SCRIPT':'local mode 0 + payload copy; no direct local reward/warp/battle/recruit action in this branch',
      'SELECT':'local mode 1 + payload copy; positive selection is uplink final WORD',
      'NAME':'payload copied to secondary name/label buffer; returns consume-next marker',
      'INVENTORY':'payload copy + owner/control lookup using id 0x65; high-level window meaning not asserted',
      'CANCEL':'local mode 4; user-action path closes UI without the 8-byte quest uplink',
      'REPAIR':'payload copy + owner/control lookup using id 0xCE; high-level window meaning not asserted'}
    for name in ('SCRIPT','SELECT','NAME','INVENTORY','CANCEL','REPAIR'):
        typ,sva,xva,bva=TOKENS[name]
        commands.append({'token':name,'type_id':typ,'string_va':f'0x{sva:08x}','parser_xref_immediate_va':f'0x{xva:08x}',
                         'dispatch_branch_va':f'0x{bva:08x}','observed':effects[name]})
    resources={k:{'text':t,'string_va':f'0x{v:08x}','xref_immediate_vas':[f'0x{x:08x}' for x in refs(data,base,secs,v)]}
               for k,(t,v) in RESOURCES.items()}
    return {
      'input':{'name':path.name,'size':len(data),'sha256':digest},
      'quest_parser':{'state_init_va':'0x0044dca0','file_step_parser_va':'0x0044dcd0','quest_file_format':'Quest%d.TXT','step_format':'STEP%d',
        'state_fields':{'quest_index':'+0x114','step_index':'+0x118','entry_count':'+0x11c','current_entry':'+0x454'},
        'command_tokens':commands,'jump_table_va':'0x0044e280','jump_table_targets':[f'0x{x:08x}' for x in jt]},
      'quest_transport':{
        'downlink':{'receive_opcode':'0x2b','receive_case_va':'0x0048cc87','loader_va':'0x004907a0','payload':['int16 quest_index +0','int16 step_index +2'],'ui_control_id':'0x01a2'},
        'uplink':{'function_va':'0x0044da30','size_bytes':8,'mode_6_header':['0x6a','0x55'],'other_mode_header':['0x49','0xe7'],
          'fields_after_header':['uint16 quest_index','uint16 step_index','uint16 selection_or_zero'],
          'select_rule':'type 1 requires selection > 0','cancel_rule':'type 4 closes UI before send','generic_rule':'other observed types write final WORD 0'}},
      'npc_script_runtime':{
        'payload_decoder_va':'0x00457de0','payload':['uint8 block_id +0 -> object +0x104','int16 value +1 -> object +0x108','int16 value +3 -> object +0x124'],
        'parser_call_va':'0x00457e02','block_selector_compare_va':'0x00457648','record_rect_call_va':'0x0045790a','record_rect_import':{'iat_va':'0x004e251c',**sr},
        'conclusion':'NPCScript block id is runtime-selected, while record numeric fields feed UI rectangle geometry; NPCScript is not a map-placement table'},
      'tdg_runtime':{'status':'dialog resource factory evidence only; internal TDG command semantics not asserted',
        'employ':{'resource':r'dlg\Employ.Tdg','path_push_va':'0x004178f0','constructor_target_va':'0x0042ed50'},
        'warp':{'resource':r'dlg\Warp.Tdg','path_push_va':'0x00417ea4','constructor_target_va':'0x0046b680'}},
      'findnpc_runtime':{'command':'FINDNPC','compare_xref_immediate_va':'0x004a8a88','object_vector_globals':['0x00a3a1b0','0x00a3a1b4'],'object_name_field':'+0x08','matched_coordinate_fields':['+0x5c','+0x60'],
        'warning':'runtime name lookup is verified, but no Quest/NPC numeric-ID join is proven by this path'},
      'resource_xrefs':resources,
      'verification':{'fixed_hash':True,'exact_signatures_checked':len(SIG),'setrect_iat_checked':True,'quest_receive_opcode_derived':True,'original_program_executed':False}}

def decode(data):
    for enc in ('gb18030','utf-8-sig'):
        try: text=data.decode(enc)
        except UnicodeDecodeError: continue
        if '\0' not in text: return text
    raise ValueError('unsupported encoding')
def source_metadata(root):
    qs=sorted([p for p in root.iterdir() if p.is_file() and re.fullmatch(r'Quest\d+\.txt',p.name,re.I)],key=lambda p:int(re.search(r'\d+',p.name).group()))
    actions=Counter(); speakers=set(); speaker_tokens=set(); qrows=[]; known={'SCRIPT','SELECT','CANCEL','INVENTORY','REPAIR'}
    for p in qs:
        raw=p.read_bytes(); lines=[x.strip() for x in decode(raw).splitlines()]; i=0; steps=0
        while i<len(lines):
            tok=lines[i]; i+=1
            if not tok or tok.startswith(';'): continue
            if re.fullmatch(r'STEP\d+',tok): steps+=1; continue
            if tok=='NAME':
                if i>=len(lines): raise ValueError(f'{p.name}: NAME without value')
                v=lines[i]; i+=1; speakers.add(int(v)) if v.isdigit() else speaker_tokens.add(v); continue
            if tok in known:
                actions[tok]+=1
                if i>=len(lines): raise ValueError(f'{p.name}: {tok} without payload')
                i+=1; continue
            raise ValueError(f'{p.name}: unexpected structural token')
        qrows.append({'source':p.name,'size':len(raw),'sha256':sha(raw),'step_count':steps})
    np=next((p for p in root.iterdir() if p.is_file() and p.name.lower()=='npcscript.txt'),None)
    if not np: raise FileNotFoundError('NPCScript.txt')
    raw=np.read_bytes(); ids=[]; types=Counter(); active=disabled=0; declared=None; seen=0
    for original in decode(raw).splitlines():
        line=original.strip()
        if not line: continue
        dis=line.startswith(';'); clean=line[1:].strip() if dis else line
        if dis and clean=='999': continue
        h=re.fullmatch(r'(\d+),(\d+),(.*)',clean) if not dis else None
        if h and clean.count(',')==2:
            if declared is not None and seen!=declared: raise ValueError('NPCScript count mismatch')
            ids.append(int(h.group(1))); declared=int(h.group(2)); seen=0; continue
        parts=clean.split(',',5)
        if declared is None or len(parts)!=6: raise ValueError('NPCScript malformed record')
        nums=[int(x.strip()) for x in parts[:5]]; types[nums[0]]+=1
        if dis: disabled+=1
        else: active+=1; seen+=1
    if declared is not None and seen!=declared: raise ValueError('NPCScript count mismatch')
    return {'evidence':'VERIFIED_STATIC_CONTENT_METADATA','scope':'IDs/counts/hashes only; text payloads omitted',
      'quests':qrows,'quest_action_counts':dict(sorted(actions.items())),'quest_speaker_numeric_ids':sorted(speakers),'quest_speaker_non_numeric_tokens':sorted(speaker_tokens),
      'npc_script':{'source':np.name,'size':len(raw),'sha256':sha(raw),'npc_ids':ids,'active_entry_count':active,'disabled_entry_count':disabled,'record_type_counts':{str(k):v for k,v in sorted(types.items())}}}
def candidates(meta):
    out={}
    for v in meta['quest_speaker_numeric_ids']: out.setdefault(v,[]).append('quest_speaker_numeric_id')
    for v in meta['npc_script']['npc_ids']: out.setdefault(v,[]).append('npc_script_block_id')
    return out
def match_entity_records(map_id,records,cand):
    out=[]
    for r in records:
        rel=[]
        for f in ('object_id','kind'):
            for ns in cand.get(int(r[f]),[]): rel.append({'record_field':f,'candidate_namespace':ns,'value':int(r[f])})
        if rel:
            name=str(r.get('name',''))
            out.append({'map_id':map_id,'x':int(r['x']),'y':int(r['y']),'kind':int(r['kind']),'object_id':int(r['object_id']),'layer':int(r['layer']),'flags':int(r['flags']),
                        'name_sha256':hashlib.sha256(name.encode('ascii','replace')).hexdigest(),'relations':rel,'evidence':'RAW_NUMERIC_EQUALITY_ONLY'})
    return out
def scan_maps(client,meta):
    sys.path.insert(0,str(Path(__file__).resolve().parent/'convert')); from map_bundle import parse_smf
    cand=candidates(meta); matches=[]; errors=[]; parsed=0; ids=Counter(); kinds=Counter(); paths={p.resolve():p for pat in ('*.smf','*.SMF') for p in (client/'SGRes').glob(pat)}
    for p in sorted(paths.values(),key=lambda x:x.name.lower()):
        m=re.fullmatch(r'sz-(\d+)\.smf',p.name,re.I)
        if not m: continue
        try: doc=parse_smf(p)
        except Exception as e: errors.append({'file':p.name,'error_type':type(e).__name__}); continue
        parsed+=1
        for r in doc['records']:
            if int(r['object_id']): ids[int(r['object_id'])]+=1
            kinds[int(r['kind'])]+=1
        matches+=match_entity_records(int(m.group(1)),doc['records'],cand)
    return {'evidence':'VERIFIED_STATIC_MAP_SCAN_WITH_RAW_EQUALITY_CANDIDATES','smf_files_parsed':parsed,'parse_error_count':len(errors),'parse_errors':errors[:20],
      'candidate_match_count':len(matches),'candidate_matches':sorted(matches,key=lambda r:(r['map_id'],r['x'],r['y'],r['object_id'],r['kind'])),
      'nonzero_object_id_top':ids.most_common(30),'kind_top':kinds.most_common(30),
      'interpretation_rule':'numeric equality is not a runtime binding without an independent ID-domain call chain'}
def tdg(client):
    out={}
    for key,rel in {'warp':'Dlg/Warp.Tdg','employ':'Dlg/Employ.Tdg','repair':'Dlg/REPAIR.Tdg'}.items():
        p=client/rel
        if p.is_file():
            b=p.read_bytes(); out[key]={'path':rel,'size':len(b),'sha256':sha(b),'dialog_library_marker':b.startswith(b'DIALOG LIBRARY.')}
    return out

def main():
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument('binary',type=Path); ap.add_argument('--quest-dir',type=Path,required=True); ap.add_argument('--client-root',type=Path); ap.add_argument('--out',type=Path,required=True); a=ap.parse_args()
    meta=source_metadata(a.quest_dir.resolve()); report={'schema':1,'evidence':'VERIFIED_STATIC_RUNTIME_BINDING_PROBE','scope':'fixed 2.2 resources + fixed decompressed NeoDark; static only; no dialogue text','binary':verify_binary(a.binary.resolve()),'content_metadata':meta}
    if a.client_root:
        root=a.client_root.resolve(); report['map_entity_candidates']=scan_maps(root,meta); report['tdg_resources']=tdg(root)
    a.out.parent.mkdir(parents=True,exist_ok=True); a.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'quest_files':len(meta['quests']),'speaker_ids':len(meta['quest_speaker_numeric_ids']),'npc_ids':len(meta['npc_script']['npc_ids']),'map_matches':report.get('map_entity_candidates',{}).get('candidate_match_count'),'output':str(a.out)}))
if __name__=='__main__': raise SystemExit(main())
