import test from 'node:test';
import assert from 'node:assert/strict';
import {
  M7_SWORDSMAN_SKILL_BALANCE_POLICY,
  M7_SWORDSMAN_SKILL_CATALOG,
  M7_SWORDSMAN_SKILL_KEYS,
  RECONSTRUCTION_SWORDSMAN_FLAT_STAT_POLICY,
  RECONSTRUCTION_SWORDSMAN_SACRIFICE_POLICY,
  availableM7SwordsmanSkillKeys,
  createDeveloperM7SwordsmanSkillProgression,
  createM7SwordsmanSkillProgression,
  investM7SwordsmanSkillPoint,
  m7SwordsmanSkill,
  m7SwordsmanSkillLevel,
  m7SwordsmanSkillLevelStateCount,
  swordsmanM7StageForLevel,
  validateM7SwordsmanSkillProgression,
} from '../src/classes/swordsman-seven-stage-skills.ts';
import {
  advanceM7SwordsmanCombatState,
  applyM7SwordsmanSelfSkill,
  applyM7SwordsmanSelfSkillWithEvents,
  applyM7SwordsmanTargetStatus,
  consumeM7SwordsmanSkillResources,
  m7SwordsmanDamageEvents,
  m7SwordsmanEffectiveStats,
  planM7SwordsmanSkillUse,
  validateM7SwordsmanCombatState,
} from '../src/classes/swordsman-seven-stage-runtime.ts';
import {
  createS31SwordsmanSkillSavePayload,
  deserializeS31SwordsmanSkillSavePayload,
  serializeS31SwordsmanSkillSavePayload,
  validateS31SwordsmanSkillSavePayload,
} from '../src/classes/swordsman-seven-stage-save.ts';
import {
  consumeM7BlockedAction,
  m7EffectiveDefense,
  m7IsStunned,
  validateM7StatusEffect,
} from '../src/combat/m7-status-effects.ts';

function combat(overrides:Partial<{
  baseMaxHp:number;basePhysicalAttack:number;baseCommandRange:number;
  currentHp:number;currentMp:number;readiness:number;statuses:readonly ReturnType<typeof validateM7StatusEffect>[];
}>={} ){
  return validateM7SwordsmanCombatState({
    baseMaxHp:100,basePhysicalAttack:100,baseCommandRange:4,
    currentHp:100,currentMp:300,readiness:20,statuses:[],...overrides,
  });
}

test('M7.1 swordsman stage resolver remains 1-5 / 6-15 / 16-25 / 26-35 / 36-45 / 46-55 / 56-65',()=>{
  const samples:[number,number][]=[
    [1,100],[5,100],[6,110],[15,110],[16,120],[25,120],[26,130],[35,130],
    [36,140],[45,140],[46,150],[55,150],[56,160],[65,160],
  ];
  for(const [level,stageId] of samples)assert.equal(swordsmanM7StageForLevel(level).stageId,stageId);
  assert.throws(()=>swordsmanM7StageForLevel(0));
  assert.throws(()=>swordsmanM7StageForLevel(66));
});

test('catalog exposes seven skills and all 42 level states with explicit provenance',()=>{
  assert.equal(Object.keys(M7_SWORDSMAN_SKILL_CATALOG).length,7);
  assert.equal(m7SwordsmanSkillLevelStateCount(),42);
  for(const key of M7_SWORDSMAN_SKILL_KEYS){
    const skill=m7SwordsmanSkill(key);
    assert.equal(skill.levels.length,6);
    assert.deepEqual(skill.levels.map(row=>row.skillLevel),[1,2,3,4,5,6]);
    for(const row of skill.levels){
      assert.equal(row.provenance,'RECONSTRUCTION_POLICY');
      assert.ok(row.readinessCost>0);
      assert.ok(row.mpCost>=0);
    }
  }
});

test('unlock gates and skill point progression retain M7 behavior',()=>{
  const gates:[number,number][]=[[1,1],[5,1],[6,2],[15,2],[16,3],[25,3],[26,4],[35,4],[36,5],[45,5],[46,6],[55,6],[56,7],[65,7]];
  for(const [level,count] of gates)assert.equal(availableM7SwordsmanSkillKeys(level).length,count);
  const lv6=createM7SwordsmanSkillProgression(6);
  const invested=investM7SwordsmanSkillPoint(lv6,6,'1201');
  assert.equal(invested.skillLevels['1201'],2);
  assert.equal(invested.unspentSkillPoints,lv6.unspentSkillPoints-1);
  assert.throws(()=>investM7SwordsmanSkillPoint(lv6,6,'1301'));
  const debug=createDeveloperM7SwordsmanSkillProgression();
  assert.ok(M7_SWORDSMAN_SKILL_KEYS.every(key=>debug.skillLevels[key]===6));
  assert.equal(M7_SWORDSMAN_SKILL_BALANCE_POLICY.skillPointPolicy.maxSkillLevel,6);
});

test('Heavy Strike and Double Slash consume the approved M7.1 MP growth curves',()=>{
  assert.deepEqual(m7SwordsmanSkill('1101').levels.map(row=>row.mpCost),[25,32,38,44,50,60]);
  assert.deepEqual(m7SwordsmanSkill('1201').levels.map(row=>row.mpCost),[23,29,35,40,46,55]);
  assert.equal(m7SwordsmanSkillLevel('1101',1).mpCostEvidence,'VERIFIED-STATIC-ORIGINAL');
  assert.equal(m7SwordsmanSkillLevel('1101',6).mpCostEvidence,'RECOVERED_SECONDARY');
});

test('Heavy Strike is high damage + stun while Stun Strike is lower damage + higher control with boss resistance',()=>{
  const heavy=planM7SwordsmanSkillUse('1101',6);
  const control=planM7SwordsmanSkillUse('stun-strike',6);
  const boss=planM7SwordsmanSkillUse('stun-strike',6,'boss');
  assert.equal(heavy.hitMultipliers.length,1);
  assert.ok(heavy.hitMultipliers[0]!>control.hitMultipliers[0]!);
  assert.ok(control.targetStatus!.chance>heavy.targetStatus!.chance);
  assert.ok(boss.targetStatus!.chance<control.targetStatus!.chance);
  const applied=applyM7SwordsmanTargetStatus([],control,0.1,'monster-1');
  assert.equal(applied.applied,true);
  assert.equal(applied.events[0]?.type,'STUN_APPLIED');
  assert.equal(applied.events[0]?.target,'monster-1');
  assert.equal(m7IsStunned(applied.statuses),true);
  const consumed=consumeM7BlockedAction(applied.statuses);
  assert.equal(consumed.blocked,true);
  assert.equal(m7IsStunned(consumed.statuses),false);
});

test('Double Slash defines two independent hits and exposes one DAMAGE event per resolved hit',()=>{
  for(const level of [1,2,3,4,5,6] as const){
    const plan=planM7SwordsmanSkillUse('1201',level);
    assert.equal(plan.hitMultipliers.length,2);
    assert.equal(plan.independentHitRolls,true);
    const events=m7SwordsmanDamageEvents(plan,'monster-1',[31,27]);
    assert.deepEqual(events.map(row=>row.type),['DAMAGE','DAMAGE']);
    assert.deepEqual(events.map(row=>row.amount),[31,27]);
    assert.ok(events.every(row=>row.target==='monster-1'));
  }
});

test('Strong Defence is a flat DEF buff at all six levels and no longer encodes percentage mitigation',()=>{
  assert.deepEqual(m7SwordsmanSkill('1301').levels.map(row=>row.defenseFlatBonus),[20,25,30,35,40,50]);
  for(const level of [1,2,3,4,5,6] as const){
    const result=applyM7SwordsmanSelfSkillWithEvents(combat(),'1301',level);
    assert.equal(result.events[0]?.type,'DEF_BUFF');
    const expected=100+m7SwordsmanSkillLevel('1301',level).defenseFlatBonus!;
    assert.equal(m7SwordsmanEffectiveStats(result.state,100).defense,expected);
    assert.equal(result.state.statuses[0]?.modifiers.physicalDamageReduction,undefined);
  }
  assert.deepEqual(RECONSTRUCTION_SWORDSMAN_FLAT_STAT_POLICY.strongDefenseFlatBySkillLevel,[20,25,30,35,40,50]);
});

test('Burst applies flat ATK + MaxHP - DEF and expiration clamps HP to the restored base max',()=>{
  const lv1=applyM7SwordsmanSelfSkillWithEvents(combat({currentHp:80}),'1401',1);
  assert.equal(lv1.events[0]?.type,'BURST_BUFF');
  assert.deepEqual(m7SwordsmanEffectiveStats(lv1.state,50),{
    maxHp:110,physicalAttack:110,defense:45,commandRange:4,readinessEfficiencyMultiplier:1,
  });
  assert.equal(lv1.state.currentHp,90,'current HP gains the same temporary MaxHP delta on cast');
  const expired=advanceM7SwordsmanCombatState(lv1.state,25000);
  assert.equal(expired.state.statuses.length,0);
  assert.equal(expired.state.currentHp,90);
  assert.equal(m7SwordsmanEffectiveStats(expired.state,50).maxHp,100);
  assert.equal(expired.events.at(-1)?.type,'STATUS_ENDED');

  const capped=applyM7SwordsmanSelfSkill(combat({currentHp:100}),'1401',6);
  assert.equal(capped.currentHp,135);
  const ended=advanceM7SwordsmanCombatState(capped,35000);
  assert.equal(ended.state.currentHp,100,'temporary HP above base max is removed when Burst ends');
  assert.equal(m7SwordsmanEffectiveStats(ended.state,50).defense,50);
});

test('Sacrifice remains 60s periodic non-lethal HP cost and the approved 15/18/22/26/30/35 flat ATK curve',()=>{
  assert.deepEqual(RECONSTRUCTION_SWORDSMAN_SACRIFICE_POLICY.hpCostBySkillLevel,[4,4,5,5,6,6]);
  assert.deepEqual(RECONSTRUCTION_SWORDSMAN_SACRIFICE_POLICY.attackFlatBySkillLevel,[15,18,22,26,30,35]);
  const applied=applyM7SwordsmanSelfSkillWithEvents(combat(),'1501',1);
  assert.equal(applied.events[0]?.type,'SACRIFICE_BUFF');
  assert.equal(m7SwordsmanEffectiveStats(applied.state).physicalAttack,115);
  let state=applied.state;
  let tickEvents=0;
  for(let i=0;i<6;i+=1){
    const advanced=advanceM7SwordsmanCombatState(state,10000);
    tickEvents+=advanced.events.filter(event=>event.type==='SACRIFICE_TICK').length;
    state=advanced.state;
  }
  assert.equal(tickEvents,6);
  assert.equal(state.currentHp,76);
  assert.equal(state.statuses.length,0);
  assert.equal(m7SwordsmanEffectiveStats(state).physicalAttack,100);

  const nearDeath=applyM7SwordsmanSelfSkill(combat({currentHp:3}),'1501',6);
  const floor=advanceM7SwordsmanCombatState(nearDeath,10000).state;
  assert.equal(floor.currentHp,1);
});

test('Battle Command has concrete command-range and readiness effects plus feedback',()=>{
  const result=applyM7SwordsmanSelfSkillWithEvents(combat(),'battle-command',6);
  const stats=m7SwordsmanEffectiveStats(result.state);
  assert.equal(stats.commandRange,7);
  assert.equal(stats.readinessEfficiencyMultiplier,1.1);
  assert.equal(result.events[0]?.type,'COMMAND_BUFF');
  assert.equal(result.events[0]?.durationMs,30000);
});

test('resource adapter consumes per-level MP and readiness',()=>{
  const heavy6=planM7SwordsmanSkillUse('1101',6);
  const next=consumeM7SwordsmanSkillResources(combat(),heavy6);
  assert.equal(next.currentMp,240);
  assert.equal(next.readiness,14);
  assert.throws(()=>consumeM7SwordsmanSkillResources(combat({currentMp:0}),heavy6));
});

test('flat status composition preserves legacy underlying stat structure',()=>{
  const strong=applyM7SwordsmanSelfSkill(combat(),'1301',6);
  const burst=applyM7SwordsmanSelfSkill({...strong,currentMp:300,readiness:20},'1401',6);
  assert.equal(m7EffectiveDefense(100,burst.statuses),133,'100 + 50 strong defence - 17 burst penalty');
  assert.equal(m7SwordsmanEffectiveStats(burst,100).physicalAttack,135);
  assert.equal(m7SwordsmanEffectiveStats(burst,100).maxHp,135);
});

test('skill save round-trip excludes transient Burst combat modifiers and cannot permanently inflate stats',()=>{
  let skills=createM7SwordsmanSkillProgression(56);
  for(let i=1;i<6;i+=1)skills=investM7SwordsmanSkillPoint(skills,56,'1401');
  const payload=createS31SwordsmanSkillSavePayload(56,skills);
  const restored=deserializeS31SwordsmanSkillSavePayload(serializeS31SwordsmanSkillSavePayload(payload));
  assert.deepEqual(restored,payload);
  assert.equal(JSON.stringify(restored).includes('s36-burst'),false);
  assert.equal(JSON.stringify(restored).includes('maxHpFlat'),false);
  assert.throws(()=>validateS31SwordsmanSkillSavePayload({...payload,combatStatuses:[]}));
  const illegal={...createM7SwordsmanSkillProgression(1),skillLevels:{...createM7SwordsmanSkillProgression(1).skillLevels,'1201':1}};
  assert.throws(()=>validateM7SwordsmanSkillProgression(illegal,1));
});

test('status validator accepts flat modifiers but still rejects undeclared fields',()=>{
  const effect=planM7SwordsmanSkillUse('1401',6).selfStatus!;
  assert.equal(effect.modifiers.attackFlat,35);
  assert.equal(effect.modifiers.maxHpFlat,35);
  assert.equal(effect.modifiers.defenseFlat,-17);
  assert.throws(()=>validateM7StatusEffect({...effect,retailVerified:true}));
});
