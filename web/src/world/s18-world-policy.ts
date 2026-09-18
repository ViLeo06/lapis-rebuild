import type {Cell} from '../coordinates.ts';
import type {NpcDefinition} from './npc-model.ts';
import {validateWorldGraph} from './world-graph.ts';
import type {WorldGraph} from './world-graph.ts';
import {validateSpatialTriggers} from './spatial-trigger.ts';
import type {SpatialTrigger,SpatialZone} from './spatial-trigger.ts';

export type TrainingHousePolicySpec={
  id:string;
  field:{mapId:number;name:string;entranceZone:SpatialZone;returnSpawn:Cell;returnDirection?:number};
  interior:{mapId:number;name:string;exitZone:SpatialZone;entrySpawn:Cell;entryDirection?:number};
  npcs?:readonly NpcDefinition[];
};
export type TrainingHousePolicy={graph:WorldGraph;triggers:readonly SpatialTrigger[];provenance:'RECONSTRUCTION_POLICY'};

export function createTrainingHousePolicy(spec:TrainingHousePolicySpec):TrainingHousePolicy{
  if(!spec.id)throw new Error('Missing training-house policy id');
  const fieldSceneId=`${spec.id}:field`,interiorSceneId=`${spec.id}:interior`;
  const enterTriggerId=`${spec.id}:door-enter`,exitTriggerId=`${spec.id}:door-exit`;
  const enterEdgeId=`${spec.id}:enter`,exitEdgeId=`${spec.id}:exit`;
  const graph:WorldGraph={
    schema:1,id:spec.id,provenance:'RECONSTRUCTION_POLICY',
    scenes:[
      {id:fieldSceneId,mapId:spec.field.mapId,kind:'field',displayName:spec.field.name,provenance:'RECONSTRUCTION_POLICY',spawns:[{id:'return-from-interior',cell:spec.field.returnSpawn,direction:spec.field.returnDirection,provenance:'RECONSTRUCTION_POLICY'}]},
      {id:interiorSceneId,mapId:spec.interior.mapId,kind:'interior',displayName:spec.interior.name,provenance:'RECONSTRUCTION_POLICY',spawns:[{id:'entry-from-field',cell:spec.interior.entrySpawn,direction:spec.interior.entryDirection,provenance:'RECONSTRUCTION_POLICY'}]},
    ],
    transitions:[
      {id:enterEdgeId,fromSceneId:fieldSceneId,toSceneId:interiorSceneId,triggerId:enterTriggerId,arrivalSpawnId:'entry-from-field',reverseEdgeId:exitEdgeId,provenance:'RECONSTRUCTION_POLICY'},
      {id:exitEdgeId,fromSceneId:interiorSceneId,toSceneId:fieldSceneId,triggerId:exitTriggerId,arrivalSpawnId:'return-from-interior',reverseEdgeId:enterEdgeId,provenance:'RECONSTRUCTION_POLICY'},
    ],
  };
  const triggers:SpatialTrigger[]=[
    {id:enterTriggerId,mapId:spec.field.mapId,activation:'enter',purpose:'scene-transition',zone:spec.field.entranceZone,priority:100,provenance:'RECONSTRUCTION_POLICY'},
    {id:exitTriggerId,mapId:spec.interior.mapId,activation:'enter',purpose:'scene-transition',zone:spec.interior.exitZone,priority:100,provenance:'RECONSTRUCTION_POLICY'},
  ];
  for(const npc of spec.npcs??[]){
    if(npc.entity.mapId!==spec.field.mapId&&npc.entity.mapId!==spec.interior.mapId)throw new Error('NPC map is outside training-house graph');
    triggers.push({id:`${spec.id}:npc:${npc.entity.id}`,mapId:npc.entity.mapId,activation:'interact',purpose:'world-entity',entityId:npc.entity.id,zone:{shape:'manhattan',center:[npc.entity.x,npc.entity.y],radius:npc.entity.interactionRadius},priority:50,provenance:'RECONSTRUCTION_POLICY'});
  }
  validateWorldGraph(graph);
  validateSpatialTriggers(triggers);
  return{graph,triggers,provenance:'RECONSTRUCTION_POLICY'};
}
