#!/usr/bin/env python3
"""Generate synthetic assets for CI, never disguised as original game art."""
from pathlib import Path
import argparse,json,sys,hashlib
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools/convert'))
from spr import write_png

def map_payload(out:Path,map_id:int,name:str,width:int,height:int,cw:int,ch:int,color:tuple[int,int,int,int]):
    png=f'maps/map-{map_id:04d}.png';collision=f'maps/map-{map_id:04d}-collision.json';inspector=f'maps/map-{map_id:04d}-inspector.json'
    write_png(out/png,width,height,bytes(color)*(width*height))
    grid=[1 if (x+y)%2==0 and 1<x<cw-2 and 1<y<ch-2 else 0 for x in range(cw) for y in range(ch)]
    (out/collision).write_text(json.dumps({'width':cw,'height':ch,'grid_order':'first-major','grid':grid}))
    mw=max(1,width//64);mh=max(1,height//32)
    (out/inspector).write_text(json.dumps({'width':mw,'height':mh,'cells':[{'resource_id':map_id+1,'directory_path':[0,0,0,0]}]*(mw*mh)}))
    return {'id':map_id,'name':name,'png':png,'collision':collision,'inspector':inspector,'render':{'width':width,'height':height},'evidence':'SYNTHETIC'}

def synthetic_content(out:Path)->dict:
    content=out/'content';quests=content/'quests';quests.mkdir(parents=True)
    npc={'schema':1,'source':'synthetic','npcs':[{'npc_id':11,'declared_entry_count':1,'name':'Synthetic Guide','entries':[{'line':2,'disabled':False,'record_type':1,'raw_numeric':[150,17,200,12],'text':'Synthetic source-backed NPC line.'}],'active_entry_count':1,'disabled_entry_count':0}],'comments':[],'summary':{'npc_count':1}}
    quest={'schema':1,'source':'synthetic','steps':[{'number':1,'events':[{'kind':'speaker','speaker':5000},{'kind':'line','command':'CANCEL','speaker':5000,'text':'Synthetic source-backed quest line.'}]}],'summary':{'step_count':1,'dialogue_line_count':1}}
    summary={'schema':1,'evidence':'SYNTHETIC','scope':'Synthetic content fixture; not original game text.','npc':{'npc_count':1,'active_entry_count':1,'disabled_entry_count':0},'quests':[{'source':'synthetic','step_count':1,'dialogue_line_count':1}]}
    tutorial={'schema':1,'source':'synthetic','talks':[{'talk_id':1,'line':1,'end_line':5,'events':[{'kind':'speaker','speaker':5000},{'kind':'text','text':'Synthetic tutorial text.'},{'kind':'control','command':'NEXT'}],'transition':{'kind':'Tutorial_NextStep'}}],'comments':[],'summary':{'talk_count':1,'talk_ids':[1],'text_line_count':1,'control_counts':{'NAME':1,'NEXT':1},'transition_counts':{'Tutorial_NextStep':1}}}
    help_script={'schema':1,'source':'synthetic','helps':[{'help_id':1,'line':1,'steps':[{'number':1,'line':2,'records':[[1,0,0,0]]}]}],'comments':[],'summary':{'help_count':1,'help_ids':[1],'step_count':1,'record_count':1,'comment_count':0}}
    tutorial_help_summary={'schema':1,'evidence':'SYNTHETIC','tutorial':{'talk_count':1,'talk_ids':[1],'text_line_count':1,'control_counts':{'NAME':1,'NEXT':1},'transition_counts':{'Tutorial_NextStep':1}},'help_script':{'help_count':1,'help_ids':[1],'step_count':1,'record_count':1,'comment_count':0}}
    (content/'summary.json').write_text(json.dumps(summary));(content/'npc-script.json').write_text(json.dumps(npc));(quests/'quest0.json').write_text(json.dumps(quest));(content/'tutorial.json').write_text(json.dumps(tutorial));(content/'help-script.json').write_text(json.dumps(help_script));(content/'tutorial-help-summary.json').write_text(json.dumps(tutorial_help_summary))
    return {'evidence':'SYNTHETIC','scope':'Synthetic content fixture; not original game text.','summary':'content/summary.json','npc_script':'content/npc-script.json','quests':{'0':'content/quests/quest0.json'},'tutorial':'content/tutorial.json','help_script':'content/help-script.json','tutorial_help_summary':'content/tutorial-help-summary.json'}

def generate(out:Path):
    if out.exists():raise FileExistsError('Refusing existing pack')
    out.mkdir(parents=True)
    maps={'0':map_payload(out,0,'Synthetic fixture',1536,768,47,47,(38,62,52,255)),'1':map_payload(out,1,'Synthetic city',1024,640,31,39,(49,54,68,255))}
    manifest={'schema':1,'provenance':{'kind':'synthetic','evidence':'VERIFIED'},'characters':{},'map':maps['0'],'maps':maps,'effects':{},'content':synthetic_content(out)}
    for cid,label,color in [(100,'swordsman',(205,185,110,255)),(109,'wizard',(136,139,196,255))]:
        char={'class_id':cid,'label':label,'actions':{}}
        for action in ['00','01','02','03','05']:
            n=11 if cid==109 and action=='05' else 4
            rel=f'characters/B{cid}/{action}';bounds=[]
            for i in range(n*8):
                left=-12-i%2;bounds.append({'index':i,'left':left,'top':-42,'right':12,'bottom':2})
                write_png(out/f'{rel}/frames/frame-{i:03d}.png',12-left,44,bytes(color)*(12-left)*44)
            anim={'action_slot':action,'frames_per_direction':n,'raw_timing':5,'directions':[[d*n+j for j in range(n)] for d in range(8)],'spr_frame_count':n*8,'frame_bounds':bounds}
            (out/f'{rel}/animation.json').write_text(json.dumps(anim));char['actions'][action]={'animation':f'{rel}/animation.json','frames_dir':f'{rel}/frames'}
        manifest['characters'][str(cid)]=char
    effect_rel='effects/magic-001/frames';effect_bounds=[]
    for i,size in enumerate((24,30,36)):
        left=-size//2;top=-size//2;effect_bounds.append({'index':i,'left':left,'top':top,'right':left+size,'bottom':top+size})
        rgba=bytes((210,170+i*20,90,180))*(size*size);write_png(out/f'{effect_rel}/frame-{i:03d}.png',size,size,rgba)
    manifest['effects']['1']={'resource_id':1,'layer_name':'FOCUS','raw_timing':30,'frame_count':3,'sequence':[0,1,2],'frames_dir':effect_rel,'frame_bounds':effect_bounds,'sequence_evidence':'SYNTHETIC','timing_semantics':'UNVERIFIED','placement_semantics':'UNVERIFIED','warning':'Synthetic diagnostic effect'}
    (out/'prototype.json').write_text(json.dumps(manifest))
    files={p.relative_to(out).as_posix():{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':p.stat().st_size} for p in sorted(out.rglob('*')) if p.is_file()}
    (out/'asset-index.json').write_text(json.dumps({'schema':1,'files':files},indent=2))
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--out',type=Path,required=True);a=ap.parse_args();generate(a.out)
