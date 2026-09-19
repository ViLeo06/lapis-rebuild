#!/usr/bin/env python3
"""Normalize S25 fixed-hash probe output into the stable M6 consumer contract."""
from __future__ import annotations
import argparse, json
from pathlib import Path

ABILITY={0:'class_id',1:'portrait_id',2:'hp',3:'mp',4:'con',5:'mcon',6:'wis',7:'mwis',8:'str',9:'mstr',10:'dex',11:'mdex',12:'int',13:'mint',14:'reg',15:'mreg',16:'sp',17:'mov',18:'hit',19:'elu',20:'blow',21:'mhit',22:'melu',23:'ran',24:'cla',25:'cry',26:'actic',27:'atic',28:'rtic',29:'mtic',30:'command',31:'acom',32:'pcom',33:'gold',34:'exp',35:'attribute',36:'weapon_damage',37:'defence',38:'magic_damage',39:'magic_defence',43:'shadow',44:'class_name_raw',45:'class_description_raw'}
PATTERN=['pattern_id','name','phase1_front','draw_type_1f','phase1_back','draw_type_1b','start_tick_1','motion_kind_1','phase2_front','draw_type_2f','phase2_back','draw_type_2b','start_tick_2','motion_kind_2','phase3_front','draw_type_3f','phase3_back','draw_type_3b','start_tick_3','motion_kind_3','hit_frame','special_motion','burst_speed','background_shake','sound']
ITEM={0:'item_id',3:'equip_position',5:'equip_level',21:'minimum_damage',22:'maximum_damage',23:'defence',24:'attack_range',25:'magic_power',26:'minimum_magic_damage',27:'maximum_magic_damage',28:'magic_defence',29:'magic_range',31:'accuracy_rate',32:'evasion_rate',33:'critical_rate_raw',34:'magic_accuracy_rate',35:'magic_evasion_rate',47:'con',48:'str',49:'dex',50:'int',51:'wis',52:'reg',53:'name',54:'description'}
EVIDENCE=['VERIFIED','VERIFIED-STATIC-ORIGINAL','VERIFIED-HISTORICAL','RECOVERED_SECONDARY','INFERRED','SERVER-BOUNDARY','RECONSTRUCTION_POLICY','UNVERIFIED']

def fields(raw,m): return {name:raw[i] for i,name in m.items() if i < len(raw)}
def col(rows,index): return [r['raw_fields'][index] for r in rows]

def build(d):
    families={}
    for fam in ('swordsman','wizard'):
        src=[s for s in d['stages'] if s['family']==fam]
        abilities=[fields(s['authored_ability']['raw_fields'],ABILITY) for s in src]
        common={k:v for k,v in abilities[0].items() if all(a.get(k)==v for a in abilities)}
        stages=[]
        for s,a in zip(src,abilities):
            rows=s['levelabl_rows']['rows']; last=rows[-1]['raw_fields']; cid=s['stage_id']; next_id=last[10]
            stages.append({
                'ordinal':s['stage_ordinal'],'id':cid,'name':a['class_name_raw'],'description':a['class_description_raw'],
                'ability':{k:a[k] for k in ('hp','mp','hit','elu','blow','mhit','melu','gold','exp','shadow')},
                'progression':{
                    'levels':col(rows,1),'exp_values':col(rows,13),'magic_levelup_raw':col(rows,8),'points_raw':col(rows,9),
                    'next_class_raw':col(rows,10),'magic_or_skill_ref':col(rows,14),
                    'growth_per_row':{'con':col(rows,2),'wis':col(rows,3),'str':col(rows,4),'dex':col(rows,5),'int':col(rows,6),'reg':col(rows,7)},
                },
                'transition_hint':{'source_evidence':'VERIFIED-STATIC-ORIGINAL','interpretation_evidence':'INFERRED','last_internal_level':last[1],'next_class_raw':next_id,'candidate_next_stage_id':next_id if next_id!=cid and next_id in d['target_stage_ids'][fam] else None},
                'magic_skill_ids':sorted({x for x in col(rows,14) if isinstance(x,int) and x>0}),
                'use_technique_refs':sorted({x for x in col(rows,15) if isinstance(x,int) and x>0}),
                'hire_mercenary_refs':sorted({x for x in col(rows,16) if isinstance(x,int) and x>0}),
            })
        families[fam]={'common_ability':common,'stages':stages}
    skills={k:{kk:vv for kk,vv in v.items() if kk!='raw_fields'} for k,v in d['skills_by_id'].items()}
    patterns={}
    for k,v in d['magic_patterns_by_id'].items():
        row=v['raw_fields']; full={name:row[i] for i,name in enumerate(PATTERN)}
        patterns[k]={x:full[x] for x in ('name','start_tick_1','start_tick_2','start_tick_3','hit_frame','special_motion','burst_speed','background_shake','sound')}
    items={}
    for k,v in d['representative_items'].items():
        raw=v['raw_fields']; items[k]={'fields':fields(raw,ITEM),'class_flags':raw[7:17]}
    tables={name:meta['sha256'] for name,meta in d['table_sources'].items()}
    return {
      'schema':3,'authority':'S25_SINGLE_CANONICAL_DUAL_CLASS_MATRIX','source':'fixed-hash mainland 2.2 client static data','evidence_vocabulary':EVIDENCE,
      'provenance':{'m6_baseline':'4aea5b81fa4cca00c9a80b3ff2389eb391c09b17','fixed_hash_run':35476887492,'installer_sha256':'c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88','setlib_sha256':'ce1bb0425b367289f144e0780147f7c63abb833733035949853ce70dfb3c82fe','table_hashes':tables,'drive_visual_inventory':{'path':'lapis-rebuild-assets/30_parsed/tables/client-files-verified-20260915.csv','sha256':'ccef8ede9627a27f167c63d0896c32c006b12de49af068f466199808b2f849ce','cross_check':'200/200 target ANI/SPR files present'}},
      'authored_field_notes':{'ability_tokens':[v for _,v in sorted(ABILITY.items())],'dex_not_agi':True,'m_star_formula':'UNVERIFIED','levelabl_growth_columns':['con','wis','str','dex','int','reg']},
      'visual':{'evidence':'VERIFIED-STATIC-ORIGINAL','stem':'B<stage_id>','slots':['00','01','02','03','05'],'extensions':['ani','spr'],'directions':['S','SW','W','NW','N','NE','E','SE'],'semantics':{'00':'RECOVERED_SECONDARY:idle','01':'RECOVERED_SECONDARY:move','02':'RECOVERED_SECONDARY:attack-or-cast','03':'VERIFIED-STATIC-ORIGINAL:hit-reaction','05':'UNVERIFIED'},'cross_check':'200/200 files'},
      'families':families,'skills_by_id':skills,'magic_pattern_refs':patterns,
      'equipment':{'schema_evidence':'VERIFIED-STATIC-ORIGINAL','equip_position_column':3,'equip_level':{'column':5,'header':'장착렙','enforcement':'SERVER-BOUNDARY'},'class_flag_headers_columns_7_16':['보','비','기','수','창','궁','승','신','마','사'],'class_flag_mapping_hypothesis':{'evidence':'INFERRED','swordsman_cla':0,'wizard_cla':9,'note':'ability.cla 0/9 aligns with representative item flag indexes; no retail consumer chain recovered'},'representative_items':items,'final_class_stage_eligibility':'SERVER-BOUNDARY','current_web_assignment':'RECONSTRUCTION_POLICY'},
      'readiness':{'raw_fields_evidence':'VERIFIED-STATIC-ORIGINAL','fields':['mov','ran','cla','actic','atic','rtic','mtic','command'],'runtime_semantics_evidence':'RECOVERED_SECONDARY'},
      'boundaries':{'retail_promotion_level_or_trigger':'SERVER-BOUNDARY','promotion_quest_or_other_conditions':'SERVER-BOUNDARY','retail_exp_formula':'SERVER-BOUNDARY','experience_value_server_semantics':'SERVER-BOUNDARY','growth_column_application_formula':'SERVER-BOUNDARY','skill_unlock_condition':'SERVER-BOUNDARY','complete_skill_roster':'UNVERIFIED','equipment_final_class_stage_eligibility':'SERVER-BOUNDARY','item_level_requirement_enforcement':'SERVER-BOUNDARY','retail_damage_hit_critical_defence_magic_formula':'SERVER-BOUNDARY','retail_reward_semantics_for_ability_gold_exp':'SERVER-BOUNDARY','quest_npc_class_stage_decision':'SERVER-BOUNDARY','magicres_placement_blend_stage_semantics':'UNVERIFIED'},
      'consumer_contract':{'s26':'consume swordsman authored data; promotion/growth/unlock rules remain ReconstructionSwordsmanProgressionPolicy','s27':'same for wizard; preserve MP/Magic authored values and MagicRes boundary','s28':'consume progression and item schema; final quest/equipment/reward authority is reconstruction policy','s29':'preserve provenance; playable M6 is not restored retail server formulas'}
    }

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('source',type=Path); ap.add_argument('--out',type=Path,required=True); a=ap.parse_args()
    out=build(json.loads(a.source.read_text(encoding='utf-8'))); a.out.parent.mkdir(parents=True,exist_ok=True); a.out.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print(json.dumps({'stages':sum(len(v['stages']) for v in out['families'].values()),'skills':len(out['skills_by_id']),'output':str(a.out)}))
if __name__=='__main__': main()
