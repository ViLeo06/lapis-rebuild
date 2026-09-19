import {applyBattleReward,applyQuestReward,validateRewardState} from './rewards.ts';
import type {RewardApplication,RewardBundle,RewardState} from './rewards.ts';
import {
  emptyM6EquipmentLoadout,
  equipM6Item,
  reconcileM6EquipmentLoadout,
  validateM6EquipmentLoadout,
  validateM6EquipmentRule,
} from './m6-equipment.ts';
import type {
  M6EquipmentLoadout,
  M6EquipmentRule,
  M6EquipmentSlot,
} from './m6-equipment.ts';
import {
  M6_TECHNICAL_INVENTORY_POLICY,
  validateM6InventoryCapacity,
  validateM6InventoryPolicy,
} from './m6-inventory.ts';
import type {M6InventoryPolicy} from './m6-inventory.ts';
import {
  applyM6Promotion,
  createM6StageProgression,
  validateM6PromotionRequirement,
  validateM6StageProgressionState,
  validateM6StageTrack,
} from './m6-stage-promotion.ts';
import type {
  M6PromotionRequirement,
  M6PromotionResult,
  M6StageProgressionState,
  M6StageTrack,
} from './m6-stage-promotion.ts';
import {
  acceptM6Quest,
  applyM6QuestObjectiveEvent,
  commitM6QuestTurnIn,
  createM6QuestChainState,
  prepareM6QuestTurnIn,
  validateM6QuestChainDefinition,
  validateM6QuestChainStateForDefinition,
} from '../world/m6-quest-chain.ts';
import type {
  M6QuestChainDefinition,
  M6QuestChainState,
  M6QuestObjectiveEvent,
} from '../world/m6-quest-chain.ts';

export type M6GrowthState={
  rewards:RewardState;
  questChain:M6QuestChainState;
  stage:M6StageProgressionState;
  equipment:M6EquipmentLoadout;
};

export type M6GrowthAuthorityConfig={
  stageTrack:M6StageTrack;
  questChain:M6QuestChainDefinition;
  equipmentRules:readonly M6EquipmentRule[];
  promotionRules:readonly M6PromotionRequirement[];
  inventoryPolicy?:M6InventoryPolicy;
};

export type M6QuestTurnInResult={
  state:M6GrowthState;
  settled:boolean;
  rewardApplied:boolean;
  promotion:M6PromotionResult|null;
  unequipped:number[];
  reasons:string[];
  provenance:'RECONSTRUCTION_POLICY';
};

function uniqueStrings(values:readonly string[]):string[]{return[...new Set(values)];}

export class ReconstructionM6GrowthAuthority{
  readonly provenance='RECONSTRUCTION_POLICY' as const;
  readonly stageTrack:M6StageTrack;
  readonly questChain:M6QuestChainDefinition;
  readonly equipmentRules:readonly M6EquipmentRule[];
  readonly promotionRules:readonly M6PromotionRequirement[];
  readonly inventoryPolicy:M6InventoryPolicy;

  constructor(config:M6GrowthAuthorityConfig){
    this.stageTrack=validateM6StageTrack(config.stageTrack);
    this.questChain=validateM6QuestChainDefinition(config.questChain);
    this.equipmentRules=Object.freeze(config.equipmentRules.map(validateM6EquipmentRule));
    if(new Set(this.equipmentRules.map(rule=>rule.itemId)).size!==this.equipmentRules.length)throw new Error('Duplicate M6 growth equipment rule');
    this.promotionRules=Object.freeze(config.promotionRules.map(rule=>validateM6PromotionRequirement(rule,this.stageTrack)));
    if(new Set(this.promotionRules.map(rule=>rule.id)).size!==this.promotionRules.length)throw new Error('Duplicate M6 growth promotion rule');
    this.inventoryPolicy=validateM6InventoryPolicy(config.inventoryPolicy??M6_TECHNICAL_INVENTORY_POLICY);
    for(const quest of this.questChain.quests){
      if(quest.promotionRuleId&&!this.promotionRules.some(rule=>rule.id===quest.promotionRuleId))throw new Error('M6 quest references unknown promotion rule');
    }
  }

  initial(rewards:RewardState,stageId:number=this.stageTrack.stageIds[0]):M6GrowthState{
    const validRewards=validateRewardState(rewards);
    validateM6InventoryCapacity(validRewards.inventory,this.inventoryPolicy);
    const stage=createM6StageProgression(this.stageTrack,stageId);
    const questChain=createM6QuestChainState(this.questChain,validRewards.questFlags);
    const equipment:M6EquipmentLoadout={
      ...emptyM6EquipmentLoadout(),
      weapon:validRewards.inventory.equipped.weapon,
      armor:validRewards.inventory.equipped.armor,
    };
    const context={characterId:String(stage.stageId),family:stage.family,stageId:stage.stageId,level:validRewards.progression.level};
    return{
      rewards:validRewards,
      questChain,
      stage,
      equipment:validateM6EquipmentLoadout(equipment,validRewards.inventory,this.equipmentRules,context),
    };
  }

  validate(raw:M6GrowthState):M6GrowthState{
    const rewards=validateRewardState(raw.rewards);
    validateM6InventoryCapacity(rewards.inventory,this.inventoryPolicy);
    const stage=validateM6StageProgressionState(raw.stage,this.stageTrack);
    const questChain=validateM6QuestChainStateForDefinition(raw.questChain,this.questChain);
    const context={characterId:String(stage.stageId),family:stage.family,stageId:stage.stageId,level:rewards.progression.level};
    const equipment=validateM6EquipmentLoadout(raw.equipment,rewards.inventory,this.equipmentRules,context);
    return{rewards,questChain,stage,equipment};
  }

  acceptQuest(state:M6GrowthState,questId:string,npcId:string):{state:M6GrowthState;accepted:boolean}{
    const current=this.validate(state);
    const result=acceptM6Quest(this.questChain,current.questChain,questId,npcId,current.rewards.questFlags);
    return{state:{...current,questChain:result.state},accepted:result.accepted};
  }

  recordObjective(
    state:M6GrowthState,
    questId:string,
    event:M6QuestObjectiveEvent,
  ):{state:M6GrowthState;advanced:boolean}{
    const current=this.validate(state);
    const result=applyM6QuestObjectiveEvent(this.questChain,current.questChain,questId,event);
    return{state:{...current,questChain:result.state},advanced:result.advanced};
  }

  equip(
    state:M6GrowthState,
    slot:M6EquipmentSlot,
    itemId:number|null,
  ):M6GrowthState{
    const current=this.validate(state);
    const context={characterId:String(current.stage.stageId),family:current.stage.family,stageId:current.stage.stageId,level:current.rewards.progression.level};
    const equipment=equipM6Item(current.equipment,current.rewards.inventory,this.equipmentRules,context,slot,itemId);
    return{...current,equipment};
  }

  applyBattleReward(
    state:M6GrowthState,
    battleRef:string,
    receiptId:string,
    reward:Omit<RewardBundle,'source'|'receiptId'>,
  ):{state:M6GrowthState;application:RewardApplication}{
    const current=this.validate(state);
    const application=applyBattleReward(current.rewards,battleRef,receiptId,reward);
    validateM6InventoryCapacity(application.state.inventory,this.inventoryPolicy);
    return{state:{...current,rewards:application.state},application};
  }

  turnInQuest(
    state:M6GrowthState,
    questId:string,
    npcId:string,
  ):M6QuestTurnInResult{
    const current=this.validate(state);
    const settlement=prepareM6QuestTurnIn(this.questChain,current.questChain,questId,npcId);
    if(!settlement)return{state:current,settled:false,rewardApplied:false,promotion:null,unequipped:[],reasons:['quest-not-ready'],provenance:'RECONSTRUCTION_POLICY'};

    const questFlags=uniqueStrings([...(settlement.reward.questFlags??[]),settlement.completionFlag]);
    const reward=applyQuestReward(
      current.rewards,
      questId,
      settlement.rewardReceiptId,
      {...settlement.reward,questFlags},
    );
    validateM6InventoryCapacity(reward.state.inventory,this.inventoryPolicy);
    const committed=commitM6QuestTurnIn(this.questChain,current.questChain,settlement,reward.state.questFlags);
    if(!committed.committed)return{state:current,settled:false,rewardApplied:false,promotion:null,unequipped:[],reasons:['quest-already-complete'],provenance:'RECONSTRUCTION_POLICY'};

    let stage=current.stage;
    let promotion:M6PromotionResult|null=null;
    if(settlement.promotionRuleId){
      const rule=this.promotionRules.find(entry=>entry.id===settlement.promotionRuleId);
      if(!rule)throw new Error('M6 promotion rule disappeared after validation');
      promotion=applyM6Promotion(this.stageTrack,current.stage,rule,{
        level:reward.state.progression.level,
        questFlags:reward.state.questFlags,
        questChain:committed.state,
        inventory:reward.state.inventory,
      });
      if(!promotion.applied&&!promotion.duplicate){
        return{state:current,settled:false,rewardApplied:false,promotion,unequipped:[],reasons:promotion.reasons.map(reason=>'promotion:'+reason),provenance:'RECONSTRUCTION_POLICY'};
      }
      stage=promotion.state;
    }

    const context={characterId:String(stage.stageId),family:stage.family,stageId:stage.stageId,level:reward.state.progression.level};
    const reconciled=reconcileM6EquipmentLoadout(current.equipment,reward.state.inventory,this.equipmentRules,context);
    return{
      state:{rewards:reward.state,questChain:committed.state,stage,equipment:reconciled.loadout},
      settled:true,
      rewardApplied:reward.applied,
      promotion,
      unequipped:reconciled.unequipped,
      reasons:[],
      provenance:'RECONSTRUCTION_POLICY',
    };
  }
}
