import type {ClassFamily} from './inventory.ts';
import type {M6EvidenceLevel} from './m6-evidence.ts';
import {validateM6EquipmentRule} from './m6-equipment.ts';
import type {M6EquipmentRule,M6EquipmentSlot} from './m6-equipment.ts';
import {validateM6StageTrack} from './m6-stage-promotion.ts';
import type {M6StageTrack} from './m6-stage-promotion.ts';

export type S25CanonicalStageEvidence={
  id:number;
  progression:{
    expValues:readonly number[];
    nextClassRaw:readonly number[];
  };
  transitionHint:{
    sourceEvidence:'VERIFIED-STATIC-ORIGINAL';
    interpretationEvidence:'INFERRED';
    candidateNextStageId:number|null;
  };
};

export type S25CanonicalItemEvidence={
  itemId:number;
  equipPosition:number;
  equipLevel:number;
  classFlags:readonly number[];
};

export type S25ItemRuleAdapterPolicy={
  slotByEquipPosition:Readonly<Record<number,M6EquipmentSlot|undefined>>;
  slotProvenance:M6EvidenceLevel;
  classFlagIndexByFamily:Readonly<Record<ClassFamily,number>>;
  useClassFlagHypothesis:boolean;
  enforceEquipLevel:boolean;
  authority:'RECONSTRUCTION_POLICY';
};

export type S25CanonicalProgressionAdapterResult={
  authority:'S25_SINGLE_CANONICAL_DUAL_CLASS_MATRIX';
  track:M6StageTrack;
  stages:readonly {
    id:number;
    expValues:readonly number[];
    nextClassRaw:readonly number[];
    sourceEvidence:'VERIFIED-STATIC-ORIGINAL';
    transitionInterpretation:'INFERRED';
  }[];
  retailExpFormula:'SERVER-BOUNDARY';
  retailPromotionTrigger:'SERVER-BOUNDARY';
};

export type S25ItemRuleAdapterResult={
  rule:M6EquipmentRule;
  authority:'RECONSTRUCTION_POLICY';
  rawEvidence:{
    equipPosition:{value:number;evidence:'VERIFIED-STATIC-ORIGINAL'};
    equipLevel:{value:number;evidence:'VERIFIED-STATIC-ORIGINAL';enforcement:'SERVER-BOUNDARY'};
    classFlags:{values:readonly number[];evidence:'VERIFIED-STATIC-ORIGINAL';consumerMapping:'INFERRED'};
  };
};

const integerIn=(value:unknown,min:number,max:number):value is number=>
  Number.isInteger(value)&&(value as number)>=min&&(value as number)<=max;

export function stageTrackFromS25CanonicalEvidence(
  id:string,
  family:ClassFamily,
  stages:readonly S25CanonicalStageEvidence[],
):M6StageTrack{
  if(!Array.isArray(stages)||stages.length<1)throw new Error('Missing S25 canonical stages');
  for(let index=0;index<stages.length;index+=1){
    const stage=stages[index];
    if(!integerIn(stage.id,0,999999))throw new Error('Invalid S25 canonical stage id');
    if(!Array.isArray(stage.progression.expValues)||stage.progression.expValues.length<1||stage.progression.expValues.some((value:unknown)=>!integerIn(value,0,Number.MAX_SAFE_INTEGER)))throw new Error('Invalid S25 authored EXP rows');
    if(!Array.isArray(stage.progression.nextClassRaw)||stage.progression.nextClassRaw.length!==stage.progression.expValues.length||stage.progression.nextClassRaw.some((value:unknown)=>!integerIn(value,0,999999)))throw new Error('Invalid S25 next-class rows');
    if(stage.transitionHint.sourceEvidence!=='VERIFIED-STATIC-ORIGINAL'||stage.transitionHint.interpretationEvidence!=='INFERRED')throw new Error('Invalid S25 transition provenance');
    const expected=index<stages.length-1?stages[index+1].id:null;
    if(stage.transitionHint.candidateNextStageId!==expected)throw new Error('S25 canonical stage chain drift');
    const finalRaw=stage.progression.nextClassRaw.at(-1);
    if(expected===null){
      if(finalRaw!==stage.id)throw new Error('S25 terminal stage must remain self-referential');
    }else if(finalRaw!==expected)throw new Error('S25 next-class raw value does not match canonical chain');
  }
  return validateM6StageTrack({
    id,
    family,
    stageIds:stages.map(stage=>stage.id),
    provenance:'VERIFIED-STATIC-ORIGINAL',
  });
}

export function canonicalProgressionEvidenceFromS25(
  id:string,
  family:ClassFamily,
  stages:readonly S25CanonicalStageEvidence[],
):S25CanonicalProgressionAdapterResult{
  const track=stageTrackFromS25CanonicalEvidence(id,family,stages);
  return{
    authority:'S25_SINGLE_CANONICAL_DUAL_CLASS_MATRIX',
    track,
    stages:stages.map(stage=>({
      id:stage.id,
      expValues:[...stage.progression.expValues],
      nextClassRaw:[...stage.progression.nextClassRaw],
      sourceEvidence:'VERIFIED-STATIC-ORIGINAL',
      transitionInterpretation:'INFERRED',
    })),
    retailExpFormula:'SERVER-BOUNDARY',
    retailPromotionTrigger:'SERVER-BOUNDARY',
  };
}

export function equipmentRuleFromS25CanonicalItem(
  item:S25CanonicalItemEvidence,
  policy:S25ItemRuleAdapterPolicy,
):S25ItemRuleAdapterResult{
  if(!item||!integerIn(item.itemId,0,Number.MAX_SAFE_INTEGER)||!integerIn(item.equipPosition,0,9999)||!integerIn(item.equipLevel,0,9999))throw new Error('Invalid S25 item evidence');
  if(!Array.isArray(item.classFlags)||item.classFlags.length!==10||item.classFlags.some(value=>value!==0&&value!==1))throw new Error('Invalid S25 item class flags');
  const slot=policy.slotByEquipPosition[item.equipPosition];
  if(!slot)throw new Error('S25 equip-position requires an explicit reconstruction slot mapping');
  const familyIndexes=Object.entries(policy.classFlagIndexByFamily) as Array<[ClassFamily,number]>;
  if(familyIndexes.some(([,index])=>!integerIn(index,0,item.classFlags.length-1)))throw new Error('Invalid S25 class-flag family mapping');

  const allowedFamilies=policy.useClassFlagHypothesis
    ?familyIndexes.filter(([,index])=>item.classFlags[index]===1).map(([family])=>family)
    :undefined;

  const rule=validateM6EquipmentRule({
    itemId:item.itemId,
    slot,
    ...(allowedFamilies?.length?{allowedFamilies}:{}),
    ...(policy.enforceEquipLevel&&item.equipLevel>0?{minimumLevel:item.equipLevel}:{}),
    provenance:{
      itemRecord:'VERIFIED-STATIC-ORIGINAL',
      slot:policy.slotProvenance,
      classRestriction:policy.useClassFlagHypothesis?'INFERRED':'SERVER-BOUNDARY',
      stageRestriction:'SERVER-BOUNDARY',
      levelRestriction:policy.enforceEquipLevel?'VERIFIED-STATIC-ORIGINAL':'SERVER-BOUNDARY',
      statContribution:'SERVER-BOUNDARY',
    },
  });

  return{
    rule,
    authority:policy.authority,
    rawEvidence:{
      equipPosition:{value:item.equipPosition,evidence:'VERIFIED-STATIC-ORIGINAL'},
      equipLevel:{value:item.equipLevel,evidence:'VERIFIED-STATIC-ORIGINAL',enforcement:'SERVER-BOUNDARY'},
      classFlags:{values:[...item.classFlags],evidence:'VERIFIED-STATIC-ORIGINAL',consumerMapping:'INFERRED'},
    },
  };
}
