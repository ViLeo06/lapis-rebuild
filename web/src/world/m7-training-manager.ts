import type {Cell} from '../coordinates.ts';
import {M7_TRAINING_BATTLES,trainingBattleById} from '../training/m7-training-camp.ts';
import type {M7TrainingBattlePreset} from '../training/m7-training-camp.ts';
import type {NpcVisualBinding} from '../npc/npc-visual-catalog.ts';
import {canInteract} from './world-model.ts';
import type {WorldEntity,WorldInteractionIntent,WorldState} from './world-model.ts';

export const M7_TRAINING_MANAGER_ENTITY_ID='training-manager';
export const M7_TRAINING_MANAGER_DISPLAY_NAME='训练管理员';
export const M7_TRAINING_MANAGER_VISUAL_RESOURCE_ID=4023;
export const M7_TRAINING_MANAGER_VISUAL_ID='m7-training-manager-b4023';
export const M7_TRAINING_MANAGER_INTERACTION_RADIUS=2;

export const M7_TRAINING_MANAGER_PROVENANCE=Object.freeze({
  asset:'VERIFIED-STATIC-ORIGINAL' as const,
  assetSource:'fixed-hash 2.2 Char/B4023_{00,01,02,03}.ani/.spr',
  roleBinding:'RECONSTRUCTION_POLICY' as const,
  note:'B4023 is recovered original-client art. Its use as the offline training manager is a reconstruction binding, not a recovered retail NPC identity.',
});

export type M7TrainingManagerInputSource='pointer'|'touch'|'keyboard';

export type M7TrainingManager=Readonly<{
  entity:WorldEntity&{kind:'npc'};
  visualResourceId:typeof M7_TRAINING_MANAGER_VISUAL_RESOURCE_ID;
  visualBinding:NpcVisualBinding;
  provenance:typeof M7_TRAINING_MANAGER_PROVENANCE;
}>;

export type M7TrainingManagerIntent=WorldInteractionIntent&{
  inputSource:M7TrainingManagerInputSource;
};

export type M7TrainingManagerRejectReason=
  | 'entity-mismatch'
  | 'map-mismatch'
  | 'actor-state-mismatch'
  | 'out-of-range';

export type M7TrainingManagerInteractionResult=
  | Readonly<{
      accepted:true;
      action:'open-training-list';
      inputSource:M7TrainingManagerInputSource;
      battles:readonly M7TrainingBattlePreset[];
      provenance:'RECONSTRUCTION_POLICY';
    }>
  | Readonly<{
      accepted:false;
      reason:M7TrainingManagerRejectReason;
      message:string;
      provenance:'RECONSTRUCTION_POLICY';
    }>;

export function createM7TrainingManager(mapId:number,cell:Cell):M7TrainingManager{
  if(!Number.isInteger(mapId)||mapId<0)throw new Error('Invalid training-manager map id');
  const [x,y]=cell;
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0)throw new Error('Invalid training-manager cell');

  const entity:WorldEntity&{kind:'npc'}=Object.freeze({
    id:M7_TRAINING_MANAGER_ENTITY_ID,
    kind:'npc',
    mapId,
    x,
    y,
    displayName:M7_TRAINING_MANAGER_DISPLAY_NAME,
    interactionRadius:M7_TRAINING_MANAGER_INTERACTION_RADIUS,
    provenance:'RECONSTRUCTION_POLICY',
  });
  const visualBinding:NpcVisualBinding=Object.freeze({
    worldEntityKey:entity.id,
    visualId:M7_TRAINING_MANAGER_VISUAL_ID,
    provenance:{
      source:M7_TRAINING_MANAGER_PROVENANCE.assetSource,
      evidence:'RECONSTRUCTION_POLICY',
      note:M7_TRAINING_MANAGER_PROVENANCE.note,
    },
  });
  return Object.freeze({
    entity,
    visualResourceId:M7_TRAINING_MANAGER_VISUAL_RESOURCE_ID,
    visualBinding,
    provenance:M7_TRAINING_MANAGER_PROVENANCE,
  });
}

function reject(reason:M7TrainingManagerRejectReason,message:string):M7TrainingManagerInteractionResult{
  return Object.freeze({accepted:false,reason,message,provenance:'RECONSTRUCTION_POLICY'});
}

export function resolveM7TrainingManagerInteraction(
  manager:M7TrainingManager,
  world:WorldState,
  intent:M7TrainingManagerIntent,
):M7TrainingManagerInteractionResult{
  if(intent.entityId!==manager.entity.id)return reject('entity-mismatch','这不是训练管理员。');
  if(intent.mapId!==world.mapId||manager.entity.mapId!==world.mapId)return reject('map-mismatch','训练管理员不在当前地图。');
  if(intent.actorX!==world.x||intent.actorY!==world.y)return reject('actor-state-mismatch','角色位置已经变化，请重新交互。');
  if(!canInteract(manager.entity,world))return reject('out-of-range','离训练管理员太远。');
  return Object.freeze({
    accepted:true,
    action:'open-training-list',
    inputSource:intent.inputSource,
    battles:M7_TRAINING_BATTLES,
    provenance:'RECONSTRUCTION_POLICY',
  });
}

export function trainingManagerBattleById(id:number):M7TrainingBattlePreset{
  return trainingBattleById(id);
}
