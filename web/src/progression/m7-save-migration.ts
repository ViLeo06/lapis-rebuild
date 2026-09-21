import {classFamilyForCharacter} from './equipment.ts';
import {migrateSaveToM6,serializeM6SaveV2,validateM6SaveForContent} from './m6-save-migration.ts';
import type {M6SaveContentContext,M6SaveV2} from './m6-save-migration.ts';
import {createM7SaveExtension,validateM7SaveExtension} from './m7-save-extension.ts';
import type {M7SaveExtension} from './m7-save-extension.ts';
import type {SaveValidationContext,JsonValue} from './save-schema.ts';
import {M7_WIZARD_SAVE_KEY,restoreM7WizardSkillBookFromSaveV2} from '../content/skills/wizard-seven-stage-save.ts';
import type {M7IntegratedSkillState} from '../training/m7-skill-progression.ts';

export type M7SaveV2=M6SaveV2&{m7:M7SaveExtension};

function questRecord(value:JsonValue):Record<string,JsonValue>|null{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,JsonValue>:null;
}

function legacyWizardSkillState(
  save:M6SaveV2,
  context:SaveValidationContext,
):M7IntegratedSkillState|null{
  if(classFamilyForCharacter(save.character)!=='wizard')return null;
  const quest=questRecord(save.quest);
  if(!quest||quest[M7_WIZARD_SAVE_KEY]===undefined)return null;
  const wizard=restoreM7WizardSkillBookFromSaveV2(save,context);
  return Object.freeze({family:'wizard' as const,wizard,provenance:'RECONSTRUCTION_POLICY' as const});
}

export function validateM7SaveForContent(
  raw:unknown,
  saveContext:SaveValidationContext,
  content:M6SaveContentContext,
):M7SaveV2{
  const save=validateM6SaveForContent(raw,saveContext,content);
  if(!save.m7)throw new Error('M7 save extension is required');
  const m7=validateM7SaveExtension(save.m7,save.character,save.progression.level);
  return{...save,m7};
}

export function migrateSaveToM7(
  raw:unknown,
  saveContext:SaveValidationContext,
  content:M6SaveContentContext,
):M7SaveV2{
  const base=migrateSaveToM6(raw,saveContext,content);
  if(base.m7)return validateM7SaveForContent(base,saveContext,content);
  const legacy=legacyWizardSkillState(base,saveContext);
  const m7=createM7SaveExtension(base.character,base.progression.level,legacy??undefined);
  return validateM7SaveForContent({...base,m7},saveContext,content);
}

export function serializeM7SaveV2(
  save:M7SaveV2,
  saveContext:SaveValidationContext,
  content:M6SaveContentContext,
):string{
  return serializeM6SaveV2(validateM7SaveForContent(save,saveContext,content),saveContext,content);
}
