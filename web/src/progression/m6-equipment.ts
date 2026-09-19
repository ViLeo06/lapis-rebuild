import {classFamilyForCharacter} from './equipment.ts';
import {itemMetadata,knownItemIds,quantityOf,validateInventory} from './inventory.ts';
import type {ClassFamily,InventoryState} from './inventory.ts';
import type {M6EvidenceLevel} from './m6-evidence.ts';

export type M6EquipmentSlot='weapon'|'armor'|'accessory';
export type M6EquipmentStats={
  attack?:number;
  defense?:number;
  magicAttack?:number;
  magicDefense?:number;
  maxHp?:number;
  maxMp?:number;
};
export type M6EquipmentRule={
  itemId:number;
  slot:M6EquipmentSlot;
  allowedFamilies?:readonly ClassFamily[];
  allowedStageIds?:readonly number[];
  minimumLevel?:number;
  statContribution?:M6EquipmentStats;
  provenance:{
    itemRecord:M6EvidenceLevel;
    slot:M6EvidenceLevel;
    classRestriction:M6EvidenceLevel;
    stageRestriction:M6EvidenceLevel;
    levelRestriction:M6EvidenceLevel;
    statContribution:M6EvidenceLevel;
  };
};
export type M6EquipmentCharacterContext={
  characterId:string;
  family:ClassFamily;
  stageId:number;
  level:number;
};
export type M6EquipmentRejectReason='class-restricted'|'stage-restricted'|'level-restricted';
export type M6EquipmentEligibilityDecision={
  allowed:boolean;
  reasons:M6EquipmentRejectReason[];
  provenance:M6EquipmentRule['provenance'];
};
export type M6EquipmentLoadout={weapon:number|null;armor:number|null;accessory:number|null};
export type M6EquipmentReconcileResult={loadout:M6EquipmentLoadout;unequipped:number[]};

const slots:readonly M6EquipmentSlot[]=['weapon','armor','accessory'];
const evidenceLevels=new Set<M6EvidenceLevel>([
  'VERIFIED','VERIFIED-STATIC-ORIGINAL','VERIFIED-HISTORICAL','RECOVERED_SECONDARY',
  'INFERRED','SERVER-BOUNDARY','RECONSTRUCTION_POLICY','UNVERIFIED',
]);

const integerIn=(value:unknown,min:number,max:number):value is number=>
  Number.isInteger(value)&&(value as number)>=min&&(value as number)<=max;

function assertContext(context:M6EquipmentCharacterContext):void{
  if(!['swordsman','wizard'].includes(context.family))throw new Error('Invalid M6 equipment family');
  if(!integerIn(context.stageId,0,999999)||!integerIn(context.level,1,999))throw new Error('Invalid M6 equipment character context');
  const characterFamily=classFamilyForCharacter(context.characterId);
  const stageFamily=classFamilyForCharacter(String(context.stageId));
  if(characterFamily!==context.family||stageFamily!==context.family)throw new Error('M6 equipment character/stage family mismatch');
}

function validateStats(raw:M6EquipmentStats|undefined):M6EquipmentStats|undefined{
  if(raw===undefined)return undefined;
  const out:M6EquipmentStats={};
  for(const key of ['attack','defense','magicAttack','magicDefense','maxHp','maxMp'] as const){
    const value=raw[key];
    if(value===undefined)continue;
    if(!Number.isFinite(value)||Math.abs(value)>1000000)throw new Error('Invalid M6 equipment stat contribution');
    out[key]=value;
  }
  return out;
}

export function validateM6EquipmentRule(rule:M6EquipmentRule):M6EquipmentRule{
  if(!rule||typeof rule!=='object'||!integerIn(rule.itemId,0,Number.MAX_SAFE_INTEGER)||!slots.includes(rule.slot))throw new Error('Invalid M6 equipment rule');
  const allowedFamilies=rule.allowedFamilies===undefined?undefined:[...rule.allowedFamilies];
  if(allowedFamilies&&(allowedFamilies.length===0||new Set(allowedFamilies).size!==allowedFamilies.length||allowedFamilies.some(value=>!['swordsman','wizard'].includes(value))))throw new Error('Invalid M6 equipment family restriction');
  const allowedStageIds=rule.allowedStageIds===undefined?undefined:[...rule.allowedStageIds];
  if(allowedStageIds&&(allowedStageIds.length===0||new Set(allowedStageIds).size!==allowedStageIds.length||allowedStageIds.some(value=>!integerIn(value,0,999999))))throw new Error('Invalid M6 equipment stage restriction');
  if(rule.minimumLevel!==undefined&&!integerIn(rule.minimumLevel,1,999))throw new Error('Invalid M6 equipment level restriction');
  if(!rule.provenance||Object.keys(rule.provenance).length!==6)throw new Error('Incomplete M6 equipment provenance');
  for(const value of Object.values(rule.provenance))if(!evidenceLevels.has(value))throw new Error('Invalid M6 equipment evidence');
  return{
    ...rule,
    ...(allowedFamilies?{allowedFamilies}:{}),
    ...(allowedStageIds?{allowedStageIds}:{}),
    ...(rule.statContribution?{statContribution:validateStats(rule.statContribution)}:{}),
    provenance:{...rule.provenance},
  };
}

export function legacyTrainingEquipmentRules():M6EquipmentRule[]{
  return knownItemIds().map(itemId=>{
    const item=itemMetadata(itemId);
    return validateM6EquipmentRule({
      itemId,
      slot:item.slot,
      allowedFamilies:[item.classRestriction],
      provenance:{
        itemRecord:item.textEvidence==='VERIFIED'?'VERIFIED-STATIC-ORIGINAL':'UNVERIFIED',
        slot:'UNVERIFIED',
        classRestriction:'UNVERIFIED',
        stageRestriction:'SERVER-BOUNDARY',
        levelRestriction:'SERVER-BOUNDARY',
        statContribution:'UNVERIFIED',
      },
    });
  });
}

export function evaluateM6EquipmentEligibility(
  rawRule:M6EquipmentRule,
  context:M6EquipmentCharacterContext,
):M6EquipmentEligibilityDecision{
  const rule=validateM6EquipmentRule(rawRule);
  assertContext(context);
  const reasons:M6EquipmentRejectReason[]=[];
  if(rule.allowedFamilies&&!rule.allowedFamilies.includes(context.family))reasons.push('class-restricted');
  if(rule.allowedStageIds&&!rule.allowedStageIds.includes(context.stageId))reasons.push('stage-restricted');
  if(rule.minimumLevel!==undefined&&context.level<rule.minimumLevel)reasons.push('level-restricted');
  return{allowed:reasons.length===0,reasons,provenance:{...rule.provenance}};
}

export function emptyM6EquipmentLoadout():M6EquipmentLoadout{
  return{weapon:null,armor:null,accessory:null};
}

export function validateM6EquipmentLoadoutShape(raw:unknown):M6EquipmentLoadout{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid M6 equipment loadout');
  const value=raw as Record<string,unknown>;
  const keys=Object.keys(value);
  if(keys.length!==3||keys.some(key=>!slots.includes(key as M6EquipmentSlot)))throw new Error('Unknown M6 equipment loadout field');
  const out=emptyM6EquipmentLoadout();
  for(const slot of slots){
    const itemId=value[slot];
    if(itemId!==null&&!integerIn(itemId,0,Number.MAX_SAFE_INTEGER))throw new Error('Invalid M6 equipment item id');
    out[slot]=itemId as number|null;
  }
  const ids=Object.values(out).filter((value):value is number=>value!==null);
  if(new Set(ids).size!==ids.length)throw new Error('Duplicate M6 equipped item');
  return out;
}

export function validateM6EquipmentLoadout(
  raw:unknown,
  inventory:InventoryState,
  rules:readonly M6EquipmentRule[],
  context:M6EquipmentCharacterContext,
):M6EquipmentLoadout{
  const loadout=validateM6EquipmentLoadoutShape(raw);
  const validInventory=validateInventory(inventory);
  assertContext(context);
  const ruleMap=new Map(rules.map(entry=>{const rule=validateM6EquipmentRule(entry);return[rule.itemId,rule] as const;}));
  if(ruleMap.size!==rules.length)throw new Error('Duplicate M6 equipment rule');
  for(const slot of slots){
    const itemId=loadout[slot];
    if(itemId===null)continue;
    if(quantityOf(validInventory,itemId)<1)throw new Error('M6 equipped item is not owned');
    const rule=ruleMap.get(itemId);
    if(!rule||rule.slot!==slot)throw new Error('M6 equipment slot mismatch');
    const decision=evaluateM6EquipmentEligibility(rule,context);
    if(!decision.allowed)throw new Error('M6 equipped item is ineligible: '+decision.reasons.join(','));
  }
  return loadout;
}

export function equipM6Item(
  rawLoadout:M6EquipmentLoadout,
  inventory:InventoryState,
  rules:readonly M6EquipmentRule[],
  context:M6EquipmentCharacterContext,
  slot:M6EquipmentSlot,
  itemId:number|null,
):M6EquipmentLoadout{
  const current=validateM6EquipmentLoadout(rawLoadout,inventory,rules,context);
  const next={...current,[slot]:itemId};
  return validateM6EquipmentLoadout(next,inventory,rules,context);
}

export function reconcileM6EquipmentLoadout(
  rawLoadout:M6EquipmentLoadout,
  inventory:InventoryState,
  rules:readonly M6EquipmentRule[],
  context:M6EquipmentCharacterContext,
):M6EquipmentReconcileResult{
  const loadout=validateM6EquipmentLoadoutShape(rawLoadout);
  const validInventory=validateInventory(inventory);
  assertContext(context);
  const ruleMap=new Map(rules.map(entry=>{const rule=validateM6EquipmentRule(entry);return[rule.itemId,rule] as const;}));
  const next={...loadout};
  const unequipped:number[]=[];
  for(const slot of slots){
    const itemId=next[slot];
    if(itemId===null)continue;
    const rule=ruleMap.get(itemId);
    const valid=quantityOf(validInventory,itemId)>0&&rule?.slot===slot&&evaluateM6EquipmentEligibility(rule,context).allowed;
    if(!valid){unequipped.push(itemId);next[slot]=null;}
  }
  return{loadout:validateM6EquipmentLoadoutShape(next),unequipped};
}

export function m6EquipmentStatContribution(
  loadout:M6EquipmentLoadout,
  rules:readonly M6EquipmentRule[],
):Required<M6EquipmentStats>{
  const valid=validateM6EquipmentLoadoutShape(loadout);
  const ruleMap=new Map(rules.map(entry=>{const rule=validateM6EquipmentRule(entry);return[rule.itemId,rule] as const;}));
  const total={attack:0,defense:0,magicAttack:0,magicDefense:0,maxHp:0,maxMp:0};
  for(const itemId of Object.values(valid)){
    if(itemId===null)continue;
    const stats=ruleMap.get(itemId)?.statContribution;
    if(!stats)continue;
    for(const key of Object.keys(total) as Array<keyof typeof total>)total[key]+=stats[key]??0;
  }
  return total;
}
