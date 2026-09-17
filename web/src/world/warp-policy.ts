import type {WarpRequest,WorldState} from './world-model.ts';

export function applyWarp(state:WorldState,request:WarpRequest):WorldState{
  if(state.mapId!==request.fromMapId)throw new Error('Warp source map mismatch');
  if(!Number.isInteger(request.toMapId)||request.toMapId<0||!Number.isFinite(request.x)||!Number.isFinite(request.y))throw new Error('Invalid warp request');
  return{mapId:request.toMapId,x:request.x,y:request.y};
}
