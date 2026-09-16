import type{RuntimeProvenance}from'./runtime-boundaries.ts';

export type QuestPresentationUpdate={
  questIndex:number;
  stepIndex:number;
  provenance:RuntimeProvenance;
  authority:'server-session'|'offline-reconstruction';
};

export type NpcPresentationSelection={
  blockId:number;
  valueA?:number;
  valueB?:number;
  provenance:RuntimeProvenance;
  authority:'server-session'|'offline-reconstruction';
};

export type WarpRequest={selected:number;provenance:RuntimeProvenance};
export type RecruitmentRequest={operation:'UNKNOWN_4D'|'UNKNOWN_4E';provenance:RuntimeProvenance};

export function serverQuestPresentation(questIndex:number,stepIndex:number):QuestPresentationUpdate{
  if(!Number.isInteger(questIndex)||questIndex<0||!Number.isInteger(stepIndex)||stepIndex<0)throw new Error('Invalid Quest presentation state');
  return{questIndex,stepIndex,provenance:'VERIFIED',authority:'server-session'};
}

export function serverNpcSelection(blockId:number,valueA?:number,valueB?:number):NpcPresentationSelection{
  if(!Number.isInteger(blockId)||blockId<0||blockId>255)throw new Error('Invalid NPC block id');
  for(const value of[valueA,valueB])if(value!==undefined&&!Number.isInteger(value))throw new Error('Invalid NPC selector value');
  return{blockId,valueA,valueB,provenance:'VERIFIED',authority:'server-session'};
}

export function reconstructionQuestPresentation(questIndex:number,stepIndex:number):QuestPresentationUpdate{
  const verified=serverQuestPresentation(questIndex,stepIndex);
  return{...verified,provenance:'RECONSTRUCTION_POLICY',authority:'offline-reconstruction'};
}

export function reconstructionNpcSelection(blockId:number):NpcPresentationSelection{
  const verified=serverNpcSelection(blockId);
  return{...verified,provenance:'RECONSTRUCTION_POLICY',authority:'offline-reconstruction'};
}

export function warpRequest(selected:number):WarpRequest{
  if(!Number.isInteger(selected)||selected<0||selected>0xffff)throw new Error('Invalid warp selection');
  return{selected,provenance:'VERIFIED'};
}

export function recruitmentRequest(operation:'UNKNOWN_4D'|'UNKNOWN_4E'):RecruitmentRequest{
  return{operation,provenance:'VERIFIED'};
}
