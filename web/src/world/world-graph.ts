import type {RuntimeProvenance} from '../runtime-boundaries.ts';
import type {Cell} from '../coordinates.ts';

export type WorldSceneKind='field'|'interior'|'battle';
export type WorldSpawnPoint={id:string;cell:Cell;direction?:number;provenance:RuntimeProvenance};
export type WorldSceneNode={id:string;mapId:number;kind:WorldSceneKind;displayName:string;spawns:readonly WorldSpawnPoint[];provenance:RuntimeProvenance};
export type WorldTransitionEdge={id:string;fromSceneId:string;toSceneId:string;triggerId:string;arrivalSpawnId:string;reverseEdgeId?:string;provenance:RuntimeProvenance};
export type WorldGraph={schema:1;id:string;scenes:readonly WorldSceneNode[];transitions:readonly WorldTransitionEdge[];provenance:RuntimeProvenance};

const validId=(value:string)=>/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const validCell=(cell:Cell)=>cell.length===2&&cell.every(value=>Number.isInteger(value)&&value>=0);

export function validateWorldGraph(graph:WorldGraph):WorldGraph{
  if(graph.schema!==1||!validId(graph.id)||!graph.scenes.length)throw new Error('Invalid world graph');
  const sceneIds=new Set<string>(),mapIds=new Set<number>();
  for(const scene of graph.scenes){
    if(!validId(scene.id)||sceneIds.has(scene.id)||!Number.isInteger(scene.mapId)||scene.mapId<0||mapIds.has(scene.mapId)||!scene.displayName||scene.displayName.length>120||!scene.spawns.length)throw new Error('Invalid world scene');
    sceneIds.add(scene.id);mapIds.add(scene.mapId);
    const spawnIds=new Set<string>();
    for(const spawn of scene.spawns){
      if(!validId(spawn.id)||spawnIds.has(spawn.id)||!validCell(spawn.cell)||spawn.direction!==undefined&&(!Number.isInteger(spawn.direction)||spawn.direction<0||spawn.direction>7))throw new Error('Invalid world spawn');
      spawnIds.add(spawn.id);
    }
  }
  const edgeIds=new Set<string>(),triggerIds=new Set<string>();
  for(const edge of graph.transitions){
    if(!validId(edge.id)||edgeIds.has(edge.id)||!sceneIds.has(edge.fromSceneId)||!sceneIds.has(edge.toSceneId)||edge.fromSceneId===edge.toSceneId||!validId(edge.triggerId)||triggerIds.has(edge.triggerId))throw new Error('Invalid world transition');
    const destination=graph.scenes.find(scene=>scene.id===edge.toSceneId)!;
    if(!destination.spawns.some(spawn=>spawn.id===edge.arrivalSpawnId))throw new Error('Unknown transition arrival spawn');
    edgeIds.add(edge.id);triggerIds.add(edge.triggerId);
  }
  for(const edge of graph.transitions){
    if(!edge.reverseEdgeId)continue;
    const reverse=graph.transitions.find(candidate=>candidate.id===edge.reverseEdgeId);
    if(!reverse||reverse.fromSceneId!==edge.toSceneId||reverse.toSceneId!==edge.fromSceneId||reverse.reverseEdgeId!==edge.id)throw new Error('Invalid reverse transition');
  }
  return graph;
}

export function sceneByMapId(graph:WorldGraph,mapId:number):WorldSceneNode{
  const scene=graph.scenes.find(candidate=>candidate.mapId===mapId);
  if(!scene)throw new Error(`Unknown world map ${mapId}`);
  return scene;
}

export function transitionByTrigger(graph:WorldGraph,triggerId:string):WorldTransitionEdge|null{
  return graph.transitions.find(edge=>edge.triggerId===triggerId)??null;
}

export function arrivalForEdge(graph:WorldGraph,edge:WorldTransitionEdge):{scene:WorldSceneNode;spawn:WorldSpawnPoint}{
  const scene=graph.scenes.find(candidate=>candidate.id===edge.toSceneId);
  if(!scene)throw new Error('Transition destination scene missing');
  const spawn=scene.spawns.find(candidate=>candidate.id===edge.arrivalSpawnId);
  if(!spawn)throw new Error('Transition destination spawn missing');
  return{scene,spawn};
}
