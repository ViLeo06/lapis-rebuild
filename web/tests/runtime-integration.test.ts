import{test}from'node:test';
import assert from'node:assert/strict';
import{createTrainingInteraction,OFFLINE_TRAINING_ENCOUNTER_AUTHORITY,verifiedBattleEntry}from'../src/runtime-boundaries.ts';
import{resolveAiBinding,RETAIL_FALLBACK_AI,chooseWeightedAiAction,selectAiCandidate}from'../src/ai-runtime.ts';
import{frameIntervalMs,sequenceDurationMs}from'../src/animation-policy.ts';
import{TRAINING_DAMAGE_POLICY}from'../src/damage-policy.ts';
import{beginBattle,updateBattle}from'../src/battle.ts';

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

test('battle state carries entry, damage and AI provenance',()=>{
 const entry=verifiedBattleEntry(3);const s=beginBattle(0,0,entry);
 assert.equal(s.battleZoneId,3);assert.equal(s.battleEntryProvenance,'VERIFIED');assert.equal(s.damagePolicyProvenance,'RECONSTRUCTION_POLICY');
 assert.ok(s.enemies.every(e=>e.aiBinding.provenance==='RECONSTRUCTION_POLICY'));
 const events=updateBattle(s,1600,0,0);assert.ok(events.some(e=>e.target==='player'&&e.provenance==='RECONSTRUCTION_POLICY'));
});
