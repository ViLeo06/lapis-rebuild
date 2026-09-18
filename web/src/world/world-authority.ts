import {presentNpc} from './npc-model.ts';
import {applyQuestEvent,initialQuestRuntime,questMarker,type QuestRuntimeState} from './quest-runtime.ts';
import type {EncounterRequest,InteractionResult,WorldInteractionIntent,WorldState} from './world-model.ts';
import {canInteract} from './world-model.ts';
import {DEFAULT_TRAINING_WORLD_CONTENT} from './world-content.ts';
import type {TrainingWorldContent} from './world-content.ts';

export type BattleResult={battleZoneId:number;outcome:'won'|'lost'|'escaped'};
export type WorldRuntimeState={world:WorldState;quest:QuestRuntimeState};
export type BattleResolution={state:WorldRuntimeState;returnTo?:WorldState;questAdvanced:boolean;provenance:'RECONSTRUCTION_POLICY'};

export class ReconstructionWorldAuthority{
  readonly id='s9-reconstruction-world-v1';
  readonly provenance='RECONSTRUCTION_POLICY' as const;
  readonly content:TrainingWorldContent;
  constructor(content:TrainingWorldContent=DEFAULT_TRAINING_WORLD_CONTENT){this.content=content;}

  initial(world:WorldState):WorldRuntimeState{
    return{world:{...world},quest:initialQuestRuntime(this.content.questId)};
  }

  interact(state:WorldRuntimeState,intent:WorldInteractionIntent):{state:WorldRuntimeState;result:InteractionResult}{
    if(intent.provenance!=='RECONSTRUCTION_POLICY')throw new Error('S9 authority only accepts reconstruction intents');
    if(intent.mapId!==state.world.mapId)return{state,result:this.reject('Interaction map mismatch')};
    if(intent.entityId===this.content.guide.entity.id)return this.interactGuide(state);
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

  private interactGuide(state:WorldRuntimeState):{state:WorldRuntimeState;result:InteractionResult}{
    if(!canInteract(this.content.guide.entity,state.world))return{state,result:this.reject('NPC out of range')};
    const marker=questMarker(state.quest.stage);
    const presentation=presentNpc(this.content.guide,marker,true);
    if(state.quest.stage==='not_started'){
      const quest=applyQuestEvent(state.quest,{type:'accept'},this.content.battleZoneId);
      return{
        state:{world:{...state.world},quest},
        result:{
          accepted:true,
          dialogue:presentation.dialogue,
          ...(this.content.warpOnAccept?{warp:{fromMapId:this.content.trainingMapId,toMapId:this.content.objectiveMapId,x:this.content.objectiveEntry.x,y:this.content.objectiveEntry.y,reason:'quest' as const,provenance:'RECONSTRUCTION_POLICY' as const}}:{}),
          provenance:'RECONSTRUCTION_POLICY'
        },
      };
    }
    if(state.quest.stage==='ready_to_turn_in'){
      const quest=applyQuestEvent(state.quest,{type:'turn_in'},TRAINING_BATTLE_ZONE_ID);
      return{state:{world:{...state.world},quest},result:{accepted:true,dialogue:presentation.dialogue,provenance:'RECONSTRUCTION_POLICY'}};
    }
    return{state,result:{accepted:true,dialogue:presentation.dialogue,provenance:'RECONSTRUCTION_POLICY'}};
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
