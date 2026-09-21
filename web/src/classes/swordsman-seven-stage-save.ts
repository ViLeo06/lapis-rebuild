import {
  validateM7SwordsmanSkillProgression,
} from './swordsman-seven-stage-skills.ts';
import type {M7SwordsmanSkillProgressionState} from './swordsman-seven-stage-skills.ts';

export type S31SwordsmanSkillSavePayload = Readonly<{
  schema:1;
  playerLevel:number;
  skillProgression:M7SwordsmanSkillProgressionState;
  provenance:'RECONSTRUCTION_POLICY';
}>;

const FIELDS=new Set(['schema','playerLevel','skillProgression','provenance']);

export function validateS31SwordsmanSkillSavePayload(raw:unknown):S31SwordsmanSkillSavePayload{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid S31 swordsman skill save payload');
  const value=raw as Record<string,unknown>;
  if(Object.keys(value).length!==FIELDS.size||Object.keys(value).some(key=>!FIELDS.has(key)))throw new Error('Unknown S31 swordsman skill save field');
  if(value.schema!==1||value.provenance!=='RECONSTRUCTION_POLICY')throw new Error('Unsupported S31 swordsman skill save payload');
  if(!Number.isInteger(value.playerLevel)||(value.playerLevel as number)<1||(value.playerLevel as number)>65)throw new Error('Invalid S31 player level');
  const playerLevel=value.playerLevel as number;
  const skillProgression=validateM7SwordsmanSkillProgression(value.skillProgression,playerLevel);
  return Object.freeze({schema:1,playerLevel,skillProgression,provenance:'RECONSTRUCTION_POLICY'});
}

export function createS31SwordsmanSkillSavePayload(
  playerLevel:number,
  skillProgression:M7SwordsmanSkillProgressionState,
):S31SwordsmanSkillSavePayload{
  return validateS31SwordsmanSkillSavePayload({
    schema:1,playerLevel,skillProgression,provenance:'RECONSTRUCTION_POLICY',
  });
}

export function serializeS31SwordsmanSkillSavePayload(payload:S31SwordsmanSkillSavePayload):string{
  return JSON.stringify(validateS31SwordsmanSkillSavePayload(payload));
}

export function deserializeS31SwordsmanSkillSavePayload(serialized:string):S31SwordsmanSkillSavePayload{
  if(typeof serialized!=='string'||serialized.length<2||serialized.length>100000)throw new Error('Invalid serialized S31 skill payload');
  return validateS31SwordsmanSkillSavePayload(JSON.parse(serialized) as unknown);
}
