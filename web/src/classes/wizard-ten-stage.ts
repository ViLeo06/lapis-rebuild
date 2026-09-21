import classRows from '../../../data/classes/wizard.json' with { type: 'json' };
import {battleProfileForClass, magicReadinessCost} from '../battle-profile.ts';
import {skillById} from '../content/skills/skill-catalog.ts';
import {
  legacyTrainingCompatibility,
  reconcileEquipmentForCharacter,
  validateEquipment,
} from '../progression/equipment.ts';
import {
  createInventory,
  itemMetadata,
  knownItemIds,
  validateInventory,
} from '../progression/inventory.ts';
import type {InventoryState} from '../progression/inventory.ts';
import {
  applyExperience,
  initialProgression,
  validateProgression,
} from '../progression/progression.ts';
import type {LevelUpEvent, ProgressionState} from '../progression/progression.ts';
import type {M6EvidenceLevel} from '../progression/m6-evidence.ts';

export type M6EvidenceRef = Readonly<{
  level:M6EvidenceLevel;
  source:string;
  note:string;
}>;

export const WIZARD_STAGE_IDS=Object.freeze([
  109,119,129,139,149,159,169,179,189,199,
] as const);
export type WizardStageId=(typeof WIZARD_STAGE_IDS)[number];

export const WIZARD_REPRESENTATIVE_SKILL_IDS=Object.freeze([19101,19201,19301] as const);
export type WizardRepresentativeSkillId=(typeof WIZARD_REPRESENTATIVE_SKILL_IDS)[number];

export type WizardActionSlot='00'|'01'|'02'|'03'|'05';

export type WizardStageDefinition=Readonly<{
  stageId:WizardStageId;
  stageIndex:number;
  displayName:string;
  descriptionRaw:string;
  authored:Readonly<{
    portraitId:number;
    hp:number;
    mp:number;
    move:number;
    hit:number;
    magicHit:number;
    range:number;
    stageEntrySkillId:number;
  }>;
  visual:Readonly<{
    family:string;
    bodyPrefix:'Body_';
    actionSlots:readonly Readonly<{
      slot:WizardActionSlot;
      aniPath:string;
      sprPath:string;
      semantic:'idle'|'move'|'attack-or-cast'|'hit-reaction'|'unknown-special';
      semanticEvidence:M6EvidenceRef;
    }>[];
    provenance:M6EvidenceRef;
  }>;
  provenance:Readonly<{
    classRow:M6EvidenceRef;
    stageEntrySkillId:M6EvidenceRef;
    authoredMp:M6EvidenceRef;
  }>;
}>;

type AuthoredWizardRow=Readonly<{
  class_id:number;
  portrait_id:number;
  hp:number;
  mp:number;
  move:number;
  hit:number;
  magic_hit:number;
  range:number;
  class_name_raw:string;
  class_description_raw:string;
  stage_entry_skill_id:number;
}>;

const CLASS_ROW_EVIDENCE=Object.freeze({
  level:'VERIFIED-STATIC-ORIGINAL',
  source:'fixed-hash 2.2 Set.lib/ability.atr -> data/classes/wizard.json',
  note:'The ten wizard rows and exported HP/MP/move/hit/magic-hit/range/name/stage-entry-skill fields are authored client data.',
} as const satisfies M6EvidenceRef);

const VISUAL_FAMILY_EVIDENCE=Object.freeze({
  level:'VERIFIED-STATIC-ORIGINAL',
  source:'S25 fixed-hash dual-class visual inventory',
  note:'For B109..B199 every _00/_01/_02/_03/_05 ANI and matching SPR resource exists in the fixed-hash 2.2 client inventory.',
} as const satisfies M6EvidenceRef);

const SECONDARY_ACTION_EVIDENCE=Object.freeze({
  level:'RECOVERED_SECONDARY',
  source:'S5 visual runtime recovery + existing compatibility runtime',
  note:'The resource slot is original; idle/move/attack-or-cast labels for _00/_01/_02 remain secondary semantics.',
} as const satisfies M6EvidenceRef);

const HIT_ACTION_EVIDENCE=Object.freeze({
  level:'VERIFIED-STATIC-ORIGINAL',
  source:'S5 authoritative HP-decrease consumer',
  note:'Character action state 3 selects _03 and is runtime-linked to hit reaction.',
} as const satisfies M6EvidenceRef);

const SPECIAL_ACTION_EVIDENCE=Object.freeze({
  level:'UNVERIFIED',
  source:'fixed-hash B109..B199 _05 resource inventory',
  note:'The _05 resources exist, but a universal semantic remains unverified.',
} as const satisfies M6EvidenceRef);

const STAGE_ENTRY_SKILL_EVIDENCE=Object.freeze({
  level:'VERIFIED-STATIC-ORIGINAL',
  source:'S25 levelabl.atr exact joins',
  note:'Numeric stage-entry Magic references are preserved exactly, including 19101..19501 and zero values; this does not prove retail unlock conditions.',
} as const satisfies M6EvidenceRef);

const AUTHORED_MP_EVIDENCE=Object.freeze({
  level:'VERIFIED-STATIC-ORIGINAL',
  source:'fixed-hash ability.atr / S25 canonical matrix',
  note:'Stage maximum MP values are authored client fields. Derived magic-attack formula remains unverified.',
} as const satisfies M6EvidenceRef);

export const WIZARD_EQUIPMENT_PROVENANCE=Object.freeze({
  level:'RECONSTRUCTION_POLICY',
  source:'data/items/training-catalog.json training.role/training.slot',
  note:'Item rows/text are retail-derived, but current wizard equipment compatibility is a replaceable offline policy.',
} as const satisfies M6EvidenceRef);

export const WIZARD_SKILL_AVAILABILITY_PROVENANCE=Object.freeze({
  level:'RECONSTRUCTION_POLICY',
  source:'M5.1-compatible adapter over the existing S11 wizard showcase roster',
  note:'The three modeled S11 wizard skills remain available across all M6 stages to preserve the accepted M5.1 player contract. Authored 19401/19501 references remain evidence, not fabricated gameplay implementations.',
} as const satisfies M6EvidenceRef);

const ACTION_SLOTS=Object.freeze(['00','01','02','03','05'] as const);
const ACTION_SEMANTICS:Readonly<Record<WizardActionSlot,Readonly<{
  semantic:WizardStageDefinition['visual']['actionSlots'][number]['semantic'];
  evidence:M6EvidenceRef;
}>>>=Object.freeze({
  '00':Object.freeze({semantic:'idle',evidence:SECONDARY_ACTION_EVIDENCE}),
  '01':Object.freeze({semantic:'move',evidence:SECONDARY_ACTION_EVIDENCE}),
  '02':Object.freeze({semantic:'attack-or-cast',evidence:SECONDARY_ACTION_EVIDENCE}),
  '03':Object.freeze({semantic:'hit-reaction',evidence:HIT_ACTION_EVIDENCE}),
  '05':Object.freeze({semantic:'unknown-special',evidence:SPECIAL_ACTION_EVIDENCE}),
});

const rowById=new Map<number,AuthoredWizardRow>(
  (classRows as AuthoredWizardRow[]).map(row=>[row.class_id,row]),
);
if(rowById.size!==WIZARD_STAGE_IDS.length||!WIZARD_STAGE_IDS.every(id=>rowById.has(id))){
  throw new Error('Incomplete authored wizard ten-stage table');
}

function stageIndex(stageId:WizardStageId):number{return WIZARD_STAGE_IDS.indexOf(stageId);}

function buildStage(stageId:WizardStageId):WizardStageDefinition{
  const row=rowById.get(stageId);
  if(!row)throw new Error(`Missing authored wizard stage ${stageId}`);
  const family=`B${stageId}`;
  return Object.freeze({
    stageId,
    stageIndex:stageIndex(stageId),
    displayName:row.class_name_raw,
    descriptionRaw:row.class_description_raw,
    authored:Object.freeze({
      portraitId:row.portrait_id,
      hp:row.hp,
      mp:row.mp,
      move:row.move,
      hit:row.hit,
      magicHit:row.magic_hit,
      range:row.range,
      stageEntrySkillId:row.stage_entry_skill_id,
    }),
    visual:Object.freeze({
      family,
      bodyPrefix:'Body_' as const,
      actionSlots:Object.freeze(ACTION_SLOTS.map(slot=>Object.freeze({
        slot,
        aniPath:`Char/${family}_${slot}.ani`,
        sprPath:`Char/${family}_${slot}.spr`,
        semantic:ACTION_SEMANTICS[slot].semantic,
        semanticEvidence:ACTION_SEMANTICS[slot].evidence,
      }))),
      provenance:VISUAL_FAMILY_EVIDENCE,
    }),
    provenance:Object.freeze({
      classRow:CLASS_ROW_EVIDENCE,
      stageEntrySkillId:STAGE_ENTRY_SKILL_EVIDENCE,
      authoredMp:AUTHORED_MP_EVIDENCE,
    }),
  });
}

export const WIZARD_STAGES:readonly WizardStageDefinition[]=Object.freeze(WIZARD_STAGE_IDS.map(buildStage));
const STAGE_BY_ID=new Map<WizardStageId,WizardStageDefinition>(WIZARD_STAGES.map(stage=>[stage.stageId,stage]));

export function isWizardStageId(value:number):value is WizardStageId{
  return Number.isInteger(value)&&(WIZARD_STAGE_IDS as readonly number[]).includes(value);
}
export function wizardStageById(value:string|number):WizardStageDefinition{
  const stageId=Number(value);
  if(!isWizardStageId(stageId))throw new Error(`Unsupported wizard stage ${String(value)}`);
  return STAGE_BY_ID.get(stageId)!;
}

export type ReconstructionWizardProgressionPolicy=Readonly<{
  id:string;
  provenance:'RECONSTRUCTION_POLICY';
  promotionRequiredLevelByStage:Readonly<Record<WizardStageId,number|null>>;
  representativeSkillUnlockStageBySkillId:Readonly<Record<WizardRepresentativeSkillId,WizardStageId>>;
  notes:readonly string[];
}>;

export const RECONSTRUCTION_WIZARD_PROGRESSION_POLICY:ReconstructionWizardProgressionPolicy=Object.freeze({
  id:'m6-wizard-ten-stage-v1',
  provenance:'RECONSTRUCTION_POLICY',
  promotionRequiredLevelByStage:Object.freeze({
    109:10,119:20,129:30,139:40,149:50,159:60,169:70,179:80,189:90,199:null,
  }),
  representativeSkillUnlockStageBySkillId:Object.freeze({
    19101:109,19201:109,19301:109,
  }),
  notes:Object.freeze([
    'The retired server promotion levels, promotion quests and derived MATK formula are not recovered.',
    'Ten-level promotion intervals are centralized offline reconstruction policy and can be replaced without changing authored stage rows.',
    'The M5.1 three-skill wizard contract is preserved at every M6 stage. 19401 and 19501 are exact authored Magic references in S25 but are not invented as playable skills until a complete runtime behavior contract is established.',
    'MagicRes placement/blend/stage composition remains UNVERIFIED.',
  ]),
});

export type WizardPromotionRequirement=Readonly<{
  fromStageId:WizardStageId;
  toStageId:WizardStageId;
  requiredLevel:number;
  provenance:'RECONSTRUCTION_POLICY';
}>;

export function wizardPromotionRequirementForStage(value:string|number):WizardPromotionRequirement|null{
  const stage=wizardStageById(value);
  const requiredLevel=RECONSTRUCTION_WIZARD_PROGRESSION_POLICY.promotionRequiredLevelByStage[stage.stageId];
  if(requiredLevel===null)return null;
  const next=WIZARD_STAGE_IDS[stage.stageIndex+1];
  if(next===undefined)throw new Error('Missing next wizard stage');
  return Object.freeze({fromStageId:stage.stageId,toStageId:next,requiredLevel,provenance:'RECONSTRUCTION_POLICY'});
}

function isRepresentativeSkillId(skillId:number):skillId is WizardRepresentativeSkillId{
  return Number.isInteger(skillId)&&(WIZARD_REPRESENTATIVE_SKILL_IDS as readonly number[]).includes(skillId);
}
export function availableWizardSkillIds(value:string|number):readonly WizardRepresentativeSkillId[]{
  const stage=wizardStageById(value);
  return Object.freeze(WIZARD_REPRESENTATIVE_SKILL_IDS.filter(skillId=>{
    const unlock=RECONSTRUCTION_WIZARD_PROGRESSION_POLICY.representativeSkillUnlockStageBySkillId[skillId];
    return stage.stageIndex>=wizardStageById(unlock).stageIndex;
  }));
}
export function wizardSkillAvailable(value:string|number,skillId:number):boolean{
  return isRepresentativeSkillId(skillId)&&availableWizardSkillIds(value).includes(skillId);
}
export function wizardSkillMpCost(skillId:number):number{
  if(!isRepresentativeSkillId(skillId))throw new Error(`Unsupported S27 representative skill ${skillId}`);
  return skillById(skillId).mpCost;
}
export function wizardMagicReadinessCost(value:string|number,maximum=20):number{
  const stage=wizardStageById(value);
  return magicReadinessCost(battleProfileForClass(stage.stageId),maximum);
}

export function isWizardEquipmentEligible(value:string|number,itemId:number):boolean{
  const stage=wizardStageById(value);
  try{return legacyTrainingCompatibility(String(stage.stageId),itemMetadata(itemId));}catch{return false;}
}
export function wizardEligibleEquipmentIds(value:string|number):readonly number[]{
  wizardStageById(value);
  return Object.freeze(knownItemIds().filter(itemId=>isWizardEquipmentEligible(value,itemId)));
}

export type WizardProgressionState=Readonly<{
  family:'wizard';
  stageId:WizardStageId;
  progression:ProgressionState;
  inventory:InventoryState;
}>;
export type WizardExperienceResult=Readonly<{state:WizardProgressionState;levelUps:readonly LevelUpEvent[]}>;
export type WizardPromotionEvent=Readonly<{
  type:'stage_promotion';
  fromStageId:WizardStageId;
  toStageId:WizardStageId;
  requiredLevel:number;
  provenance:'RECONSTRUCTION_POLICY';
}>;
export type WizardPromotionResult=Readonly<{state:WizardProgressionState;event:WizardPromotionEvent}>;

export function validateWizardProgressionState(raw:unknown):WizardProgressionState{
  if(!raw||typeof raw!=='object')throw new Error('Invalid wizard progression state');
  const input=raw as {family?:unknown;stageId?:unknown;progression?:unknown;inventory?:unknown};
  if(input.family!=='wizard')throw new Error('Invalid wizard family');
  const stage=wizardStageById(String(input.stageId));
  const progression=validateProgression(input.progression);
  const inventory=validateEquipment(validateInventory(input.inventory),String(stage.stageId));
  return Object.freeze({family:'wizard' as const,stageId:stage.stageId,progression,inventory});
}
export function createInitialWizardState(inventory:InventoryState=createInventory()):WizardProgressionState{
  return validateWizardProgressionState({family:'wizard',stageId:109,progression:initialProgression(),inventory});
}
export function applyWizardExperience(state:WizardProgressionState,amount:number):WizardExperienceResult{
  const current=validateWizardProgressionState(state);
  const applied=applyExperience(current.progression,amount);
  return Object.freeze({
    state:validateWizardProgressionState({...current,progression:applied.state}),
    levelUps:Object.freeze([...applied.levelUps]),
  });
}
export function canPromoteWizard(state:WizardProgressionState):boolean{
  const current=validateWizardProgressionState(state);
  const requirement=wizardPromotionRequirementForStage(current.stageId);
  return requirement!==null&&current.progression.level>=requirement.requiredLevel;
}
export function promoteWizard(state:WizardProgressionState):WizardPromotionResult{
  const current=validateWizardProgressionState(state);
  const requirement=wizardPromotionRequirementForStage(current.stageId);
  if(!requirement)throw new Error('Wizard is already at maximum stage');
  if(current.progression.level<requirement.requiredLevel){
    throw new Error(`Wizard stage ${current.stageId} requires level ${requirement.requiredLevel} for promotion`);
  }
  const reconciled=reconcileEquipmentForCharacter(current.inventory,String(requirement.toStageId));
  const next=validateWizardProgressionState({
    family:'wizard',stageId:requirement.toStageId,progression:current.progression,inventory:reconciled.inventory,
  });
  return Object.freeze({
    state:next,
    event:Object.freeze({
      type:'stage_promotion' as const,
      fromStageId:requirement.fromStageId,
      toStageId:requirement.toStageId,
      requiredLevel:requirement.requiredLevel,
      provenance:'RECONSTRUCTION_POLICY' as const,
    }),
  });
}
