import {m6SkillIdsForCharacter} from '../m6-runtime-content.ts';
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

export function implementedFirstSevenSkillIds(profession:M7Profession):readonly number[]{
  const seventhStageId=profession==='swordsman'?160:169;
  return Object.freeze([...m6SkillIdsForCharacter(seventhStageId)]);
}

export function buildM7DeveloperCharacterPreset(
  profession:M7Profession,
  level:number,
  unlockAllImplementedSkills=false,
):M7DeveloperCharacterPreset{
  const range=resolveM7Stage(level);
  const stageId=resolveM7StageId(profession,level);
  const legalSkillIds=Object.freeze([...m6SkillIdsForCharacter(stageId)]);
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
