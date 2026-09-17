import type {NpcDefinition} from './npc-model.ts';
import type {WorldEntity,WorldState} from './world-model.ts';

export const TRAINING_MAP_ID=0;
export const OUTER_CITY_MAP_ID=1;
export const TRAINING_BATTLE_ZONE_ID=1;
export const TRAINING_QUEST_ID='s9-training-run';

export const TRAINING_GUIDE:NpcDefinition={
  entity:{id:'training-guide',kind:'npc',mapId:TRAINING_MAP_ID,x:32,y:32,displayName:'训练引导员',interactionRadius:2,provenance:'RECONSTRUCTION_POLICY'},
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
  id:'outer-city-training-marker',kind:'encounter',mapId:OUTER_CITY_MAP_ID,x:48,y:48,displayName:'外城训练点',interactionRadius:1,provenance:'RECONSTRUCTION_POLICY',
};

export const START_STATE:WorldState={mapId:TRAINING_MAP_ID,x:32,y:33};
export const OUTER_CITY_ENTRY:WorldState={mapId:OUTER_CITY_MAP_ID,x:46,y:48};
export const TRAINING_RETURN:WorldState={mapId:TRAINING_MAP_ID,x:32,y:33};

export const WORLD_ENTITIES:readonly WorldEntity[]=[TRAINING_GUIDE.entity,OUTER_CITY_OBJECTIVE];
