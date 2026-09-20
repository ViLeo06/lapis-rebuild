import {validateWorldGraph} from './world-graph.ts';
import type {WorldGraph} from './world-graph.ts';
import {evaluateM6WorldGate,validateM6WorldGate} from './m6-progression-gates.ts';
import type {M6WorldGate,M6WorldGateContext,M6WorldGateTarget} from './m6-progression-gates.ts';

export type M6EncounterCarrier={
  id:string;
  sceneId:string;
  battleZoneId:number;
  provenance:'RECONSTRUCTION_POLICY';
};

export type M6WorldProgressionDefinition={
  id:string;
  graph:WorldGraph;
  npcEntityIds:readonly string[];
  encounters:readonly M6EncounterCarrier[];
  gates:readonly M6WorldGate[];
  provenance:'RECONSTRUCTION_POLICY';
};

export type M6WorldTargetAvailability={
  available:boolean;
  reasons:string[];
  gateIds:string[];
  provenance:'RECONSTRUCTION_POLICY';
};

const token=(value:unknown,max=128):value is string=>
  typeof value==='string'&&value.length>0&&value.length<=max&&/^[A-Za-z0-9._:/-]+$/.test(value);

export function validateM6WorldProgressionDefinition(
  definition:M6WorldProgressionDefinition,
):M6WorldProgressionDefinition{
  if(!definition||typeof definition!=='object'||!token(definition.id)||definition.provenance!=='RECONSTRUCTION_POLICY')throw new Error('Invalid M6 world progression definition');
  const graph=validateWorldGraph(definition.graph);
  if(!Array.isArray(definition.npcEntityIds)||definition.npcEntityIds.some(id=>!token(id))||new Set(definition.npcEntityIds).size!==definition.npcEntityIds.length)throw new Error('Invalid M6 world NPC registry');
  if(!Array.isArray(definition.encounters)||definition.encounters.length>256)throw new Error('Invalid M6 encounter carrier registry');
  const sceneIds=new Set(graph.scenes.map(scene=>scene.id));
  const encounterIds=new Set<string>();
  const encounters=definition.encounters.map(encounter=>{
    if(!encounter||!token(encounter.id)||encounterIds.has(encounter.id)||!sceneIds.has(encounter.sceneId)||!Number.isInteger(encounter.battleZoneId)||encounter.battleZoneId<0||encounter.battleZoneId>65535||encounter.provenance!=='RECONSTRUCTION_POLICY')throw new Error('Invalid M6 encounter carrier');
    encounterIds.add(encounter.id);
    return{...encounter};
  });
  const transitionIds=new Set(graph.transitions.map(edge=>edge.id));
  const npcIds=new Set(definition.npcEntityIds);
  const gateIds=new Set<string>();
  const gates=definition.gates.map(raw=>{
    const gate=validateM6WorldGate(raw);
    if(gateIds.has(gate.id))throw new Error('Duplicate M6 world gate');
    gateIds.add(gate.id);
    if(gate.target==='scene-transition'&&!transitionIds.has(gate.targetId))throw new Error('M6 world gate references unknown transition');
    if(gate.target==='npc-interaction'&&!npcIds.has(gate.targetId))throw new Error('M6 world gate references unknown NPC');
    if(gate.target==='encounter'&&!encounterIds.has(gate.targetId))throw new Error('M6 world gate references unknown encounter');
    return gate;
  });
  return{
    id:definition.id,
    graph,
    npcEntityIds:[...definition.npcEntityIds],
    encounters,
    gates,
    provenance:'RECONSTRUCTION_POLICY',
  };
}

export function m6WorldTargetAvailability(
  definition:M6WorldProgressionDefinition,
  target:M6WorldGateTarget,
  targetId:string,
  context:M6WorldGateContext,
):M6WorldTargetAvailability{
  const valid=validateM6WorldProgressionDefinition(definition);
  const known=
    target==='scene-transition'?valid.graph.transitions.some(edge=>edge.id===targetId):
    target==='npc-interaction'?valid.npcEntityIds.includes(targetId):
    valid.encounters.some(encounter=>encounter.id===targetId);
  if(!known)throw new Error('Unknown M6 world progression target');
  const gates=valid.gates.filter(gate=>gate.target===target&&gate.targetId===targetId);
  const decisions=gates.map(gate=>({gate,decision:evaluateM6WorldGate(gate,context)}));
  return{
    available:decisions.every(entry=>entry.decision.available),
    reasons:[...new Set(decisions.flatMap(entry=>entry.decision.reasons))],
    gateIds:gates.map(gate=>gate.id),
    provenance:'RECONSTRUCTION_POLICY',
  };
}
