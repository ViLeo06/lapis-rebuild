import {
  createM7IntegratedSkillState,
  validateM7IntegratedSkillState,
} from '../training/m7-skill-progression.ts';
import type {M7IntegratedSkillState} from '../training/m7-skill-progression.ts';
import {playableClassById} from '../content/classes/class-catalog.ts';

export type M7SavedVitals=Readonly<{hp:number;mp:number}>;
export type M7SaveExtension=Readonly<{
  schema:1;
  family:'swordsman'|'wizard';
  skills:M7IntegratedSkillState;
  vitals:M7SavedVitals|null;
  provenance:'RECONSTRUCTION_POLICY';
}>;

const REQUIRED_FIELDS=new Set(['schema','family','skills','provenance']);
const ALLOWED_FIELDS=new Set([...REQUIRED_FIELDS,'vitals']);

function validateVitals(raw:unknown):M7SavedVitals|null{
  if(raw===undefined||raw===null)return null;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid M7 saved vitals');
  const value=raw as Record<string,unknown>;
  if(Object.keys(value).length!==2||!('hp' in value)||!('mp' in value))throw new Error('Invalid M7 saved vitals');
  if(typeof value.hp!=='number'||!Number.isFinite(value.hp)||value.hp<0)throw new Error('Invalid M7 saved HP');
  if(typeof value.mp!=='number'||!Number.isFinite(value.mp)||value.mp<0)throw new Error('Invalid M7 saved MP');
  return Object.freeze({hp:value.hp,mp:value.mp});
}

function familyFor(characterId:string|number):'swordsman'|'wizard'{
  const family=playableClassById(characterId).family;
  if(family!=='swordsman'&&family!=='wizard')throw new Error('Unsupported M7 save family');
  return family;
}

export function validateM7SaveExtension(raw:unknown,characterId:string,playerLevel:number):M7SaveExtension{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid M7 save extension');
  const value=raw as Record<string,unknown>;
  const keys=Object.keys(value);
  if(keys.some(key=>!ALLOWED_FIELDS.has(key))||[...REQUIRED_FIELDS].some(key=>!keys.includes(key)))throw new Error('Unknown M7 save extension field');
  const family=familyFor(characterId);
  if(value.schema!==1||value.family!==family||value.provenance!=='RECONSTRUCTION_POLICY')throw new Error('Unsupported M7 save extension');
  const skills=validateM7IntegratedSkillState(value.skills as M7IntegratedSkillState,characterId,playerLevel,false);
  const vitals=validateVitals(value.vitals);
  return Object.freeze({schema:1,family,skills,vitals,provenance:'RECONSTRUCTION_POLICY'});
}

export function createM7SaveExtension(
  characterId:string,
  playerLevel:number,
  skills:M7IntegratedSkillState=createM7IntegratedSkillState(characterId,playerLevel),
  vitals:M7SavedVitals|null=null,
):M7SaveExtension{
  const family=familyFor(characterId);
  return validateM7SaveExtension({
    schema:1,
    family,
    skills,
    vitals,
    provenance:'RECONSTRUCTION_POLICY',
  },characterId,playerLevel);
}
