import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  applyNpcDialogueChoice,
  beginNpcDialogue,
  type NpcDialogueIntent,
} from '../src/world/npc-dialogue-runtime.ts';
import {ReconstructionWorldAuthority} from '../src/world/world-authority.ts';
import {TRAINING_BATTLE_ZONE_ID,TRAINING_GUIDE,TRAINING_QUEST_ID,START_STATE} from '../src/world/world-content.ts';
import type {QuestRuntimeState} from '../src/world/quest-runtime.ts';
import {parseM4Quest} from '../src/m4-runtime-integration.ts';

const intent=(
  entityId:string,
  mapId:number,
  actorX:number,
  actorY:number,
  inputSource:'pointer'|'keyboard'='pointer',
):NpcDialogueIntent=>({
  entityId,mapId,actorX,actorY,inputSource,provenance:'RECONSTRUCTION_POLICY',
});

test('S23 pointer and keyboard open the same guide offer without auto-advancing quest',()=>{
  const authority=new ReconstructionWorldAuthority();
  const state=authority.initial(START_STATE);
  const pointer=authority.beginNpcInteraction(state,intent(TRAINING_GUIDE.entity.id,state.world.mapId,state.world.x,state.world.y,'pointer'));
  const keyboard=authority.beginNpcInteraction(state,intent(TRAINING_GUIDE.entity.id,state.world.mapId,state.world.x,state.world.y,'keyboard'));

  assert.equal(pointer.state.quest.stage,'not_started');
  assert.equal(keyboard.state.quest.stage,'not_started');
  assert.equal(pointer.dialogue.accepted,true);
  assert.equal(keyboard.dialogue.accepted,true);
  if(!pointer.dialogue.accepted||!keyboard.dialogue.accepted)return;

  assert.equal(pointer.dialogue.session.sessionId,keyboard.dialogue.session.sessionId);
  assert.equal(pointer.dialogue.session.view.phase,'offer');
  assert.deepEqual(
    pointer.dialogue.session.view.choices.map(entry=>entry.id),
    ['accept-quest','decline-quest'],
  );
  assert.deepEqual(
    pointer.dialogue.session.view.choices.map(entry=>entry.id),
    keyboard.dialogue.session.view.choices.map(entry=>entry.id),
  );
  assert.equal(pointer.dialogue.session.inputSource,'pointer');
  assert.equal(keyboard.dialogue.session.inputSource,'keyboard');
});

test('S23 rejects unknown target, wrong map, stale actor coordinates and out-of-range guide activation',()=>{
  const authority=new ReconstructionWorldAuthority();
  const state=authority.initial(START_STATE);

  const unknown=authority.beginNpcInteraction(state,intent('not-the-guide',state.world.mapId,state.world.x,state.world.y));
  assert.equal(unknown.dialogue.accepted,false);
  if(!unknown.dialogue.accepted)assert.equal(unknown.dialogue.reason,'entity-mismatch');

  const wrongMap=authority.beginNpcInteraction(state,intent(TRAINING_GUIDE.entity.id,999,state.world.x,state.world.y));
  assert.equal(wrongMap.dialogue.accepted,false);
  if(!wrongMap.dialogue.accepted)assert.equal(wrongMap.dialogue.reason,'map-mismatch');

  const staleActor=authority.beginNpcInteraction(state,intent(TRAINING_GUIDE.entity.id,state.world.mapId,state.world.x+1,state.world.y));
  assert.equal(staleActor.dialogue.accepted,false);
  if(!staleActor.dialogue.accepted)assert.equal(staleActor.dialogue.reason,'actor-state-mismatch');

  const farWorld={...state.world,x:state.world.x+20,y:state.world.y+20};
  const farState={...state,world:farWorld};
  const far=authority.beginNpcInteraction(farState,intent(TRAINING_GUIDE.entity.id,farWorld.mapId,farWorld.x,farWorld.y));
  assert.equal(far.dialogue.accepted,false);
  if(!far.dialogue.accepted)assert.equal(far.dialogue.reason,'out-of-range');
});

test('S23 exposes stage-specific dialogue actions and prevents stale or duplicate quest choices',()=>{
  const stages:readonly QuestRuntimeState[]=[
    {questId:TRAINING_QUEST_ID,stage:'not_started'},
    {questId:TRAINING_QUEST_ID,stage:'accepted'},
    {questId:TRAINING_QUEST_ID,stage:'objective'},
    {questId:TRAINING_QUEST_ID,stage:'ready_to_turn_in'},
    {questId:TRAINING_QUEST_ID,stage:'complete'},
  ];
  const expected={
    not_started:['accept-quest','decline-quest'],
    accepted:['close'],
    objective:['close'],
    ready_to_turn_in:['turn-in-quest','close'],
    complete:['close'],
  } as const;

  for(const quest of stages){
    const begun=beginNpcDialogue(
      TRAINING_GUIDE,
      quest,
      START_STATE,
      intent(TRAINING_GUIDE.entity.id,START_STATE.mapId,START_STATE.x,START_STATE.y),
    );
    assert.equal(begun.accepted,true);
    if(!begun.accepted)continue;
    assert.deepEqual(begun.session.view.choices.map(entry=>entry.id),expected[quest.stage]);
  }

  const initial:QuestRuntimeState={questId:TRAINING_QUEST_ID,stage:'not_started'};
  const begun=beginNpcDialogue(
    TRAINING_GUIDE,
    initial,
    START_STATE,
    intent(TRAINING_GUIDE.entity.id,START_STATE.mapId,START_STATE.x,START_STATE.y),
  );
  assert.equal(begun.accepted,true);
  if(!begun.accepted)return;

  const accepted=applyNpcDialogueChoice(begun.session,initial,'accept-quest',TRAINING_BATTLE_ZONE_ID);
  assert.equal(accepted.accepted,true);
  assert.equal(accepted.quest.stage,'accepted');
  assert.equal(accepted.questAdvanced,true);

  const repeated=applyNpcDialogueChoice(begun.session,accepted.quest,'accept-quest',TRAINING_BATTLE_ZONE_ID);
  assert.equal(repeated.accepted,false);
  assert.equal(repeated.quest.stage,'accepted');
  if(!repeated.accepted)assert.equal(repeated.reason,'stale-dialogue');
});

test('S23 defeat does not complete quest; win enables explicit turn-in exactly once',()=>{
  const authority=new ReconstructionWorldAuthority();
  let state=authority.initial(START_STATE);

  const begun=authority.beginNpcInteraction(state,intent(TRAINING_GUIDE.entity.id,state.world.mapId,state.world.x,state.world.y,'keyboard'));
  assert.equal(begun.dialogue.accepted,true);
  if(!begun.dialogue.accepted)return;
  const accepted=authority.chooseNpcInteraction(state,begun.dialogue.session,'accept-quest');
  assert.equal(accepted.outcome.accepted,true);
  state=accepted.state;
  assert.equal(state.quest.stage,'accepted');

  state=authority.arriveObjectiveMap(state,authority.content.objectiveMapId);
  assert.equal(state.quest.stage,'objective');

  const defeated=authority.resolveBattle(state,{battleZoneId:authority.content.battleZoneId,outcome:'lost'});
  assert.equal(defeated.questAdvanced,false);
  assert.equal(defeated.state.quest.stage,'objective');

  const won=authority.resolveBattle(state,{battleZoneId:authority.content.battleZoneId,outcome:'won'});
  assert.equal(won.questAdvanced,true);
  state=won.state;
  assert.equal(state.quest.stage,'ready_to_turn_in');

  const turnIn=authority.beginNpcInteraction(state,intent(TRAINING_GUIDE.entity.id,state.world.mapId,state.world.x,state.world.y,'pointer'));
  assert.equal(turnIn.dialogue.accepted,true);
  if(!turnIn.dialogue.accepted)return;
  assert.deepEqual(turnIn.dialogue.session.view.choices.map(entry=>entry.id),['turn-in-quest','close']);

  const completed=authority.chooseNpcInteraction(state,turnIn.dialogue.session,'turn-in-quest');
  assert.equal(completed.outcome.accepted,true);
  state=completed.state;
  assert.equal(state.quest.stage,'complete');

  const afterComplete=authority.beginNpcInteraction(state,intent(TRAINING_GUIDE.entity.id,state.world.mapId,state.world.x,state.world.y,'pointer'));
  assert.equal(afterComplete.dialogue.accepted,true);
  if(!afterComplete.dialogue.accepted)return;
  assert.deepEqual(afterComplete.dialogue.session.view.choices.map(entry=>entry.id),['close']);
  const duplicate=authority.chooseNpcInteraction(state,afterComplete.dialogue.session,'turn-in-quest');
  assert.equal(duplicate.outcome.accepted,false);
  assert.equal(duplicate.state.quest.stage,'complete');
});

test('S23 SaveV2-restored ready-to-turn-in state resumes through the same dialogue contract',()=>{
  const authority=new ReconstructionWorldAuthority();
  const restored=parseM4Quest(
    {questId:TRAINING_QUEST_ID,stage:'ready_to_turn_in'},
    TRAINING_QUEST_ID,
  );
  let state={world:{...START_STATE},quest:restored};

  const begun=authority.beginNpcInteraction(state,intent(TRAINING_GUIDE.entity.id,state.world.mapId,state.world.x,state.world.y,'keyboard'));
  assert.equal(begun.dialogue.accepted,true);
  if(!begun.dialogue.accepted)return;
  assert.equal(begun.dialogue.session.view.phase,'turn-in');

  const completed=authority.chooseNpcInteraction(state,begun.dialogue.session,'turn-in-quest');
  assert.equal(completed.outcome.accepted,true);
  state=completed.state;
  assert.equal(state.quest.stage,'complete');
});
