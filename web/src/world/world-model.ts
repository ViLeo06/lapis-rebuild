import type {RuntimeProvenance} from '../runtime-boundaries.ts';

export type WorldEntityKind='npc'|'warp'|'encounter'|'marker';
export type WorldEntity={
  id:string;
  kind:WorldEntityKind;
  mapId:number;
  x:number;
  y:number;
  displayName:string;
  interactionRadius:number;
  provenance:RuntimeProvenance;
};

export type WorldState={
  mapId:number;
  x:number;
  y:number;
};

export type WorldInteractionIntent={
  entityId:string;
  mapId:number;
  actorX:number;
  actorY:number;
  provenance:'RECONSTRUCTION_POLICY';
};

export type WarpRequest={
  fromMapId:number;
  toMapId:number;
  x:number;
  y:number;
  reason:'quest'|'world';
  provenance:'RECONSTRUCTION_POLICY';
};

export type EncounterRequest={
  battleZoneId:number;
  returnState:WorldState;
  reason:'quest-objective';
  provenance:'RECONSTRUCTION_POLICY';
};

export type DialoguePresentation={
  speaker:string;
  lines:string[];
  provenance:'RECONSTRUCTION_POLICY';
};

export type InteractionResult={
  accepted:boolean;
  dialogue?:DialoguePresentation;
  warp?:WarpRequest;
  encounter?:EncounterRequest;
  reason?:string;
  provenance:'RECONSTRUCTION_POLICY';
};

export function manhattanDistance(a:{x:number;y:number},b:{x:number;y:number}):number{
  return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
}

export function canInteract(entity:WorldEntity,state:WorldState):boolean{
  return entity.mapId===state.mapId&&manhattanDistance(entity,state)<=entity.interactionRadius;
}
