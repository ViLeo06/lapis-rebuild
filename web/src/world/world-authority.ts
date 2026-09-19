import {applyQuestEvent,initialQuestRuntime,type QuestRuntimeState} from './quest-runtime.ts';
import type {EncounterRequest,InteractionResult,WorldInteractionIntent,WorldState} from './world-model.ts';
import {canInteract} from './world-model.ts';
import {DEFAULT_TRAINING_WORLD_CONTENT} from './world-content.ts';
import type {TrainingWorldContent} from './world-content.ts';
import {
  applyNpcDialogueChoice,
  beginNpcDialogue,
} from './npc-dialogue-runtime.ts';
import type {
  ApplyNpcDialogueChoiceResult,
  BeginNpcDialogueResult,
  NpcDialogueChoiceId,
  NpcDialogueIntent,
  NpcDialogueSession,
} from './npc-dialogue-runtime.ts';

export type BattleResult={battleZoneId:number;outcome:'won'|'lost'|'escaped'};
export type WorldRuntimeState={world:WorldState;quest:QuestRuntimeState};
export type BattleResolution={state:WorldRuntimeState;returnTo?:WorldState;questAdvanced:boolean;provenance:'RECONSTRUCTION_POLICY'};
export type BeginNpcInteractionResolution={state:WorldRuntimeState;dialogue:BeginNpcDialogueResult};
export type ChooseNpcInteractionResolution={state:WorldRuntimeState;outcome:ApplyNpcDialogueChoiceResult};

export class ReconstructionWorldAuthority{
  readonly id='s23-reconstruction-world-v2';
  readonly provenance='RECONSTRUCTION_POLICY' as const;
  readonly content:TrainingWorldContent;
  constructor(content:TrainingWorldContent=DEFAULT_TRAINING_WORLD_CONTENT){this.content=content;}

  initial(world:WorldState):WorldRuntimeState{
    return{world:{...world},quest:initialQuestRuntime(this.content.questId)};
  }

  beginNpcInteraction(state:WorldRuntimeState,intent:NpcDialogueIntent):BeginNpcInteractionResolution{
    return{
      state,
      dialogue:beginNpcDialogue(this.content.guide,state.quest,state.world,intent),
    };
  }

  chooseNpcInteraction(
    state:WorldRuntimeState,
    session:NpcDialogueSession,
    choiceId:NpcDialogueChoiceId,
  ):ChooseNpcInteractionResolution{
    const outcome=applyNpcDialogueChoice(session,state.quest,choiceId,this.content.battleZoneId);
    if(!outcome.accepted)return{state,outcome};
    return{
      state:{world:{...state.world},quest:outcome.quest},
      outcome,
    };
  }

  interact(state:WorldRuntimeState,intent:WorldInteractionIntent):{state:WorldRuntimeState;result:InteractionResult}{
    if(intent.provenance!=='RECONSTRUCTION_POLICY')throw new Error('S23 authority only accepts reconstruction intents');
    if(intent.mapId!==state.world.mapId)return{state,result:this.reject('Interaction map mismatch')};
    if(intent.entityId===this.content.guide.entity.id)return this.interactGuide(state,intent);
    if(intent.entityId===this.content.objective.id)return this.interactObjective(state);
    return{state,result:this.reject('Unknown world entity')};
  }

  arriveObjectiveMap(state:WorldRuntimeState,mapId:number):WorldRuntimeState{
    if(mapId!==this.content.objectiveMapId||state.quest.stage!=='accepted')return state;
    return{...state,world:{...state.world,mapId},quest:applyQuestEvent(state.quest,{type:'arrive_objective_map'},this.content.battleZoneId)};
  }

  resolveBattle(state:WorldRuntimeState,result:BattleResult):BattleResolution{
    if(result.outcome!=='won'||result.battleZoneId!==this.content.battleZoneId){
      return{state,questAdvanced:false,provenance:'RECONSTRUCTION_POLICY'};
    }
    const quest=applyQuestEvent(state.quest,{type:'battle_won',battleZoneId:result.battleZoneId},this.content.battleZoneId);
    if(quest.stage===state.quest.stage)return{state,questAdvanced:false,provenance:'RECONSTRUCTION_POLICY'};
    return{state:{world:{...this.content.returnState},quest},returnTo:{...this.content.returnState},questAdvanced:true,provenance:'RECONSTRUCTION_POLICY'};
  }

  private interactGuide(state:WorldRuntimeState,intent:WorldInteractionIntent):{state:WorldRuntimeState;result:InteractionResult}{
    const begun=this.beginNpcInteraction(state,{...intent,inputSource:'compatibility'});
    if(!begun.dialogue.accepted)return{state,result:this.reject(`NPC interaction rejected: ${begun.dialogue.reason}`)};

    const session=begun.dialogue.session;
    const dialogue={
      speaker:session.view.speaker,
      lines:[...session.view.lines],
      provenance:'RECONSTRUCTION_POLICY' as const,
    };
    let nextState=state;
    let defaultChoice:NpcDialogueChoiceId|null=null;
    if(session.view.choices.some(entry=>entry.id==='accept-quest'))defaultChoice='accept-quest';
    else if(session.view.choices.some(entry=>entry.id==='turn-in-quest'))defaultChoice='turn-in-quest';

    if(defaultChoice){
      const chosen=this.chooseNpcInteraction(state,session,defaultChoice);
      if(!chosen.outcome.accepted)return{state,result:this.reject(`NPC choice rejected: ${chosen.outcome.reason}`)};
      nextState=chosen.state;
    }

    const acceptedQuest=state.quest.stage==='not_started'&&nextState.quest.stage==='accepted';
    return{
      state:nextState,
      result:{
        accepted:true,
        dialogue,
        ...(acceptedQuest&&this.content.warpOnAccept?{
          warp:{
            fromMapId:this.content.trainingMapId,
            toMapId:this.content.objectiveMapId,
            x:this.content.objectiveEntry.x,
            y:this.content.objectiveEntry.y,
            reason:'quest' as const,
            provenance:'RECONSTRUCTION_POLICY' as const,
          },
        }:{}),
        provenance:'RECONSTRUCTION_POLICY',
      },
    };
  }

  private interactObjective(state:WorldRuntimeState):{state:WorldRuntimeState;result:InteractionResult}{
    if(!canInteract(this.content.objective,state.world))return{state,result:this.reject('Objective out of range')};
    const arrived=state.quest.stage==='accepted'?applyQuestEvent(state.quest,{type:'arrive_objective_map'},this.content.battleZoneId):state.quest;
    if(arrived.stage!=='objective')return{state:{world:{...state.world},quest:arrived},result:this.reject('Quest objective unavailable')};
    const encounter:EncounterRequest={battleZoneId:this.content.battleZoneId,returnState:{...this.content.returnState},reason:'quest-objective',provenance:'RECONSTRUCTION_POLICY'};
    return{state:{world:{...state.world},quest:arrived},result:{accepted:true,encounter,provenance:'RECONSTRUCTION_POLICY'}};
  }

  private reject(reason:string):InteractionResult{
    return{accepted:false,reason,provenance:'RECONSTRUCTION_POLICY'};
  }
}
