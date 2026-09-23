import type {LoadedPack,Collision} from '../model.ts';
import {findRoute,walkable} from '../coordinates.ts';
import type {Cell} from '../coordinates.ts';
import type {NpcDefinition} from './npc-model.ts';
import type {WorldEntity,WorldState} from './world-model.ts';
import type {TrainingWorldContent} from './world-content.ts';
import {createTrainingHousePolicy} from './s18-world-policy.ts';
import type {TrainingHousePolicy} from './s18-world-policy.ts';
import type {NpcVisualBinding} from '../npc/npc-visual-catalog.ts';
import {createM7TrainingManager} from './m7-training-manager.ts';
import type {M7TrainingManager} from './m7-training-manager.ts';
import {S17_RECONSTRUCTION_TRAINING_BINDINGS} from '../content/monsters/monster-visual-catalog.ts';

export const M5_FIELD_MAP_ID=1;
export const M5_INTERIOR_MAP_ID=7;
export const M5_BATTLE_ZONE_ID=0;
export const M5_GUIDE_VISUAL_RESOURCE_ID=1001;
export const M5_QUEST_ID='m5-training-house';

export type M5WorldVisualPlacement={
  id:string;
  kind:'npc'|'encounter';
  mapId:number;
  cell:Cell;
  resourceId:number;
  label:string;
  provenance:'RECONSTRUCTION_POLICY';
};

export type M5PlayableWorld={
  content:TrainingWorldContent;
  house:TrainingHousePolicy;
  guideVisualBinding:NpcVisualBinding;
  trainingManager:M7TrainingManager;
  visuals:readonly M5WorldVisualPlacement[];
  doorCell:Cell;
  interiorEntry:Cell;
  interiorExit:Cell;
  encounterCell:Cell;
};

const key=(cell:Cell)=>`${cell[0]},${cell[1]}`;

function nearestDistinct(collision:Collision,desired:Cell,excluded:readonly Cell[]=[]):Cell{
  const blocked=new Set(excluded.map(key));
  let best:Cell|null=null,bestDistance=Infinity;
  for(let x=0;x<collision.width;x++)for(let y=0;y<collision.height;y++){
    const cell:Cell=[x,y];
    if(!walkable(collision,cell)||blocked.has(key(cell)))continue;
    const distance=(x-desired[0])**2+(y-desired[1])**2;
    if(distance<bestDistance){best=cell;bestDistance=distance;}
  }
  if(!best)throw new Error('No distinct walkable cell');
  return best;
}

function reachableNear(collision:Collision,from:Cell,desired:Cell,excluded:readonly Cell[]):Cell{
  const blocked=new Set(excluded.map(key));
  const candidates:Cell[]=[];
  for(let x=0;x<collision.width;x++)for(let y=0;y<collision.height;y++){
    const cell:Cell=[x,y];if(walkable(collision,cell)&&!blocked.has(key(cell)))candidates.push(cell);
  }
  candidates.sort((a,b)=>((a[0]-desired[0])**2+(a[1]-desired[1])**2)-((b[0]-desired[0])**2+(b[1]-desired[1])**2));
  for(const cell of candidates)if(findRoute(collision,from,cell))return cell;
  throw new Error('No reachable M5 world cell');
}

export function createM5PlayableWorld(pack:LoadedPack):M5PlayableWorld{
  const field=pack.maps[String(M5_FIELD_MAP_ID)],interior=pack.maps[String(M5_INTERIOR_MAP_ID)],battle=pack.maps[String(M5_BATTLE_ZONE_ID)];
  if(!field||!interior||!battle)throw new Error('M5 private pack requires field map 1, interior map 7 and battle zone 0');
  for(const resource of [M5_GUIDE_VISUAL_RESOURCE_ID,4524,4544])if(!pack.animations[String(resource)])throw new Error(`M5 private pack missing B${resource} visual family`);

  const guide=nearestDistinct(field.collision,[22,24]);
  const door=reachableNear(field.collision,guide,[26,24],[guide]);
  const returnSpawn=reachableNear(field.collision,door,[24,24],[door]);
  const managerCell=reachableNear(field.collision,guide,[guide[0]+4,guide[1]],[guide,door,returnSpawn]);
  const trainingManager=createM7TrainingManager(M5_FIELD_MAP_ID,managerCell);
  const entry=nearestDistinct(interior.collision,[44,49]);
  const exit=reachableNear(interior.collision,entry,[44,52],[entry]);
  const encounter=reachableNear(interior.collision,entry,[52,49],[entry,exit]);
  const secondMonster=reachableNear(interior.collision,encounter,[encounter[0]+2,encounter[1]+1],[entry,exit,encounter]);

  const guideNpc:NpcDefinition={
    entity:{id:'training-guide',kind:'npc',mapId:M5_FIELD_MAP_ID,x:guide[0],y:guide[1],displayName:'训练引导员',interactionRadius:2,provenance:'RECONSTRUCTION_POLICY'},
    questId:M5_QUEST_ID,
    shortDialogue:{
      available:['进入前方训练屋，完成一场基础战斗后回来。'],
      active:['训练屋入口就在附近。进去完成训练。'],
      'turn-in':['训练完成了。回来汇报吧。'],
      complete:['基础训练已经完成。'],
    },
    provenance:'RECONSTRUCTION_POLICY',
  };
  const objective:WorldEntity={
    id:'training-house-encounter',kind:'encounter',mapId:M5_INTERIOR_MAP_ID,x:encounter[0],y:encounter[1],
    displayName:'训练怪物',interactionRadius:2,provenance:'RECONSTRUCTION_POLICY',
  };
  const start:WorldState={mapId:M5_FIELD_MAP_ID,x:guide[0],y:guide[1]};
  const objectiveEntry:WorldState={mapId:M5_INTERIOR_MAP_ID,x:entry[0],y:entry[1]};
  const returnState:WorldState={mapId:M5_FIELD_MAP_ID,x:guide[0],y:guide[1]};
  const content:TrainingWorldContent={
    trainingMapId:M5_FIELD_MAP_ID,objectiveMapId:M5_INTERIOR_MAP_ID,battleZoneId:M5_BATTLE_ZONE_ID,questId:M5_QUEST_ID,
    guide:guideNpc,objective,start,objectiveEntry,returnState,warpOnAccept:false,
  };
  const house=createTrainingHousePolicy({
    id:'m5-training-house',
    field:{mapId:M5_FIELD_MAP_ID,name:'布日古斯_外城',entranceZone:{shape:'cells',cells:[door]},returnSpawn,returnDirection:4},
    interior:{mapId:M5_INTERIOR_MAP_ID,name:'训练屋（重构场景 / 原资源：布日古斯_本城_大厅）',exitZone:{shape:'cells',cells:[exit]},entrySpawn:entry,entryDirection:0},
    npcs:[guideNpc],
  });
  const guideVisualBinding:NpcVisualBinding={
    worldEntityKey:guideNpc.entity.id,visualId:'m5-training-guide-b1001',
    provenance:{source:'fixed-hash 2.2 Char/B1001_*; S16 private gallery manual review',evidence:'RECONSTRUCTION_POLICY',note:'Original pixels; world/NPC identity binding is reconstruction.'},
  };
  const monsterBindings=new Map(S17_RECONSTRUCTION_TRAINING_BINDINGS.map(row=>[row.battleUnitKey,row.visualId]));
  if(monsterBindings.get('dummy-melee')!=='monster-visual-001'||monsterBindings.get('dummy-ranged')!=='monster-visual-004')throw new Error('Unexpected S17 training visual bindings');

  return{
    content,house,guideVisualBinding,trainingManager,doorCell:door,interiorEntry:entry,interiorExit:exit,encounterCell:encounter,
    visuals:Object.freeze([
      {id:'training-guide',kind:'npc',mapId:M5_FIELD_MAP_ID,cell:guide,resourceId:M5_GUIDE_VISUAL_RESOURCE_ID,label:'训练引导员',provenance:'RECONSTRUCTION_POLICY'},
      ...(pack.animations[String(trainingManager.visualResourceId)]?[{id:trainingManager.entity.id,kind:'npc' as const,mapId:M5_FIELD_MAP_ID,cell:managerCell,resourceId:trainingManager.visualResourceId,label:trainingManager.entity.displayName,provenance:'RECONSTRUCTION_POLICY' as const}]:[]),
      {id:'dummy-melee-preview',kind:'encounter',mapId:M5_INTERIOR_MAP_ID,cell:encounter,resourceId:4524,label:'训练怪物',provenance:'RECONSTRUCTION_POLICY'},
      {id:'dummy-ranged-preview',kind:'encounter',mapId:M5_INTERIOR_MAP_ID,cell:secondMonster,resourceId:4544,label:'训练怪物',provenance:'RECONSTRUCTION_POLICY'},
    ]),
  };
}
