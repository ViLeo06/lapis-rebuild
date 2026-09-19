import type {NpcDefinition} from './npc-model.ts';
import type {WorldEntity,WorldState} from './world-model.ts';

// The current S7/S13 playable pack exposes map 1 as the validated field map
// and map 0 as the playable battle resource. Until another field map is wired
// with equivalent validation, the M4 quest uses two locations on map 1 rather
// than pretending the battle map is an ordinary field map.
export const TRAINING_MAP_ID=1;
export const OUTER_CITY_MAP_ID=1;
// Reconstruction binding to the existing playable training battle resource.
// This is not a recovered retail field-map -> battle-zone mapping.
export const TRAINING_BATTLE_ZONE_ID=0;
export const TRAINING_QUEST_ID='s9-training-run';

export const TRAINING_GUIDE:NpcDefinition={
  entity:{id:'training-guide',kind:'npc',mapId:TRAINING_MAP_ID,x:22,y:24,displayName:'训练引导员',interactionRadius:2,provenance:'RECONSTRUCTION_POLICY'},
  questId:TRAINING_QUEST_ID,
  shortDialogue:{
    available:['外城附近有一场训练战斗。先去确认路线，再回来汇报。'],
    active:['先完成外城的训练目标。'],
    'turn-in':['看起来你已经完成训练。现在可以交付。'],
    complete:['这次训练已经结束。'],
  },
  provenance:'RECONSTRUCTION_POLICY',
};

export const OUTER_CITY_OBJECTIVE:WorldEntity={
  id:'outer-city-training-marker',kind:'encounter',mapId:OUTER_CITY_MAP_ID,x:26,y:24,displayName:'外城训练点',interactionRadius:1,provenance:'RECONSTRUCTION_POLICY',
};

export const START_STATE:WorldState={mapId:TRAINING_MAP_ID,x:22,y:24};
export const OUTER_CITY_ENTRY:WorldState={mapId:OUTER_CITY_MAP_ID,x:26,y:24};
export const TRAINING_RETURN:WorldState={mapId:TRAINING_MAP_ID,x:22,y:24};

export const WORLD_ENTITIES:readonly WorldEntity[]=[TRAINING_GUIDE.entity,OUTER_CITY_OBJECTIVE];


export type TrainingWorldContent={
  trainingMapId:number;
  objectiveMapId:number;
  battleZoneId:number;
  questId:string;
  guide:NpcDefinition;
  objective:WorldEntity;
  start:WorldState;
  objectiveEntry:WorldState;
  returnState:WorldState;
  warpOnAccept:boolean;
};

export const DEFAULT_TRAINING_WORLD_CONTENT:TrainingWorldContent=Object.freeze({
  trainingMapId:TRAINING_MAP_ID,
  objectiveMapId:OUTER_CITY_MAP_ID,
  battleZoneId:TRAINING_BATTLE_ZONE_ID,
  questId:TRAINING_QUEST_ID,
  guide:TRAINING_GUIDE,
  objective:OUTER_CITY_OBJECTIVE,
  start:START_STATE,
  objectiveEntry:OUTER_CITY_ENTRY,
  returnState:TRAINING_RETURN,
  warpOnAccept:true,
});
