import {playableClassById} from '../content/classes/class-catalog.ts';
import {
  M7_SWORDSMAN_SKILL_KEYS,
  M7_SWORDSMAN_SKILL_BALANCE_POLICY,
  availableM7SwordsmanSkillKeys,
  createDeveloperM7SwordsmanSkillProgression,
  createM7SwordsmanSkillProgression,
  investM7SwordsmanSkillPoint,
  m7SwordsmanSkill,
  m7SwordsmanSkillLevel,
  validateM7SwordsmanSkillProgression,
} from '../classes/swordsman-seven-stage-skills.ts';
import type {
  M7SwordsmanSkillKey,
  M7SwordsmanSkillProgressionState,
} from '../classes/swordsman-seven-stage-skills.ts';
import {
  M7_WIZARD_SKILL_KEYS,
  createM7WizardSkillBook,
  developerM7WizardSkillBook,
  m7WizardAllowedSkillKeys,
  m7WizardSkillByKey,
  m7WizardSkillLevel,
  reconcileM7WizardSkillBookForLevel,
  upgradeM7WizardSkill,
  validateM7WizardSkillBook,
} from '../content/skills/wizard-seven-stage.ts';
import type {
  M7WizardSkillBook,
  M7WizardSkillKey,
} from '../content/skills/wizard-seven-stage.ts';

export type M7SkillCommandId=`swordsman:${M7SwordsmanSkillKey}`|`wizard:${M7WizardSkillKey}`;

export type M7IntegratedSkillState=
  | Readonly<{family:'swordsman';swordsman:M7SwordsmanSkillProgressionState;provenance:'RECONSTRUCTION_POLICY'}>
  | Readonly<{family:'wizard';wizard:M7WizardSkillBook;provenance:'RECONSTRUCTION_POLICY'}>;

export type M7RuntimeSkillCommand=Readonly<{
  id:M7SkillCommandId;
  family:'swordsman'|'wizard';
  skillKey:M7SwordsmanSkillKey|M7WizardSkillKey;
  authoredSkillId:number|null;
  displayName:string;
  skillLevel:1|2|3|4|5|6;
  mpCost:number;
  readinessCost:number;
  target:'enemy'|'enemy-area'|'self';
  provenance:'RECONSTRUCTION_POLICY';
}>;

export const M7_SKILL_PROGRESSION_POLICY=Object.freeze({
  id:'M7IntegratedSkillProgressionPolicy',
  provenance:'RECONSTRUCTION_POLICY' as const,
  unlockGrantsLevelOne:true,
  maxSkillLevel:6,
  lateSkillCommandIdentity:'internal-string-key; no fabricated retail numeric id',
});

function familyFor(characterId:string|number):'swordsman'|'wizard'{
  const family=playableClassById(characterId).family;
  if(family!=='swordsman'&&family!=='wizard')throw new Error('Unsupported M7 skill family');
  return family;
}

function normalizeWizardUnlockedLevelOne(book:M7WizardSkillBook,playerLevel:number):M7WizardSkillBook{
  let current=validateM7WizardSkillBook(book,playerLevel,false);
  for(const key of m7WizardAllowedSkillKeys(playerLevel)){
    if(current.levels[key]===0)current=upgradeM7WizardSkill(current,playerLevel,key);
  }
  return current;
}

export function createM7IntegratedSkillState(characterId:string|number,playerLevel:number):M7IntegratedSkillState{
  const family=familyFor(characterId);
  if(family==='swordsman'){
    return Object.freeze({family,swordsman:createM7SwordsmanSkillProgression(playerLevel),provenance:'RECONSTRUCTION_POLICY'});
  }
  return Object.freeze({family,wizard:normalizeWizardUnlockedLevelOne(createM7WizardSkillBook(playerLevel),playerLevel),provenance:'RECONSTRUCTION_POLICY'});
}

export function createM7DeveloperSkillState(characterId:string|number,playerLevel:number):M7IntegratedSkillState{
  const family=familyFor(characterId);
  if(family==='swordsman'){
    return Object.freeze({family,swordsman:createDeveloperM7SwordsmanSkillProgression(),provenance:'RECONSTRUCTION_POLICY'});
  }
  return Object.freeze({family,wizard:developerM7WizardSkillBook(playerLevel),provenance:'RECONSTRUCTION_POLICY'});
}

export function validateM7IntegratedSkillState(
  raw:M7IntegratedSkillState,
  characterId:string|number,
  playerLevel:number,
  allowDeveloper=false,
):M7IntegratedSkillState{
  const family=familyFor(characterId);
  if(!raw||raw.family!==family||raw.provenance!=='RECONSTRUCTION_POLICY')throw new Error('M7 skill state family mismatch');
  if(family==='swordsman'){
    if(raw.family!=='swordsman')throw new Error('Expected swordsman M7 skill state');
    const validated=validateM7SwordsmanSkillProgression(raw.swordsman,playerLevel);
    if(validated.developerOverride&&!allowDeveloper)throw new Error('Developer swordsman skill state cannot enter normal persistence');
    return Object.freeze({family,swordsman:validated,provenance:'RECONSTRUCTION_POLICY'});
  }
  if(raw.family!=='wizard')throw new Error('Expected wizard M7 skill state');
  return Object.freeze({family,wizard:validateM7WizardSkillBook(raw.wizard,playerLevel,allowDeveloper),provenance:'RECONSTRUCTION_POLICY'});
}

export function reconcileM7IntegratedSkillState(
  state:M7IntegratedSkillState,
  characterId:string|number,
  oldLevel:number,
  newLevel:number,
):M7IntegratedSkillState{
  if(!Number.isInteger(oldLevel)||!Number.isInteger(newLevel)||oldLevel<1||newLevel<oldLevel||newLevel>65)throw new Error('Invalid M7 skill level reconciliation');
  const family=familyFor(characterId);
  if(state.family!==family)throw new Error('M7 skill state family mismatch');
  if(family==='wizard'){
    if(state.family!=='wizard')throw new Error('Expected wizard skill state');
    const reconciled=reconcileM7WizardSkillBookForLevel(state.wizard,oldLevel,newLevel);
    return Object.freeze({family,wizard:normalizeWizardUnlockedLevelOne(reconciled,newLevel),provenance:'RECONSTRUCTION_POLICY'});
  }
  if(state.family!=='swordsman')throw new Error('Expected swordsman skill state');
  const current=validateM7SwordsmanSkillProgression(state.swordsman,oldLevel);
  if(current.developerOverride)return Object.freeze({family,swordsman:current,provenance:'RECONSTRUCTION_POLICY'});
  const available=new Set(availableM7SwordsmanSkillKeys(newLevel));
  const skillLevels=Object.fromEntries(M7_SWORDSMAN_SKILL_KEYS.map(key=>[
    key,
    available.has(key)?Math.max(1,current.skillLevels[key]):0,
  ])) as Record<M7SwordsmanSkillKey,number>;
  const next=validateM7SwordsmanSkillProgression({
    ...current,
    skillLevels,
    unspentSkillPoints:current.unspentSkillPoints+
      (newLevel-oldLevel)*M7_SWORDSMAN_SKILL_BALANCE_POLICY.skillPointPolicy.pointsPerPlayerLevel,
  },newLevel);
  return Object.freeze({family,swordsman:next,provenance:'RECONSTRUCTION_POLICY'});
}

export function investM7IntegratedSkillPoint(
  state:M7IntegratedSkillState,
  characterId:string|number,
  playerLevel:number,
  commandId:M7SkillCommandId,
):M7IntegratedSkillState{
  const family=familyFor(characterId);
  if(state.family!==family)throw new Error('M7 skill state family mismatch');
  const [prefix,key]=commandId.split(':',2);
  if(family==='swordsman'){
    if(prefix!=='swordsman'||state.family!=='swordsman'||!M7_SWORDSMAN_SKILL_KEYS.includes(key as M7SwordsmanSkillKey))throw new Error('Invalid swordsman command');
    const next=investM7SwordsmanSkillPoint(state.swordsman,playerLevel,key as M7SwordsmanSkillKey);
    return Object.freeze({family,swordsman:next,provenance:'RECONSTRUCTION_POLICY'});
  }
  if(prefix!=='wizard'||state.family!=='wizard'||!M7_WIZARD_SKILL_KEYS.includes(key as M7WizardSkillKey))throw new Error('Invalid wizard command');
  const next=upgradeM7WizardSkill(state.wizard,playerLevel,key as M7WizardSkillKey);
  return Object.freeze({family,wizard:next,provenance:'RECONSTRUCTION_POLICY'});
}

export function m7RuntimeSkillCommands(
  state:M7IntegratedSkillState,
  characterId:string|number,
  playerLevel:number,
  developerOverride=false,
):readonly M7RuntimeSkillCommand[]{
  const source=developerOverride?createM7DeveloperSkillState(characterId,playerLevel):validateM7IntegratedSkillState(state,characterId,playerLevel,false);
  if(source.family==='swordsman'){
    const commands:M7RuntimeSkillCommand[]=[];
    for(const key of M7_SWORDSMAN_SKILL_KEYS){
      const level=source.swordsman.skillLevels[key];
      if(level<1)continue;
      const definition=m7SwordsmanSkill(key);
      const row=m7SwordsmanSkillLevel(key,level);
      commands.push(Object.freeze({
        id:`swordsman:${key}` as M7SkillCommandId,
        family:'swordsman' as const,
        skillKey:key,
        authoredSkillId:definition.originalSkillId,
        displayName:definition.displayName,
        skillLevel:level as 1|2|3|4|5|6,
        mpCost:row.mpCost,
        readinessCost:row.readinessCost,
        target:definition.target,
        provenance:'RECONSTRUCTION_POLICY' as const,
      }));
    }
    return Object.freeze(commands);
  }
  const commands:M7RuntimeSkillCommand[]=[];
  for(const key of M7_WIZARD_SKILL_KEYS){
    const level=source.wizard.levels[key];
    if(level<1)continue;
    const definition=m7WizardSkillByKey(key);
    const row=m7WizardSkillLevel(key,level);
    commands.push(Object.freeze({
      id:`wizard:${key}` as M7SkillCommandId,
      family:'wizard' as const,
      skillKey:key,
      authoredSkillId:definition.authoredSkillId,
      displayName:definition.displayName,
      skillLevel:level as 1|2|3|4|5|6,
      mpCost:row.mpCost,
      readinessCost:row.readinessCost,
      target:definition.target,
      provenance:'RECONSTRUCTION_POLICY' as const,
    }));
  }
  return Object.freeze(commands);
}
