import {resolveM7Stage,resolveM7StageId} from './m7-level-axis.ts';
import type {M7Profession} from './m7-level-axis.ts';

export const M7DeveloperPresetPolicy=Object.freeze({
  id:'m7-developer-character-preset-v1',
  provenance:'RECONSTRUCTION_POLICY' as const,
  maximumLevel:65,
  maximumSkillLevel:6,
  skillPointFormula:'max(0, level - 1)',
  persistence:'runtime-only; debug preset/override must not be serialized into a normal SaveV2',
  note:'This is a developer acceleration policy, not retail progression evidence.',
});

type CompatibilityImplementedSkill=Readonly<{id:number;unlockStage:1|2|3|4|5|6|7}>;

const CURRENT_IMPLEMENTED_M7_SKILLS:Readonly<Record<M7Profession,readonly CompatibilityImplementedSkill[]>>=Object.freeze({
  swordsman:Object.freeze([
    Object.freeze({id:1101,unlockStage:1 as const}),
    Object.freeze({id:1201,unlockStage:2 as const}),
    Object.freeze({id:1301,unlockStage:3 as const}),
  ]),
  wizard:Object.freeze([
    Object.freeze({id:19101,unlockStage:1 as const}),
    Object.freeze({id:19201,unlockStage:2 as const}),
    Object.freeze({id:19301,unlockStage:3 as const}),
  ]),
});

export type M7DeveloperCharacterPreset=Readonly<{
  profession:M7Profession;
  level:number;
  stage:number;
  stageId:number;
  skillPoints:number;
  legalSkillIds:readonly number[];
  effectiveSkillIds:readonly number[];
  unlockAllImplementedSkills:boolean;
  skillLevelOverride:number|null;
  vitals:'full';
  equipment:'first-eligible-owned';
  provenance:'RECONSTRUCTION_POLICY';
}>;

export function availableImplementedM7SkillIds(profession:M7Profession,level:number):readonly number[]{
  const stage=resolveM7Stage(level).stage;
  return Object.freeze(CURRENT_IMPLEMENTED_M7_SKILLS[profession].filter(skill=>skill.unlockStage<=stage).map(skill=>skill.id));
}

export function implementedFirstSevenSkillIds(profession:M7Profession):readonly number[]{
  return Object.freeze(CURRENT_IMPLEMENTED_M7_SKILLS[profession].map(skill=>skill.id));
}

export function buildM7DeveloperCharacterPreset(
  profession:M7Profession,
  level:number,
  unlockAllImplementedSkills=false,
):M7DeveloperCharacterPreset{
  const range=resolveM7Stage(level);
  const stageId=resolveM7StageId(profession,level);
  const legalSkillIds=availableImplementedM7SkillIds(profession,level);
  const effectiveSkillIds=unlockAllImplementedSkills?implementedFirstSevenSkillIds(profession):legalSkillIds;
  return Object.freeze({
    profession,
    level,
    stage:range.stage,
    stageId,
    skillPoints:Math.max(0,level-1),
    legalSkillIds,
    effectiveSkillIds,
    unlockAllImplementedSkills,
    skillLevelOverride:unlockAllImplementedSkills?M7DeveloperPresetPolicy.maximumSkillLevel:null,
    vitals:'full',
    equipment:'first-eligible-owned',
    provenance:'RECONSTRUCTION_POLICY',
  });
}
