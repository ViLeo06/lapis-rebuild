import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInventory,quantityOf} from '../src/progression/inventory.ts';
import {equipItem} from '../src/progression/equipment.ts';
import {initialProgression} from '../src/progression/progression.ts';
import type {RewardState} from '../src/progression/rewards.ts';
import {
  equipM6Item,
  evaluateM6EquipmentEligibility,
  legacyTrainingEquipmentRules,
  m6EquipmentStatContribution,
} from '../src/progression/m6-equipment.ts';
import type {M6EquipmentRule} from '../src/progression/m6-equipment.ts';
import {
  grantItemWithinM6Capacity,
  validateM6InventoryCapacity,
} from '../src/progression/m6-inventory.ts';
import type {M6InventoryPolicy} from '../src/progression/m6-inventory.ts';
import {ReconstructionM6GrowthAuthority} from '../src/progression/m6-growth-authority.ts';
import {
  canonicalProgressionEvidenceFromS25,
  equipmentRuleFromS25CanonicalItem,
  stageTrackFromS25CanonicalEvidence,
} from '../src/progression/m6-canonical-evidence-adapter.ts';
import type {M6StageTrack,M6PromotionRequirement} from '../src/progression/m6-stage-promotion.ts';
import {createM6SaveExtension} from '../src/progression/m6-save-extension.ts';
import {
  migrateSaveToM6,
  serializeM6SaveV2,
  validateM6SaveForContent,
} from '../src/progression/m6-save-migration.ts';
import {deserializeSave,migrateSave} from '../src/progression/save-migration.ts';
import {SAVE_KIND} from '../src/progression/save-schema.ts';
import type {SaveV2,SaveValidationContext} from '../src/progression/save-schema.ts';
import {
  applyM6QuestObjectiveEvent,
  createM6QuestChainState,
} from '../src/world/m6-quest-chain.ts';
import type {M6QuestChainDefinition} from '../src/world/m6-quest-chain.ts';
import {evaluateM6WorldGate} from '../src/world/m6-progression-gates.ts';
import {
  m6WorldTargetAvailability,
  validateM6WorldProgressionDefinition,
} from '../src/world/m6-world-progression.ts';

const swordStages=[100,110,120,130,140,150,160,170,180,190] as const;
const wizardStages=[109,119,129,139,149,159,169,179,189,199] as const;
const swordTrack:M6StageTrack={id:'m6-swordsman-ten-stage',family:'swordsman',stageIds:swordStages,provenance:'VERIFIED-STATIC-ORIGINAL'};
const wizardTrack:M6StageTrack={id:'m6-wizard-ten-stage',family:'wizard',stageIds:wizardStages,provenance:'VERIFIED-STATIC-ORIGINAL'};
const allCharacters=[...swordStages,...wizardStages].map(String);
const saveContext:SaveValidationContext={pack:'pack',characters:allCharacters,mapBounds:{0:{width:100,height:100},1:{width:200,height:200}}};

const rewards=():RewardState=>({
  gold:0,
  inventory:createInventory(),
  progression:initialProgression(),
  questFlags:{},
  rewardReceipts:[],
});

function equipmentRule(
  itemId:number,
  family:'swordsman'|'wizard',
  stageIds:readonly number[],
):M6EquipmentRule{
  return{
    itemId,
    slot:'weapon',
    allowedFamilies:[family],
    allowedStageIds:stageIds,
    minimumLevel:2,
    statContribution:family==='swordsman'?{attack:7}:{magicAttack:7},
    provenance:{
      itemRecord:'VERIFIED-STATIC-ORIGINAL',
      slot:'RECONSTRUCTION_POLICY',
      classRestriction:'RECONSTRUCTION_POLICY',
      stageRestriction:'RECONSTRUCTION_POLICY',
      levelRestriction:'RECONSTRUCTION_POLICY',
      statContribution:'RECONSTRUCTION_POLICY',
    },
  };
}

function questChain(itemId:number):M6QuestChainDefinition{
  return{
    id:'s28-synthetic-growth',
    provenance:'RECONSTRUCTION_POLICY',
    quests:[
      {
        id:'training-clear',
        offerNpcId:'guide',
        turnInNpcId:'guide',
        prerequisites:{questIds:[],questFlags:[]},
        steps:[{id:'win-training',objective:{kind:'battle',battleZoneId:0,requiredWins:1}}],
        reward:{gold:10,exp:100,items:[{itemId,quantity:1}]},
        completionFlag:'s28.training.clear',
        provenance:'RECONSTRUCTION_POLICY',
      },
      {
        id:'promotion-proof',
        offerNpcId:'guide',
        turnInNpcId:'guide',
        prerequisites:{questIds:['training-clear'],questFlags:['s28.training.clear']},
        steps:[
          {id:'own-upgrade',objective:{kind:'item',itemId,requiredQuantity:1}},
          {id:'report-clerk',objective:{kind:'npc',npcId:'promotion-clerk'}},
        ],
        reward:{gold:5,exp:200},
        completionFlag:'s28.promotion.proof',
        promotionRuleId:'promote-first',
        provenance:'RECONSTRUCTION_POLICY',
      },
    ],
  };
}

function promotion(track:M6StageTrack,itemId:number):M6PromotionRequirement{
  return{
    id:'promote-first',
    fromStageId:track.stageIds[0],
    toStageId:track.stageIds[1],
    minimumLevel:3,
    requiredQuestIds:['promotion-proof'],
    requiredQuestFlags:['s28.promotion.proof'],
    requiredItems:[{itemId,quantity:1}],
    provenance:'RECONSTRUCTION_POLICY',
  };
}

function authorityFor(
  family:'swordsman'|'wizard',
):{authority:ReconstructionM6GrowthAuthority;track:M6StageTrack;itemId:number;chain:M6QuestChainDefinition;rule:M6EquipmentRule}{
  const track=family==='swordsman'?swordTrack:wizardTrack;
  const itemId=family==='swordsman'?3:12;
  const chain=questChain(itemId);
  const rule=equipmentRule(itemId,family,track.stageIds);
  return{
    authority:new ReconstructionM6GrowthAuthority({
      stageTrack:track,
      questChain:chain,
      equipmentRules:[rule],
      promotionRules:[promotion(track,itemId)],
    }),
    track,itemId,chain,rule,
  };
}

test('S28 consumes S25 canonical stage/item evidence without upgrading server enforcement',()=>{
  const terminalExp=[6300,44033,410090,1276765,3022566,7155515,16939705,40102443,94937067,345806600];
  const stages=swordStages.map((id,index)=>({
    id,
    progression:{expValues:[terminalExp[index]],nextClassRaw:[swordStages[index+1]??id]},
    transitionHint:{
      sourceEvidence:'VERIFIED-STATIC-ORIGINAL' as const,
      interpretationEvidence:'INFERRED' as const,
      candidateNextStageId:swordStages[index+1]??null,
    },
  }));
  const track=stageTrackFromS25CanonicalEvidence('s25-swordsman-canonical','swordsman',stages);
  assert.deepEqual(track.stageIds,swordStages);
  assert.equal(track.provenance,'VERIFIED-STATIC-ORIGINAL');
  const preserved=canonicalProgressionEvidenceFromS25('s25-swordsman-canonical','swordsman',stages);
  assert.equal(preserved.authority,'S25_SINGLE_CANONICAL_DUAL_CLASS_MATRIX');
  assert.equal(preserved.stages.at(-1)?.expValues.at(-1),345806600);
  assert.equal(preserved.stages[0].nextClassRaw.at(-1),110);
  assert.equal(preserved.retailExpFormula,'SERVER-BOUNDARY');
  assert.equal(preserved.retailPromotionTrigger,'SERVER-BOUNDARY');

  const candidate=equipmentRuleFromS25CanonicalItem({
    itemId:3,
    equipPosition:3,
    equipLevel:1,
    classFlags:[1,0,0,1,0,0,0,0,0,0],
  },{
    slotByEquipPosition:{3:'weapon'},
    slotProvenance:'RECONSTRUCTION_POLICY',
    classFlagIndexByFamily:{swordsman:0,wizard:9},
    useClassFlagHypothesis:true,
    enforceEquipLevel:true,
    authority:'RECONSTRUCTION_POLICY',
  });
  assert.deepEqual(candidate.rule.allowedFamilies,['swordsman']);
  assert.equal(candidate.rule.minimumLevel,1);
  assert.equal(candidate.rule.provenance.itemRecord,'VERIFIED-STATIC-ORIGINAL');
  assert.equal(candidate.rule.provenance.classRestriction,'INFERRED');
  assert.equal(candidate.rule.provenance.levelRestriction,'VERIFIED-STATIC-ORIGINAL');
  assert.equal(candidate.rawEvidence.equipLevel.enforcement,'SERVER-BOUNDARY');
  assert.equal(candidate.authority,'RECONSTRUCTION_POLICY');

  const preservedBoundary=equipmentRuleFromS25CanonicalItem({
    itemId:12,
    equipPosition:8,
    equipLevel:1,
    classFlags:[0,0,0,0,0,0,1,0,1,1],
  },{
    slotByEquipPosition:{8:'weapon'},
    slotProvenance:'RECONSTRUCTION_POLICY',
    classFlagIndexByFamily:{swordsman:0,wizard:9},
    useClassFlagHypothesis:false,
    enforceEquipLevel:false,
    authority:'RECONSTRUCTION_POLICY',
  });
  assert.equal(preservedBoundary.rule.minimumLevel,undefined);
  assert.equal(preservedBoundary.rule.provenance.classRestriction,'SERVER-BOUNDARY');
  assert.equal(preservedBoundary.rule.provenance.levelRestriction,'SERVER-BOUNDARY');
});

test('M6 inventory policy exposes explicit capacity without pretending it is retail data',()=>{
  const policy:M6InventoryPolicy={
    id:'test-two-items',
    maxItemTypes:2,
    maxTotalQuantity:2,
    provenance:'RECONSTRUCTION_POLICY',
    note:'synthetic capacity gate',
  };
  let inventory=createInventory([{itemId:1,source:{kind:'starter',ref:'test'}}]);
  inventory=grantItemWithinM6Capacity(inventory,3,1,{kind:'quest',ref:'q1'},policy);
  assert.deepEqual(inventory.items.map(item=>item.itemId),[1,3]);
  assert.throws(()=>grantItemWithinM6Capacity(inventory,10,1,{kind:'quest',ref:'q2'},policy),/capacity/);
  assert.equal(validateM6InventoryCapacity(inventory,policy).items.length,2);
});

test('M6 equipment rejects class stage and level violations and keeps stat policy separate',()=>{
  const rule: M6EquipmentRule={
    ...equipmentRule(3,'swordsman',[100]),
    minimumLevel:2,
  };
  const inventory=createInventory([{itemId:3,source:{kind:'starter',ref:'test'}}]);
  const levelOne={characterId:'100',family:'swordsman' as const,stageId:100,level:1};
  const legal={...levelOne,level:2};
  const later={...legal,characterId:'110',stageId:110};
  const wizard={characterId:'109',family:'wizard' as const,stageId:109,level:2};

  assert.deepEqual(evaluateM6EquipmentEligibility(rule,levelOne).reasons,['level-restricted']);
  assert.deepEqual(evaluateM6EquipmentEligibility(rule,later).reasons,['stage-restricted']);
  assert.deepEqual(evaluateM6EquipmentEligibility(rule,wizard).reasons,['class-restricted','stage-restricted']);

  const equipped=equipM6Item({weapon:null,armor:null,accessory:null},inventory,[rule],legal,'weapon',3);
  assert.equal(equipped.weapon,3);
  assert.equal(m6EquipmentStatContribution(equipped,[rule]).attack,7);
});

test('M6 quest chain supports battle item and NPC objectives while rejecting unrelated events',()=>{
  const chain=questChain(3);
  let state=createM6QuestChainState(chain,{});
  assert.equal(state.quests['training-clear'].status,'available');
  assert.equal(state.quests['promotion-proof'].status,'locked');

  state={...state,quests:{...state.quests,'training-clear':{status:'active',stepIndex:0,objectiveProgress:0}}};
  const wrong=applyM6QuestObjectiveEvent(chain,state,'training-clear',{type:'battle_won',battleZoneId:99});
  assert.equal(wrong.advanced,false);
  const won=applyM6QuestObjectiveEvent(chain,state,'training-clear',{type:'battle_won',battleZoneId:0});
  assert.equal(won.state.quests['training-clear'].status,'ready_to_turn_in');

  const synthetic={...won.state,quests:{...won.state.quests,'promotion-proof':{status:'active' as const,stepIndex:0,objectiveProgress:0}}};
  const item=applyM6QuestObjectiveEvent(chain,synthetic,'promotion-proof',{type:'inventory_changed',itemId:3,quantityOwned:1});
  assert.equal(item.state.quests['promotion-proof'].stepIndex,1);
  const npc=applyM6QuestObjectiveEvent(chain,item.state,'promotion-proof',{type:'npc_interacted',npcId:'promotion-clerk'});
  assert.equal(npc.state.quests['promotion-proof'].status,'ready_to_turn_in');
});

test('M6 multi-map progression composes S18 graph targets with quest-driven availability',()=>{
  const chain=questChain(3);
  const initial=createM6QuestChainState(chain,{});
  const graph={
    schema:1 as const,
    id:'s28-three-scene',
    provenance:'RECONSTRUCTION_POLICY' as const,
    scenes:[
      {id:'field-a',mapId:1,kind:'field' as const,displayName:'field-a',provenance:'RECONSTRUCTION_POLICY' as const,spawns:[{id:'start',cell:[1,1] as [number,number],provenance:'RECONSTRUCTION_POLICY' as const}]},
      {id:'interior',mapId:2,kind:'interior' as const,displayName:'interior',provenance:'RECONSTRUCTION_POLICY' as const,spawns:[{id:'entry',cell:[2,2] as [number,number],provenance:'RECONSTRUCTION_POLICY' as const}]},
      {id:'field-b',mapId:3,kind:'field' as const,displayName:'field-b',provenance:'RECONSTRUCTION_POLICY' as const,spawns:[{id:'arrival',cell:[3,3] as [number,number],provenance:'RECONSTRUCTION_POLICY' as const}]},
    ],
    transitions:[
      {id:'field-to-interior',fromSceneId:'field-a',toSceneId:'interior',triggerId:'door-a',arrivalSpawnId:'entry',provenance:'RECONSTRUCTION_POLICY' as const},
      {id:'interior-to-field-b',fromSceneId:'interior',toSceneId:'field-b',triggerId:'door-b',arrivalSpawnId:'arrival',provenance:'RECONSTRUCTION_POLICY' as const},
    ],
  };
  const definition=validateM6WorldProgressionDefinition({
    id:'s28-world-progression',
    graph,
    npcEntityIds:['promotion-clerk'],
    encounters:[{id:'advanced-training',sceneId:'field-b',battleZoneId:7,provenance:'RECONSTRUCTION_POLICY'}],
    gates:[
      {id:'unlock-field-b',target:'scene-transition',targetId:'interior-to-field-b',requiredQuestIds:['promotion-proof'],requiredQuestFlags:['s28.promotion.proof'],minimumLevel:3,allowedStageIds:[110],provenance:'RECONSTRUCTION_POLICY'},
      {id:'unlock-advanced-training',target:'encounter',targetId:'advanced-training',requiredQuestIds:['promotion-proof'],provenance:'RECONSTRUCTION_POLICY'},
    ],
    provenance:'RECONSTRUCTION_POLICY',
  });
  const blocked=m6WorldTargetAvailability(definition,'scene-transition','interior-to-field-b',{
    questChain:initial,questFlags:{},level:1,stageId:100,
  });
  assert.equal(blocked.available,false);
  assert.ok(blocked.reasons.includes('quest:promotion-proof'));

  const completed={
    ...initial,
    quests:{
      ...initial.quests,
      'training-clear':{status:'complete' as const,stepIndex:0,objectiveProgress:1},
      'promotion-proof':{status:'complete' as const,stepIndex:1,objectiveProgress:1},
    },
  };
  const open=m6WorldTargetAvailability(definition,'scene-transition','interior-to-field-b',{
    questChain:completed,questFlags:{'s28.promotion.proof':true},level:3,stageId:110,
  });
  assert.equal(open.available,true);
  assert.deepEqual(open.gateIds,['unlock-field-b']);
  assert.equal(m6WorldTargetAvailability(definition,'npc-interaction','promotion-clerk',{
    questChain:completed,questFlags:{'s28.promotion.proof':true},level:3,stageId:110,
  }).available,true,'ungated registered NPC remains available');
  assert.throws(()=>validateM6WorldProgressionDefinition({...definition,gates:[...definition.gates,{id:'bad',target:'encounter' as const,targetId:'missing',provenance:'RECONSTRUCTION_POLICY' as const}]}),/unknown encounter/);
});

test('same S28 growth authority drives swordsman and wizard representative promotion chains',()=>{
  for(const family of ['swordsman','wizard'] as const){
    const {authority,track,itemId}=authorityFor(family);
    let state=authority.initial(rewards());

    const q1=authority.acceptQuest(state,'training-clear','guide');
    assert.equal(q1.accepted,true);state=q1.state;
    state=authority.recordObjective(state,'training-clear',{type:'battle_won',battleZoneId:0}).state;
    const q1TurnIn=authority.turnInQuest(state,'training-clear','guide');
    assert.equal(q1TurnIn.settled,true);state=q1TurnIn.state;
    assert.equal(state.rewards.progression.level,2);
    assert.equal(quantityOf(state.rewards.inventory,itemId),1);
    assert.equal(state.questChain.quests['promotion-proof'].status,'available');

    state=authority.equip(state,'weapon',itemId);
    assert.equal(state.equipment.weapon,itemId);

    const q2=authority.acceptQuest(state,'promotion-proof','guide');
    assert.equal(q2.accepted,true);state=q2.state;
    state=authority.recordObjective(state,'promotion-proof',{type:'inventory_changed',itemId,quantityOwned:quantityOf(state.rewards.inventory,itemId)}).state;
    assert.equal(state.questChain.quests['promotion-proof'].stepIndex,1);
    state=authority.recordObjective(state,'promotion-proof',{type:'npc_interacted',npcId:'promotion-clerk'}).state;
    assert.equal(state.questChain.quests['promotion-proof'].status,'ready_to_turn_in');

    const q2TurnIn=authority.turnInQuest(state,'promotion-proof','guide');
    assert.equal(q2TurnIn.settled,true);assert.equal(q2TurnIn.promotion?.applied,true);state=q2TurnIn.state;
    assert.equal(state.rewards.progression.level,3);
    assert.equal(state.stage.stageId,track.stageIds[1]);
    assert.equal(state.stage.promotionReceipts.length,1);
    assert.equal(state.equipment.weapon,itemId);

    const gate=evaluateM6WorldGate({
      id:'next-field',
      target:'scene-transition',
      targetId:'field-to-next',
      requiredQuestIds:['promotion-proof'],
      requiredQuestFlags:['s28.promotion.proof'],
      minimumLevel:3,
      allowedStageIds:[track.stageIds[1]],
      provenance:'RECONSTRUCTION_POLICY',
    },{
      questChain:state.questChain,
      questFlags:state.rewards.questFlags,
      level:state.rewards.progression.level,
      stageId:state.stage.stageId,
    });
    assert.equal(gate.available,true);

    const blocked=evaluateM6WorldGate({
      id:'old-stage-only',
      target:'encounter',
      targetId:'old-encounter',
      allowedStageIds:[track.stageIds[0]],
      provenance:'RECONSTRUCTION_POLICY',
    },{
      questChain:state.questChain,
      questFlags:state.rewards.questFlags,
      level:state.rewards.progression.level,
      stageId:state.stage.stageId,
    });
    assert.equal(blocked.available,false);

    const save:SaveV2={
      kind:SAVE_KIND,
      version:2,
      pack:'pack',
      character:String(state.stage.stageId),
      mapId:1,
      x:10,
      y:10,
      gold:state.rewards.gold,
      inventory:state.rewards.inventory,
      quest:{legacy:'preserved'},
      questFlags:state.rewards.questFlags,
      progression:state.rewards.progression,
      rewardReceipts:state.rewards.rewardReceipts,
      m6:createM6SaveExtension(String(state.stage.stageId),state),
      savedAt:'2026-09-20T00:00:00Z',
    };
    const content={stageTracks:[swordTrack,wizardTrack],questChain:questChain(itemId),equipmentRules:[equipmentRule(itemId,family,track.stageIds)]};
    const serialized=serializeM6SaveV2(save as SaveV2&{m6:NonNullable<SaveV2['m6']>},saveContext,content);
    const loaded=deserializeSave(serialized,saveContext);
    const validated=validateM6SaveForContent(loaded,saveContext,content);
    assert.equal(validated.m6.stage.stageId,track.stageIds[1]);
    assert.equal(validated.m6.equipment.weapon,itemId);
    assert.equal(validated.m6.questChain.quests['promotion-proof'].status,'complete');
    assert.equal(validated.progression.level,3);
  }
});

test('M5.1 SaveV2 and S7 v1 migrate into M6 without losing old fields',()=>{
  const baseInventory=equipItem(createInventory([{itemId:1,source:{kind:'starter',ref:'old'}}]),'100','weapon',1);
  const oldV2:SaveV2={
    kind:SAVE_KIND,
    version:2,
    pack:'pack',
    character:'100',
    mapId:1,
    x:12,
    y:13,
    gold:17,
    inventory:baseInventory,
    quest:{questId:'s9-training-run',stage:'complete'},
    questFlags:{'m5.training.complete':true},
    progression:initialProgression(),
    rewardReceipts:['quest:s9-training-run:turn-in'],
    savedAt:'2026-09-19T00:00:00Z',
  };
  const content={stageTracks:[swordTrack,wizardTrack],questChain:questChain(3),equipmentRules:legacyTrainingEquipmentRules()};
  const migrated=migrateSaveToM6(oldV2,saveContext,content);
  assert.equal(migrated.gold,17);
  assert.deepEqual(migrated.quest,oldV2.quest);
  assert.equal(migrated.m6.family,'swordsman');
  assert.equal(migrated.m6.stage.stageId,100);
  assert.equal(migrated.m6.equipment.weapon,1);

  const legacyV1={version:1,pack:'pack',character:'100',mapId:1,x:5,y:6,gold:9,inventory:{owned:[1,25],weapon:1,armor:25},quest:{guide:'complete'},savedAt:'2026-09-15T00:00:00Z'};
  const migratedV1=migrateSaveToM6(legacyV1,saveContext,content);
  assert.equal(migratedV1.version,2);
  assert.equal(migratedV1.m6.stage.stageId,100);
  assert.equal(migratedV1.inventory.equipped.armor,25);
});

test('M6 save extension fails closed on unknown fields and future extension schema',()=>{
  const content={stageTracks:[swordTrack,wizardTrack],questChain:questChain(3),equipmentRules:legacyTrainingEquipmentRules()};
  const old:SaveV2={
    kind:SAVE_KIND,version:2,pack:'pack',character:'100',mapId:1,x:1,y:1,gold:0,
    inventory:createInventory(),quest:{guide:'not_started'},questFlags:{},progression:initialProgression(),rewardReceipts:[],savedAt:'2026-09-19T00:00:00Z',
  };
  const migrated=migrateSaveToM6(old,saveContext,content);
  assert.throws(()=>migrateSave({...migrated,m6:{...migrated.m6,unexpected:true}},saveContext),/Unknown M6 save extension field/);
  assert.throws(()=>migrateSave({...migrated,m6:{...migrated.m6,schema:2}},saveContext),/Unsupported M6 save extension/);
  assert.throws(()=>migrateSave({...migrated,m6:{...migrated.m6,stage:{...migrated.m6.stage,stageId:110}}},saveContext),/stage does not match character/);
});
