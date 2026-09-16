export type RuntimeProvenance='VERIFIED'|'RECOVERED_SECONDARY'|'INFERRED'|'UNVERIFIED'|'RECONSTRUCTION_POLICY';
export type InteractionIntent={sourceKind:'worldEntity'|'sceneObject'|'reconstruction';nativeAction:'49/21'|'49/04'|'08'|'reconstruction';sourceRuntimeId?:number;fieldMapId?:number;provenance:RuntimeProvenance};
export type BattleEntryGeometry={raw:[number,number,number,number]};
export type BattleEntry={battleZoneId:number;geometry?:BattleEntryGeometry;provenance:RuntimeProvenance;authority:'server-session'|'offline-reconstruction'};
export type EncounterContext={trainingBattleZoneId:number};
export interface EncounterAuthority{readonly id:string;readonly provenance:RuntimeProvenance;resolve(intent:InteractionIntent,context:EncounterContext):BattleEntry|null;}
const validZone=(id:number)=>Number.isInteger(id)&&id>=0;
export function createTrainingInteraction(fieldMapId:number):InteractionIntent{if(!Number.isInteger(fieldMapId)||fieldMapId<0)throw new Error('Invalid field map id');return{sourceKind:'reconstruction',nativeAction:'reconstruction',fieldMapId,provenance:'RECONSTRUCTION_POLICY'};}
export function verifiedBattleEntry(battleZoneId:number,geometry?:BattleEntryGeometry):BattleEntry{if(!validZone(battleZoneId))throw new Error('Invalid battle zone id');if(geometry&&!geometry.raw.every(Number.isFinite))throw new Error('Invalid battle geometry');return{battleZoneId,geometry,provenance:'VERIFIED',authority:'server-session'};}
export const OFFLINE_TRAINING_ENCOUNTER_AUTHORITY:EncounterAuthority=Object.freeze({id:'offline-training-v1',provenance:'RECONSTRUCTION_POLICY' as const,resolve(intent:InteractionIntent,context:EncounterContext):BattleEntry|null{if(intent.sourceKind!=='reconstruction')return null;if(!validZone(context.trainingBattleZoneId))throw new Error('Invalid reconstruction battle zone');return{battleZoneId:context.trainingBattleZoneId,provenance:'RECONSTRUCTION_POLICY',authority:'offline-reconstruction'};}});
