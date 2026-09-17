import type {Cell} from '../coordinates.ts';
import type {RuntimeProvenance} from '../runtime-boundaries.ts';
import {arrivalForEdge,sceneByMapId,transitionByTrigger,validateWorldGraph} from './world-graph.ts';
import type {WorldGraph} from './world-graph.ts';
import {SpatialTriggerRuntime,validateSpatialTriggers} from './spatial-trigger.ts';
import type {InteractionOffer,SpatialPosition,SpatialTrigger} from './spatial-trigger.ts';

export type SceneTransitionRequest={
  edgeId:string;
  sourceTriggerId:string;
  from:{sceneId:string;mapId:number;cell:Cell};
  to:{sceneId:string;mapId:number;spawnId:string;cell:Cell;direction?:number};
  provenance:RuntimeProvenance;
};
export type SceneTransitionCommit={sceneId:string;mapId:number;cell:Cell;direction?:number;edgeId:string;provenance:RuntimeProvenance};
export type SceneSpatialUpdate={transition:SceneTransitionRequest|null;interactions:InteractionOffer[];entered:string[];exited:string[]};

export class SceneTransitionController{
  readonly graph:WorldGraph;
  readonly triggers:readonly SpatialTrigger[];
  private readonly runtime:SpatialTriggerRuntime;
  private position:SpatialPosition|null=null;
  private pending:SceneTransitionRequest|null=null;

  constructor(graph:WorldGraph,triggers:readonly SpatialTrigger[]){
    this.graph=validateWorldGraph(graph);
    this.triggers=validateSpatialTriggers(triggers);
    this.runtime=new SpatialTriggerRuntime(this.triggers);
    const sceneTriggers=this.triggers.filter(trigger=>trigger.purpose==='scene-transition');
    const triggerIds=new Set(sceneTriggers.map(trigger=>trigger.id));
    for(const edge of this.graph.transitions){
      if(!triggerIds.has(edge.triggerId))throw new Error(`Missing spatial trigger for edge ${edge.id}`);
      const trigger=sceneTriggers.find(candidate=>candidate.id===edge.triggerId)!;
      const source=this.graph.scenes.find(scene=>scene.id===edge.fromSceneId)!;
      if(trigger.mapId!==source.mapId)throw new Error(`Transition trigger map mismatch for edge ${edge.id}`);
    }
    for(const trigger of sceneTriggers)if(!transitionByTrigger(this.graph,trigger.id))throw new Error(`Transition trigger ${trigger.id} has no graph edge`);
  }

  start(position:SpatialPosition):void{
    sceneByMapId(this.graph,position.mapId);
    this.runtime.prime(position);
    this.position={mapId:position.mapId,cell:[...position.cell] as Cell};
    this.pending=null;
  }

  update(position:SpatialPosition):SceneSpatialUpdate{
    const scene=sceneByMapId(this.graph,position.mapId);
    if(!this.position)this.start(position);
    else if(position.mapId!==this.position.mapId)throw new Error('Scene map changed without transition commit');
    const sample=this.runtime.sample(position);
    this.position={mapId:position.mapId,cell:[...position.cell] as Cell};
    if(this.pending)return{transition:null,interactions:sample.interactions,entered:sample.entered,exited:sample.exited};
    const transition=sample.autoTriggerId?this.requestForTrigger(sample.autoTriggerId,scene.id,position):null;
    if(transition)this.pending=transition;
    return{transition,interactions:sample.interactions,entered:sample.entered,exited:sample.exited};
  }

  commit(request:SceneTransitionRequest):SceneTransitionCommit{
    if(!this.pending||request.edgeId!==this.pending.edgeId||request.sourceTriggerId!==this.pending.sourceTriggerId)throw new Error('Stale scene transition request');
    const edge=this.graph.transitions.find(candidate=>candidate.id===request.edgeId);
    if(!edge)throw new Error('Unknown scene transition edge');
    const arrival=arrivalForEdge(this.graph,edge);
    if(arrival.scene.id!==request.to.sceneId||arrival.scene.mapId!==request.to.mapId||arrival.spawn.id!==request.to.spawnId)throw new Error('Scene transition request drift');
    const destination:SpatialPosition={mapId:arrival.scene.mapId,cell:arrival.spawn.cell};
    this.runtime.prime(destination);
    this.position={mapId:destination.mapId,cell:[...destination.cell] as Cell};
    this.pending=null;
    return{sceneId:arrival.scene.id,mapId:arrival.scene.mapId,cell:[...arrival.spawn.cell] as Cell,direction:arrival.spawn.direction,edgeId:edge.id,provenance:edge.provenance};
  }

  rejectPending():void{
    if(!this.pending)return;
    this.runtime.suppressUntilExit(this.pending.sourceTriggerId);
    this.pending=null;
  }

  private requestForTrigger(triggerId:string,sceneId:string,position:SpatialPosition):SceneTransitionRequest|null{
    const edge=transitionByTrigger(this.graph,triggerId);
    if(!edge)return null;
    if(edge.fromSceneId!==sceneId)throw new Error('Transition source scene mismatch');
    const arrival=arrivalForEdge(this.graph,edge);
    return{
      edgeId:edge.id,sourceTriggerId:triggerId,
      from:{sceneId,mapId:position.mapId,cell:[...position.cell] as Cell},
      to:{sceneId:arrival.scene.id,mapId:arrival.scene.mapId,spawnId:arrival.spawn.id,cell:[...arrival.spawn.cell] as Cell,direction:arrival.spawn.direction},
      provenance:edge.provenance,
    };
  }
}
