import {
  createM7IntegratedSkillState,
  validateM7IntegratedSkillState,
} from '../training/m7-skill-progression.ts';
import type {M7IntegratedSkillState} from '../training/m7-skill-progression.ts';
import {playableClassById} from '../content/classes/class-catalog.ts';

export type M7SaveExtension=Readonly<{
  schema:1;
  family:'swordsman'|'wizard';
  skills:M7IntegratedSkillState;
  provenance:'RECONSTRUCTION_POLICY';
}>;

const FIELDS=new Set(['schema','family','skills','provenance']);

function familyFor(characterId:string|number):'swordsman'|'wizard'{
  const family=playableClassById(characterId).family;
  if(family!=='swordsman'&&family!=='wizard')throw new Error('Unsupported M7 save family');
  return family;
}

export function validateM7SaveExtension(raw:unknown,characterId:string,playerLevel:number):M7SaveExtension{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid M7 save extension');
  const value=raw as Record<string,unknown>;
  const keys=Object.keys(value);
  if(keys.length!==FIELDS.size||keys.some(key=>!FIELDS.has(key)))throw new Error('Unknown M7 save extension field');
  const family=familyFor(characterId);
  if(value.schema!==1||value.family!==family||value.provenance!=='RECONSTRUCTION_POLICY')throw new Error('Unsupported M7 save extension');
  const skills=validateM7IntegratedSkillState(value.skills as M7IntegratedSkillState,characterId,playerLevel,false);
  return Object.freeze({schema:1,family,skills,provenance:'RECONSTRUCTION_POLICY'});
}

export function createM7SaveExtension(
  characterId:string,
  playerLevel:number,
  skills:M7IntegratedSkillState=createM7IntegratedSkillState(characterId,playerLevel),
):M7SaveExtension{
  const family=familyFor(characterId);
  return validateM7SaveExtension({
    schema:1,
    family,
    skills,
    provenance:'RECONSTRUCTION_POLICY',
  },characterId,playerLevel);
}
