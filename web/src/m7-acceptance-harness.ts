import {
  M7_STAGE_RANGES,
  M7_TRAINING_RECOMMENDED_LEVELS,
} from './m7-integration-contract.ts';

export const M7_EVIDENCE_LEVELS=Object.freeze([
  'VERIFIED',
  'VERIFIED-STATIC-ORIGINAL',
  'VERIFIED-HISTORICAL',
  'RECOVERED_SECONDARY',
  'INFERRED',
  'SERVER-BOUNDARY',
  'RECONSTRUCTION_POLICY',
  'UNVERIFIED',
] as const);
export type M7EvidenceLevel=(typeof M7_EVIDENCE_LEVELS)[number];

export type M7MonsterAcceptanceProbe=Readonly<{
  monsterId:string;
  level:number;
  archetypes:readonly string[];
  fixedStats:boolean;
  visualFamily:string;
  visualEvidence:M7EvidenceLevel;
  balanceEvidence:M7EvidenceLevel;
  canRecoverHp?:boolean;
}>;

export type M7SkillAcceptanceProbe=Readonly<{
  profession:'swordsman'|'wizard';
  skillId:string|number;
  unlockLevel:number;
  maximumSkillLevel:number;
  evidence:M7EvidenceLevel;
}>;

export type M7TrainingAcceptanceProbe=Readonly<{
  battleId:number;
  recommendedLevel:number;
  battleZoneId:number;
  monsterIds:readonly string[];
  fixedEnemyLevels:readonly number[];
  bindingEvidence:M7EvidenceLevel;
}>;

export type M7RecoveryAcceptanceProbe=Readonly<{
  hpAmount:number;
  mpAmount:number;
  readinessCost:number;
  infinite:boolean;
  provenance:M7EvidenceLevel;
}>;

export type M7AcceptanceInput=Readonly<{
  monsters:readonly M7MonsterAcceptanceProbe[];
  skills:readonly M7SkillAcceptanceProbe[];
  training:readonly M7TrainingAcceptanceProbe[];
  recovery:M7RecoveryAcceptanceProbe;
}>;

export type M7AcceptanceResult=Readonly<{
  ok:boolean;
  errors:readonly string[];
}>;

const REQUIRED_ARCHETYPES=Object.freeze(['melee','high-offense','high-defense','ranged','tank','fast','magic','dot','control','healer','regenerator','elite','boss'] as const);
const EXPECTED_UNLOCK_LEVELS=Object.freeze([1,6,16,26,36,46,56] as const);

function validEvidence(value:string):value is M7EvidenceLevel{
  return (M7_EVIDENCE_LEVELS as readonly string[]).includes(value);
}

function validateMonsters(monsters:readonly M7MonsterAcceptanceProbe[],errors:string[]):void{
  if(monsters.length<14)errors.push(`monster-count: expected >=14, got ${monsters.length}`);
  if(new Set(monsters.map(row=>row.monsterId)).size!==monsters.length)errors.push('monster-id: duplicate monsterId');
  for(const row of monsters){
    if(!row.monsterId)errors.push('monster-id: empty');
    if(!Number.isInteger(row.level)||row.level<1||row.level>75)errors.push(`monster-level: ${row.monsterId}`);
    if(!row.fixedStats)errors.push(`monster-scaling: ${row.monsterId} is not fixed`);
    if(!row.visualFamily)errors.push(`monster-visual: ${row.monsterId} missing visual family`);
    if(!validEvidence(row.visualEvidence))errors.push(`monster-visual-evidence: ${row.monsterId}`);
    if(row.balanceEvidence!=='RECONSTRUCTION_POLICY')errors.push(`monster-balance-evidence: ${row.monsterId} must be RECONSTRUCTION_POLICY`);
  }
  for(const tag of REQUIRED_ARCHETYPES){
    if(!monsters.some(row=>row.archetypes.includes(tag)))errors.push(`monster-archetype: missing ${tag}`);
  }
  if(!monsters.some(row=>row.canRecoverHp||row.archetypes.includes('healer')))errors.push('monster-healer: no HP recovery target');
  for(const range of M7_STAGE_RANGES){
    if(!monsters.some(row=>row.level>=range.minLevel&&row.level<=range.maxLevel)){
      errors.push(`monster-stage-coverage: stage ${range.stage}`);
    }
  }
}

function validateSkills(skills:readonly M7SkillAcceptanceProbe[],errors:string[]):void{
  for(const profession of ['swordsman','wizard'] as const){
    const rows=skills.filter(row=>row.profession===profession);
    if(rows.length!==7)errors.push(`skill-count: ${profession} expected 7, got ${rows.length}`);
    if(new Set(rows.map(row=>String(row.skillId))).size!==rows.length)errors.push(`skill-id: duplicate ${profession} skill`);
    const unlocks=rows.map(row=>row.unlockLevel).sort((a,b)=>a-b);
    if(JSON.stringify(unlocks)!==JSON.stringify(EXPECTED_UNLOCK_LEVELS))errors.push(`skill-unlocks: ${profession} must unlock at 1/6/16/26/36/46/56`);
    for(const row of rows){
      if(row.maximumSkillLevel!==6)errors.push(`skill-level: ${profession}/${String(row.skillId)} maximum must be 6`);
      if(!validEvidence(row.evidence))errors.push(`skill-evidence: ${profession}/${String(row.skillId)}`);
    }
  }
}

function validateTraining(rows:readonly M7TrainingAcceptanceProbe[],monsters:readonly M7MonsterAcceptanceProbe[],errors:string[]):void{
  if(rows.length!==15)errors.push(`training-count: expected 15, got ${rows.length}`);
  if(new Set(rows.map(row=>row.battleId)).size!==rows.length)errors.push('training-id: duplicate battleId');
  const levels=rows.map(row=>row.recommendedLevel);
  if(JSON.stringify(levels)!==JSON.stringify(M7_TRAINING_RECOMMENDED_LEVELS))errors.push('training-levels: recommended level sequence mismatch');
  const known=new Set(monsters.map(row=>row.monsterId));
  for(const row of rows){
    if(!Number.isInteger(row.battleZoneId)||row.battleZoneId<=0)errors.push(`training-scene: battle ${row.battleId}`);
    if(row.monsterIds.length===0)errors.push(`training-roster: battle ${row.battleId} is empty`);
    if(row.fixedEnemyLevels.length!==row.monsterIds.length)errors.push(`training-level-shape: battle ${row.battleId}`);
    for(const id of row.monsterIds)if(!known.has(id))errors.push(`training-monster: battle ${row.battleId} unknown ${id}`);
    for(const level of row.fixedEnemyLevels){
      if(!Number.isInteger(level)||level<1||level>75)errors.push(`training-fixed-level: battle ${row.battleId}`);
    }
    if(row.bindingEvidence!=='RECONSTRUCTION_POLICY')errors.push(`training-binding-evidence: battle ${row.battleId}`);
  }
  const signatures=new Set(rows.map(row=>row.monsterIds.join('|')));
  if(signatures.size<2)errors.push('training-rosters: all battles use the same monster combination');
  const scenes=new Set(rows.map(row=>row.battleZoneId));
  if(scenes.size<2)errors.push('training-scenes: all battles use the same scene');
}

function validateRecovery(row:M7RecoveryAcceptanceProbe,errors:string[]):void{
  if(row.hpAmount!==200)errors.push('recovery-hp: expected +200');
  if(row.mpAmount!==200)errors.push('recovery-mp: expected +200');
  if(row.readinessCost!==10)errors.push('recovery-readiness: pre-balance candidate must start at 10');
  if(!row.infinite)errors.push('recovery-limit: must be infinite');
  if(row.provenance!=='RECONSTRUCTION_POLICY')errors.push('recovery-evidence: must be RECONSTRUCTION_POLICY');
}

export function validateM7AcceptanceInput(input:M7AcceptanceInput):M7AcceptanceResult{
  const errors:string[]=[];
  validateMonsters(input.monsters,errors);
  validateSkills(input.skills,errors);
  validateTraining(input.training,input.monsters,errors);
  validateRecovery(input.recovery,errors);
  return Object.freeze({ok:errors.length===0,errors:Object.freeze(errors)});
}
