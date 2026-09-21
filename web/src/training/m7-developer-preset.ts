import {resolveM7Stage,resolveM7StageId} from './m7-level-axis.ts';
import type {M7Profession} from './m7-level-axis.ts';
import {M7_SWORDSMAN_SKILL_KEYS,m7SwordsmanSkill} from '../classes/swordsman-seven-stage-skills.ts';
import {M7_WIZARD_SKILL_KEYS,m7WizardAllowedSkillKeys,m7WizardSkillByKey} from '../content/skills/wizard-seven-stage.ts';

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
  legalSkillIds:readonly (number|string)[];
  effectiveSkillIds:readonly (number|string)[];
  unlockAllImplementedSkills:boolean;
  skillLevelOverride:number|null;
  vitals:'full';
  equipment:'first-eligible-owned';
  provenance:'RECONSTRUCTION_POLICY';
}>;

function identityForSwordsman(key:(typeof M7_SWORDSMAN_SKILL_KEYS)[number]):number|string{
  const skill=m7SwordsmanSkill(key);
  return skill.originalSkillId??`swordsman:${key}`;
}
function identityForWizard(key:(typeof M7_WIZARD_SKILL_KEYS)[number]):number|string{
  const skill=m7WizardSkillByKey(key);
  return skill.authoredSkillId??`wizard:${key}`;
}
export function availableImplementedM7SkillIds(profession:M7Profession,level:number):readonly (number|string)[]{
  if(profession==='swordsman'){
    return Object.freeze(M7_SWORDSMAN_SKILL_KEYS
      .filter(key=>m7SwordsmanSkill(key).unlockLevel<=level)
      .map(identityForSwordsman));
  }
  return Object.freeze(m7WizardAllowedSkillKeys(level).map(identityForWizard));
}
export function implementedFirstSevenSkillIds(profession:M7Profession):readonly (number|string)[]{
  return profession==='swordsman'
    ?Object.freeze(M7_SWORDSMAN_SKILL_KEYS.map(identityForSwordsman))
    :Object.freeze(M7_WIZARD_SKILL_KEYS.map(identityForWizard));
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
