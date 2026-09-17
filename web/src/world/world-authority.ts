import {presentNpc} from './npc-model.ts';
import {applyQuestEvent,initialQuestRuntime,questMarker,type QuestRuntimeState} from './quest-runtime.ts';
import type {EncounterRequest,InteractionResult,WorldInteractionIntent,WorldState} from './world-model.ts';
import {canInteract} from './world-model.ts';
import {OUTER_CITY_ENTRY,OUTER_CITY_OBJECTIVE,OUTER_CITY_MAP_ID,TRAINING_BATTLE_ZONE_ID,TRAINING_GUIDE,TRAINING_MAP_ID,TRAINING_QUEST_ID,TRAINING_RETURN} from './world-content.ts';

export type BattleResult={battleZoneId:number;outcome:'won'|'lost'|'escaped'};
export type WorldRuntimeState={world:WorldState;quest:QuestRuntimeState};
export type BattleResolution={state:WorldRuntimeState;returnTo?:WorldState;questAdvanced:boolean;provenance:'RECONSTRUCTION_POLICY'};

export class ReconstructionWorldAuthority{
  readonly id='s9-reconstruction-world-v1';
  readonly provenance='RECONSTRUCTION_POLICY' as const;

  initial(world:WorldState):WorldRuntimeState{
    return{world:{...world},quest:initialQuestRuntime(TRAINING_QUEST_ID)};
  }

  interact(state:WorldRuntimeState,intent:WorldInteractionIntent):{state:WorldRuntimeState;result:InteractionResult}{
    if(intent.provenance!=='RECONSTRUCTION_POLICY')throw new Error('S9 authority only accepts reconstruction intents');
    if(intent.mapId!==state.world.mapId)return{state,result:this.reject('Interaction map mismatch')};
    if(intent.entityId===TRAINING_GUIDE.entity.id)return this.interactGuide(state);
    if(intent.entityId===OUTER_CITY_OBJECTIVE.id)return this.interactObjective(state);
    return{state,result:this.reject('Unknown world entity')};
  }

  resolveBattle(state:WorldRuntimeState,result:BattleResult):BattleResolution{
    if(result.outcome!=='won'||result.battleZoneId!==TRAINING_BATTLE_ZONE_ID){
      return{state,questAdvanced:false,provenance:'RECONSTRUCTION_POLICY'};
    }
    const quest=applyQuestEvent(state.quest,{type:'battle_won',battleZoneId:result.battleZoneId},TRAINING_BATTLE_ZONE_ID);
    if(quest.stage===state.quest.stage)return{state,questAdvanced:false,provenance:'RECONSTRUCTION_POLICY'};
    return{state:{world:{...TRAINING_RETURN},quest},returnTo:{...TRAINING_RETURN},questAdvanced:true,provenance:'RECONSTRUCTION_POLICY'};
  }

  private interactGuide(state:WorldRuntimeState):{state:WorldRuntimeState;result:InteractionResult}{
    if(!canInteract(TRAINING_GUIDE.entity,state.world))return{state,result:this.reject('NPC out of range')};
    const marker=questMarker(state.quest.stage);
    const presentation=presentNpc(TRAINING_GUIDE,marker,true);
    if(state.quest.stage==='not_started'){
      const quest=applyQuestEvent(state.quest,{type:'accept'},TRAINING_BATTLE_ZONE_ID);
      return{
        state:{world:{...state.world},quest},
        result:{accepted:true,dialogue:presentation.dialogue,warp:{fromMapId:TRAINING_MAP_ID,toMapId:OUTER_CITY_MAP_ID,x:OUTER_CITY_ENTRY.x,y:OUTER_CITY_ENTRY.y,reason:'quest',provenance:'RECONSTRUCTION_POLICY'},provenance:'RECONSTRUCTION_POLICY'},
      };
    }
    if(state.quest.stage==='ready_to_turn_in'){
      const quest=applyQuestEvent(state.quest,{type:'turn_in'},TRAINING_BATTLE_ZONE_ID);
      return{state:{world:{...state.world},quest},result:{accepted:true,dialogue:presentation.dialogue,provenance:'RECONSTRUCTION_POLICY'}};
    }
    return{state,result:{accepted:true,dialogue:presentation.dialogue,provenance:'RECONSTRUCTION_POLICY'}};
  }

  private interactObjective(state:WorldRuntimeState):{state:WorldRuntimeState;result:InteractionResult}{
    if(!canInteract(OUTER_CITY_OBJECTIVE,state.world))return{state,result:this.reject('Objective out of range')};
    const arrived=state.quest.stage==='accepted'?applyQuestEvent(state.quest,{type:'arrive_objective_map'},TRAINING_BATTLE_ZONE_ID):state.quest;
    if(arrived.stage!=='objective')return{state:{world:{...state.world},quest:arrived},result:this.reject('Quest objective unavailable')};
    const encounter:EncounterRequest={battleZoneId:TRAINING_BATTLE_ZONE_ID,returnState:{...TRAINING_RETURN},reason:'quest-objective',provenance:'RECONSTRUCTION_POLICY'};
    return{state:{world:{...state.world},quest:arrived},result:{accepted:true,encounter,provenance:'RECONSTRUCTION_POLICY'}};
  }

  private reject(reason:string):InteractionResult{
    return{accepted:false,reason,provenance:'RECONSTRUCTION_POLICY'};
  }
}
