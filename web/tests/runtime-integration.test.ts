import{test}from'node:test';
import assert from'node:assert/strict';
import{createTrainingInteraction,OFFLINE_TRAINING_ENCOUNTER_AUTHORITY,verifiedBattleEntry,worldEntityInteractionIntent,sceneObjectInteractionIntent}from'../src/runtime-boundaries.ts';
import{resolveAiBinding,RETAIL_FALLBACK_AI,chooseWeightedAiAction,selectAiCandidate}from'../src/ai-runtime.ts';
import{frameIntervalMs,sequenceDurationMs}from'../src/animation-policy.ts';
import{TRAINING_DAMAGE_POLICY}from'../src/damage-policy.ts';
import{serverQuestPresentation,serverNpcSelection,reconstructionQuestPresentation,warpRequest,recruitmentRequest}from'../src/quest-runtime-boundary.ts';
import{beginBattle,updateBattle}from'../src/battle.ts';
import type{BattleEvent}from'../src/battle.ts';

test('recovered world and scene interaction gates keep native ids separate',()=>{
 const special=worldEntityInteractionIntent({entityType:101,manhattanDistance:3,nearTargetWord:17,fallbackWord:99,fieldMapId:1});
 assert.equal(special?.nativeAction,'49/21');assert.equal(special?.sourceRuntimeId,17);assert.equal(special?.provenance,'VERIFIED');
 assert.equal(worldEntityInteractionIntent({entityType:103,manhattanDistance:4,nearTargetWord:17,fallbackWord:99}),null);
 const fallback=worldEntityInteractionIntent({entityType:50,manhattanDistance:99,nearTargetWord:17,fallbackWord:99});
 assert.equal(fallback?.nativeAction,'08');assert.equal(fallback?.sourceRuntimeId,99);
 const scene=sceneObjectInteractionIntent({manhattanDistance:8,runtimeSceneId:333});assert.equal(scene?.nativeAction,'49/04');assert.equal(scene?.sourceRuntimeId,333);
 assert.equal(sceneObjectInteractionIntent({manhattanDistance:9,runtimeSceneId:333}),null);
});

test('encounter authority requires an explicit battle zone and does not derive it from field map',()=>{
 const a=createTrainingInteraction(1),b=createTrainingInteraction(999);
 const ea=OFFLINE_TRAINING_ENCOUNTER_AUTHORITY.resolve(a,{trainingBattleZoneId:0});
 const eb=OFFLINE_TRAINING_ENCOUNTER_AUTHORITY.resolve(b,{trainingBattleZoneId:0});
 assert.equal(ea?.battleZoneId,0);assert.equal(eb?.battleZoneId,0);assert.equal(ea?.provenance,'RECONSTRUCTION_POLICY');
 assert.throws(()=>OFFLINE_TRAINING_ENCOUNTER_AUTHORITY.resolve(a,{trainingBattleZoneId:-1}));
});

test('verified battle entry preserves explicit server/session input',()=>{
 const e=verifiedBattleEntry(7,{raw:[1,2,3,4]});assert.equal(e.battleZoneId,7);assert.equal(e.provenance,'VERIFIED');assert.equal(e.authority,'server-session');
 assert.throws(()=>verifiedBattleEntry(-1));
});

test('AI binding precedence matches recovered network roster fallback split',()=>{
 const network=resolveAiBinding(5,7,'ODNORMAL ATTACK(100)',[{id:5,program:'ODATTACK MAGIC(100)',provenance:'VERIFIED'}],'VERIFIED');
 assert.equal(network.source,'network');assert.match(network.program??'',/MAGIC/);
 const roster=resolveAiBinding(5,7,'ODNORMAL ATTACK(100)',[],'VERIFIED');assert.equal(roster.source,'roster');
 const fallback=resolveAiBinding(5,8,'',[],'VERIFIED');assert.equal(fallback.source,'fallback');assert.equal(fallback.program,RETAIL_FALLBACK_AI);
 const alternate=resolveAiBinding(5,2,'',[],'VERIFIED');assert.equal(alternate.source,'alternate');assert.equal(alternate.program,null);
});

test('AI recovered chooser boundaries stay explicit',()=>{
 const rows=[{action:'REST' as const,weight:20},{action:'ATTACK' as const,weight:80}];
 assert.equal(chooseWeightedAiAction(rows,20),'REST');assert.equal(chooseWeightedAiAction(rows,21),'ATTACK');
 assert.equal(selectAiCandidate(['a','b','c'],4),'b');assert.equal(selectAiCandidate([],4),null);
});

test('ANI common timing consumes authored raw rate without destroying it',()=>{
 assert.equal(frameIntervalMs(5),200);assert.equal(frameIntervalMs(5,'RETAIL_MINUS_ONE'),250);assert.equal(sequenceDurationMs(10,4),400);
 assert.throws(()=>frameIntervalMs(0));assert.throws(()=>frameIntervalMs(1,'RETAIL_MINUS_ONE'));
});

test('training damage is centralized and explicitly reconstruction policy',()=>{
 assert.equal(TRAINING_DAMAGE_POLICY.provenance,'RECONSTRUCTION_POLICY');assert.equal(TRAINING_DAMAGE_POLICY.playerDamage(undefined,2),20);assert.equal(TRAINING_DAMAGE_POLICY.enemyDamage(0,false,false),7);
});

test('Quest and NPC presentation remain separate server-selected namespaces',()=>{
 const q=serverQuestPresentation(3,7);const n=serverNpcSelection(3,7,9);
 assert.equal(q.questIndex,3);assert.equal(q.stepIndex,7);assert.equal(q.authority,'server-session');
 assert.equal(n.blockId,3);assert.equal(n.valueA,7);assert.equal(n.authority,'server-session');
 assert.notDeepEqual(q,n);
 const offline=reconstructionQuestPresentation(3,7);assert.equal(offline.provenance,'RECONSTRUCTION_POLICY');assert.equal(offline.authority,'offline-reconstruction');
 assert.equal(warpRequest(12).provenance,'VERIFIED');assert.equal(recruitmentRequest('UNKNOWN_4D').operation,'UNKNOWN_4D');
 assert.throws(()=>serverNpcSelection(256));
});

test('battle state carries entry, damage and AI provenance',()=>{
 const entry=verifiedBattleEntry(3);const s=beginBattle(0,0,entry);
 assert.equal(s.battleZoneId,3);assert.equal(s.battleEntryProvenance,'VERIFIED');assert.equal(s.damagePolicyProvenance,'RECONSTRUCTION_POLICY');
 assert.ok(s.enemies.every(e=>e.aiBinding.provenance==='RECONSTRUCTION_POLICY'));
 const events:BattleEvent[]=[];for(let i=0;i<16;i++)events.push(...updateBattle(s,100,0,0));
 assert.ok(events.some(e=>e.target==='player'&&e.provenance==='RECONSTRUCTION_POLICY'));
});
