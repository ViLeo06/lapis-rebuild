import type {RuntimeProvenance} from '../runtime-boundaries.ts';
import type {DialoguePresentation,WorldEntity} from './world-model.ts';

export type QuestMarker='none'|'available'|'active'|'turn-in'|'complete';

export type NpcDefinition={
  entity:WorldEntity & {kind:'npc'};
  questId?:string;
  shortDialogue:Partial<Record<QuestMarker,string[]>>;
  provenance:RuntimeProvenance;
};

export type NpcPresentation={
  npcId:string;
  displayName:string;
  marker:QuestMarker;
  available:boolean;
  dialogue:DialoguePresentation;
  provenance:'RECONSTRUCTION_POLICY';
};

export function presentNpc(npc:NpcDefinition,marker:QuestMarker,available:boolean):NpcPresentation{
  const lines=npc.shortDialogue[marker]??npc.shortDialogue.none??['……'];
  return{
    npcId:npc.entity.id,
    displayName:npc.entity.displayName,
    marker,
    available,
    dialogue:{speaker:npc.entity.displayName,lines:[...lines],provenance:'RECONSTRUCTION_POLICY'},
    provenance:'RECONSTRUCTION_POLICY',
  };
}
