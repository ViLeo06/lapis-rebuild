export type RuntimeProvenance='VERIFIED'|'RECOVERED_SECONDARY'|'INFERRED'|'UNVERIFIED'|'RECONSTRUCTION_POLICY';
export type InteractionIntent={sourceKind:'worldEntity'|'sceneObject'|'reconstruction';nativeAction:'49/21'|'49/04'|'08'|'reconstruction';sourceRuntimeId?:number;fieldMapId?:number;provenance:RuntimeProvenance};
export type BattleEntryGeometry={raw:[number,number,number,number]};
export type BattleEntry={battleZoneId:number;geometry?:BattleEntryGeometry;provenance:RuntimeProvenance;authority:'server-session'|'offline-reconstruction'};
export type EncounterContext={trainingBattleZoneId:number};
export interface EncounterAuthority{readonly id:string;readonly provenance:RuntimeProvenance;resolve(intent:InteractionIntent,context:EncounterContext):BattleEntry|null;}
const validZone=(id:number)=>Number.isInteger(id)&&id>=0;
const u16=(id:number)=>Number.isInteger(id)&&id>=0&&id<=0xffff;
const validDistance=(distance:number)=>Number.isInteger(distance)&&distance>=0;

// Retail fixed-client interaction boundaries. These functions only produce an
// interaction intent; none of the native action codes is relabelled as a
// guaranteed encounter start.
export function worldEntityInteractionIntent(input:{entityType:number;manhattanDistance:number;nearTargetWord:number;fallbackWord:number;fieldMapId?:number}):InteractionIntent|null{
  if(!Number.isInteger(input.entityType)||!validDistance(input.manhattanDistance)||!u16(input.nearTargetWord)||!u16(input.fallbackWord))throw new Error('Invalid world entity interaction');
  if(input.fieldMapId!==undefined&&(!Number.isInteger(input.fieldMapId)||input.fieldMapId<0))throw new Error('Invalid field map id');
  if(input.entityType>=101&&input.entityType<=103){
    if(input.manhattanDistance>=4)return null;
    return{sourceKind:'worldEntity',nativeAction:'49/21',sourceRuntimeId:input.nearTargetWord,fieldMapId:input.fieldMapId,provenance:'VERIFIED'};
  }
  return{sourceKind:'worldEntity',nativeAction:'08',sourceRuntimeId:input.fallbackWord,fieldMapId:input.fieldMapId,provenance:'VERIFIED'};
}

export function sceneObjectInteractionIntent(input:{manhattanDistance:number;runtimeSceneId:number;fieldMapId?:number}):InteractionIntent|null{
  if(!validDistance(input.manhattanDistance)||!u16(input.runtimeSceneId))throw new Error('Invalid scene object interaction');
  if(input.fieldMapId!==undefined&&(!Number.isInteger(input.fieldMapId)||input.fieldMapId<0))throw new Error('Invalid field map id');
  if(input.manhattanDistance>=9)return null;
  return{sourceKind:'sceneObject',nativeAction:'49/04',sourceRuntimeId:input.runtimeSceneId,fieldMapId:input.fieldMapId,provenance:'VERIFIED'};
}

export function createTrainingInteraction(fieldMapId:number):InteractionIntent{if(!Number.isInteger(fieldMapId)||fieldMapId<0)throw new Error('Invalid field map id');return{sourceKind:'reconstruction',nativeAction:'reconstruction',fieldMapId,provenance:'RECONSTRUCTION_POLICY'};}
export function verifiedBattleEntry(battleZoneId:number,geometry?:BattleEntryGeometry):BattleEntry{if(!validZone(battleZoneId))throw new Error('Invalid battle zone id');if(geometry&&!geometry.raw.every(Number.isFinite))throw new Error('Invalid battle geometry');return{battleZoneId,geometry,provenance:'VERIFIED',authority:'server-session'};}
export const OFFLINE_TRAINING_ENCOUNTER_AUTHORITY:EncounterAuthority=Object.freeze({id:'offline-training-v1',provenance:'RECONSTRUCTION_POLICY' as const,resolve(intent:InteractionIntent,context:EncounterContext):BattleEntry|null{if(intent.sourceKind!=='reconstruction')return null;if(!validZone(context.trainingBattleZoneId))throw new Error('Invalid reconstruction battle zone');return{battleZoneId:context.trainingBattleZoneId,provenance:'RECONSTRUCTION_POLICY',authority:'offline-reconstruction'};}});
