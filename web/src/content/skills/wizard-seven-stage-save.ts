import {
  createM7WizardSkillBook,
  validateM7WizardSkillBook,
} from './wizard-seven-stage.ts';
import type {M7WizardSkillBook} from './wizard-seven-stage.ts';
import {
  validateSaveV2,
} from '../../progression/save-schema.ts';
import type {
  JsonValue,
  SaveV2,
  SaveValidationContext,
} from '../../progression/save-schema.ts';

export const M7_WIZARD_SAVE_KEY='m7WizardSkills' as const;

export type M7WizardSkillSavePayload=Readonly<{
  schema:1;
  playerLevel:number;
  skillBook:M7WizardSkillBook;
  provenance:'RECONSTRUCTION_POLICY';
}>;

function questRecord(quest:JsonValue):Record<string,JsonValue>{
  if(!quest||typeof quest!=='object'||Array.isArray(quest)){
    throw new Error('M7 wizard skill persistence requires object-shaped SaveV2 quest state');
  }
  return {...quest} as Record<string,JsonValue>;
}

export function m7WizardSkillSavePayload(
  skillBook:M7WizardSkillBook,
  playerLevel:number,
):M7WizardSkillSavePayload{
  const validated=validateM7WizardSkillBook(skillBook,playerLevel,false);
  return Object.freeze({
    schema:1 as const,
    playerLevel,
    skillBook:validated,
    provenance:'RECONSTRUCTION_POLICY' as const,
  });
}

export function attachM7WizardSkillBookToSaveV2(
  rawSave:SaveV2,
  skillBook:M7WizardSkillBook,
  context:SaveValidationContext,
):SaveV2{
  const save=validateSaveV2(rawSave,context);
  const playerLevel=save.progression.level;
  const payload=m7WizardSkillSavePayload(skillBook,playerLevel);
  const quest=questRecord(save.quest);
  quest[M7_WIZARD_SAVE_KEY]=payload as unknown as JsonValue;
  return validateSaveV2({...save,quest},context);
}

export function restoreM7WizardSkillBookFromSaveV2(
  rawSave:SaveV2,
  context:SaveValidationContext,
):M7WizardSkillBook{
  const save=validateSaveV2(rawSave,context);
  const playerLevel=save.progression.level;
  const quest=questRecord(save.quest);
  const raw=quest[M7_WIZARD_SAVE_KEY];
  if(raw===undefined)return createM7WizardSkillBook(playerLevel);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid M7 wizard skill save payload');
  const payload=raw as Record<string,unknown>;
  if(payload.schema!==1||payload.provenance!=='RECONSTRUCTION_POLICY'||payload.playerLevel!==playerLevel){
    throw new Error('M7 wizard skill save payload does not match player level');
  }
  return validateM7WizardSkillBook(payload.skillBook,playerLevel,false);
}
