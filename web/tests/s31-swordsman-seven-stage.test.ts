import test from 'node:test';
import assert from 'node:assert/strict';
import {
  M7_SWORDSMAN_SKILL_BALANCE_POLICY,
  M7_SWORDSMAN_SKILL_CATALOG,
  M7_SWORDSMAN_SKILL_KEYS,
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
  applyM7SwordsmanTargetStatus,
  consumeM7SwordsmanSkillResources,
  m7IncomingDamageAfterSwordsmanStatuses,
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
  m7IsStunned,
  validateM7StatusEffect,
} from '../src/combat/m7-status-effects.ts';

function combat(overrides:Partial<{
  baseMaxHp:number;basePhysicalAttack:number;baseCommandRange:number;
  currentHp:number;currentMp:number;readiness:number;statuses:readonly ReturnType<typeof validateM7StatusEffect>[];
}>={} ){
  return validateM7SwordsmanCombatState({
    baseMaxHp:100,basePhysicalAttack:100,baseCommandRange:4,
    currentHp:100,currentMp:200,readiness:20,statuses:[],...overrides,
  });
}

test('M7 swordsman stage resolver follows 1-5 / 6-15 / 16-25 / 26-35 / 36-45 / 46-55 / 56-65',()=>{
  const samples:[number,number][]=[
    [1,100],[5,100],[6,110],[15,110],[16,120],[25,120],[26,130],[35,130],
    [36,140],[45,140],[46,150],[55,150],[56,160],[65,160],
  ];
  for(const [level,stageId] of samples)assert.equal(swordsmanM7StageForLevel(level).stageId,stageId);
  assert.throws(()=>swordsmanM7StageForLevel(0));
  assert.throws(()=>swordsmanM7StageForLevel(66));
});

test('skill unlocks occur exactly at 1/6/16/26/36/46/56 and retain earlier skills',()=>{
  const gates:[number,number][]=[[1,1],[5,1],[6,2],[15,2],[16,3],[25,3],[26,4],[35,4],[36,5],[45,5],[46,6],[55,6],[56,7],[65,7]];
  for(const [level,count] of gates){
    const keys=availableM7SwordsmanSkillKeys(level);
    assert.equal(keys.length,count,`level ${level}`);
    assert.deepEqual(keys,M7_SWORDSMAN_SKILL_KEYS.slice(0,count));
  }
});

test('catalog contains seven skills and exactly 42 data-driven skill-level states',()=>{
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

test('first five fixed-client identities and authored MP costs remain separate from reconstructed arithmetic',()=>{
  const expected:[string,number,number][]=[['1101',1101,25],['1201',1201,23],['1301',1301,20],['1401',1401,20],['1501',1501,20]];
  for(const [key,id,mp] of expected){
    const skill=m7SwordsmanSkill(key as keyof typeof M7_SWORDSMAN_SKILL_CATALOG);
    assert.equal(skill.originalSkillId,id);
    assert.equal(skill.evidence.identity.level,'VERIFIED-STATIC-ORIGINAL');
    for(const row of skill.levels){
      assert.equal(row.mpCost,mp);
      assert.equal(row.mpCostEvidence,'VERIFIED-STATIC-ORIGINAL');
      assert.equal(row.provenance,'RECONSTRUCTION_POLICY');
    }
  }
  assert.equal(m7SwordsmanSkill('battle-command').originalSkillId,null);
  assert.equal(m7SwordsmanSkill('stun-strike').originalSkillId,null);
  assert.equal(m7SwordsmanSkill('battle-command').evidence.identity.level,'VERIFIED-HISTORICAL');
});

test('normal skill-point state exposes only unlocked skills while developer override exposes all at level 6',()=>{
  const lv1=createM7SwordsmanSkillProgression(1);
  assert.equal(lv1.skillLevels['1101'],1);
  assert.equal(lv1.skillLevels['1201'],0);
  const lv6=createM7SwordsmanSkillProgression(6);
  assert.deepEqual([lv6.skillLevels['1101'],lv6.skillLevels['1201'],lv6.skillLevels['1301']],[1,1,0]);
  const invested=investM7SwordsmanSkillPoint(lv6,6,'1201');
  assert.equal(invested.skillLevels['1201'],2);
  assert.equal(invested.unspentSkillPoints,lv6.unspentSkillPoints-1);
  assert.throws(()=>investM7SwordsmanSkillPoint(lv6,6,'1301'));
  const debug=createDeveloperM7SwordsmanSkillProgression();
  assert.equal(debug.developerOverride,true);
  assert.ok(M7_SWORDSMAN_SKILL_KEYS.every(key=>debug.skillLevels[key]===6));
  assert.equal(M7_SWORDSMAN_SKILL_BALANCE_POLICY.skillPointPolicy.maxSkillLevel,6);
});

test('heavy strike and stun strike have intentionally different tactical profiles',()=>{
  const heavy=planM7SwordsmanSkillUse('1101',1);
  const control=planM7SwordsmanSkillUse('stun-strike',6);
  const bossControl=planM7SwordsmanSkillUse('stun-strike',6,'boss');
  assert.deepEqual(heavy.hitMultipliers,[1.35]);
  assert.equal(heavy.targetStatus?.chance,0.25);
  assert.deepEqual(control.hitMultipliers,[0.75]);
  assert.equal(control.targetStatus?.chance,0.75);
  assert.equal(bossControl.targetStatus?.chance,0.30);
  assert.ok(control.hitMultipliers[0]!<heavy.hitMultipliers[0]!);
  assert.ok(control.targetStatus!.chance>heavy.targetStatus!.chance);
});

test('double slash is two independently rolled hits rather than a cosmetic two-hit label',()=>{
  const lv1=planM7SwordsmanSkillUse('1201',1);
  const lv6=planM7SwordsmanSkillUse('1201',6);
  assert.deepEqual(lv1.hitMultipliers,[0.70,0.70]);
  assert.deepEqual(lv6.hitMultipliers,[0.80,0.80]);
  assert.equal(lv1.independentHitRolls,true);
  assert.equal(lv1.readinessCost,7);
});

test('strong defence reduces physical damage only, refreshes through a single status id, and reaches 50% at skill level 6',()=>{
  const lv1=applyM7SwordsmanSelfSkill(combat(),'1301',1);
  assert.equal(lv1.statuses.length,1);
  assert.equal(m7IncomingDamageAfterSwordsmanStatuses(lv1,100,'physical'),75);
  assert.equal(m7IncomingDamageAfterSwordsmanStatuses(lv1,100,'magic'),100);
  const lv6=applyM7SwordsmanSelfSkill({...lv1,currentMp:200,readiness:20},'1301',6);
  assert.equal(lv6.statuses.length,1);
  assert.equal(lv6.statuses[0]?.sourceSkillLevel,6);
  assert.equal(m7IncomingDamageAfterSwordsmanStatuses(lv6,100,'physical'),50);
});

test('burst is independent from sacrifice: attack and max HP rise while physical incoming damage rises too',()=>{
  const start=combat({currentHp:80});
  const burst=applyM7SwordsmanSelfSkill(start,'1401',1);
  const stats=m7SwordsmanEffectiveStats(burst);
  assert.equal(stats.maxHp,115);
  assert.equal(stats.physicalAttack,125);
  assert.equal(burst.currentHp,95,'current HP follows the temporary max-HP increase');
  assert.equal(m7IncomingDamageAfterSwordsmanStatuses(burst,100,'physical'),125);
  assert.equal(m7IncomingDamageAfterSwordsmanStatuses(burst,100,'magic'),100);
  assert.equal(burst.statuses[0]?.sourceSkillKey,'1401');
  const expired=advanceM7SwordsmanCombatState(burst,25000).state;
  assert.equal(expired.statuses.length,0);
  assert.equal(m7SwordsmanEffectiveStats(expired).maxHp,100);
  assert.equal(expired.currentHp,95);
});

test('sacrifice is a 60s sustained attack buff with a 10s periodic non-lethal HP cost',()=>{
  assert.equal(RECONSTRUCTION_SWORDSMAN_SACRIFICE_POLICY.id,'ReconstructionSwordsmanSacrificePolicy');
  assert.deepEqual(RECONSTRUCTION_SWORDSMAN_SACRIFICE_POLICY.hpCostBySkillLevel,[4,4,5,5,6,6]);
  assert.deepEqual(RECONSTRUCTION_SWORDSMAN_SACRIFICE_POLICY.attackBonusBySkillLevel,[0.15,0.18,0.22,0.26,0.30,0.35]);
  const applied=applyM7SwordsmanSelfSkill(combat(),'1501',1);
  assert.equal(m7SwordsmanEffectiveStats(applied).physicalAttack,115);
  let state=applied;
  let ticks=0;
  for(let i=0;i<6;i+=1){
    const advanced=advanceM7SwordsmanCombatState(state,10000);
    ticks+=advanced.events.reduce((sum,event)=>sum+event.ticks,0);
    state=advanced.state;
  }
  assert.equal(ticks,6);
  assert.equal(state.currentHp,76);
  assert.equal(state.statuses.length,0);
  assert.equal(m7SwordsmanEffectiveStats(state).physicalAttack,100);

  const nearDeath=applyM7SwordsmanSelfSkill(combat({currentHp:3}),'1501',6);
  const floor=advanceM7SwordsmanCombatState(nearDeath,10000).state;
  assert.equal(floor.currentHp,1);
});

test('battle command reserves the future commander hook: +2 range and up to +10% readiness/action efficiency',()=>{
  const command=applyM7SwordsmanSelfSkill(combat(),'battle-command',6);
  const stats=m7SwordsmanEffectiveStats(command);
  assert.equal(stats.commandRange,6);
  assert.equal(stats.readinessEfficiencyMultiplier,1.1);
  const plan=planM7SwordsmanSkillUse('battle-command',6);
  assert.equal(plan.selfStatus?.remainingMs,30000);
});

test('stun status blocks exactly the next action when the conditional roll succeeds',()=>{
  const plan=planM7SwordsmanSkillUse('stun-strike',6);
  const missed=applyM7SwordsmanTargetStatus([],plan,0.90);
  assert.equal(missed.applied,false);
  const hit=applyM7SwordsmanTargetStatus([],plan,0.20);
  assert.equal(hit.applied,true);
  assert.equal(m7IsStunned(hit.statuses),true);
  const consumed=consumeM7BlockedAction(hit.statuses);
  assert.equal(consumed.blocked,true);
  assert.equal(m7IsStunned(consumed.statuses),false);
});

test('skill resource adapter consumes MP and readiness without requiring battle.ts edits',()=>{
  const plan=planM7SwordsmanSkillUse('1101',1);
  const next=consumeM7SwordsmanSkillResources(combat(),plan);
  assert.equal(next.currentMp,175);
  assert.equal(next.readiness,14);
  assert.throws(()=>consumeM7SwordsmanSkillResources(combat({currentMp:0}),plan));
  assert.throws(()=>consumeM7SwordsmanSkillResources(combat({readiness:0}),plan));
});

test('S31 save adapter round-trips legal skill levels and rejects locked-skill contamination',()=>{
  let state=createM7SwordsmanSkillProgression(56);
  for(let i=1;i<6;i+=1)state=investM7SwordsmanSkillPoint(state,56,'1501');
  assert.equal(state.skillLevels['1501'],6);
  const payload=createS31SwordsmanSkillSavePayload(56,state);
  const restored=deserializeS31SwordsmanSkillSavePayload(serializeS31SwordsmanSkillSavePayload(payload));
  assert.deepEqual(restored,payload);
  const illegal={...createM7SwordsmanSkillProgression(1),skillLevels:{...createM7SwordsmanSkillProgression(1).skillLevels,'1201':1}};
  assert.throws(()=>validateM7SwordsmanSkillProgression(illegal,1));
  assert.throws(()=>validateS31SwordsmanSkillSavePayload({...payload,unknown:true}));
});

test('developer all-skills Lv6 state can be persisted by the isolated S31 adapter without changing SaveV2 yet',()=>{
  const debug=createDeveloperM7SwordsmanSkillProgression();
  const payload=createS31SwordsmanSkillSavePayload(56,debug);
  const restored=deserializeS31SwordsmanSkillSavePayload(serializeS31SwordsmanSkillSavePayload(payload));
  assert.equal(restored.skillProgression.developerOverride,true);
  assert.ok(M7_SWORDSMAN_SKILL_KEYS.every(key=>restored.skillProgression.skillLevels[key]===6));
});

test('status validation rejects unknown fields and preserves reconstruction provenance',()=>{
  const effect=planM7SwordsmanSkillUse('1501',1).selfStatus!;
  assert.equal(validateM7StatusEffect(effect).provenance,'RECONSTRUCTION_POLICY');
  assert.throws(()=>validateM7StatusEffect({...effect,retailVerified:true}));
});

test('all 42 rows preserve explicit reconstruction provenance and sacrifice curve is not promoted to static meaning',()=>{
  let rows=0;
  for(const key of M7_SWORDSMAN_SKILL_KEYS){
    for(const row of m7SwordsmanSkill(key).levels){
      rows+=1;
      assert.equal(row.provenance,'RECONSTRUCTION_POLICY');
    }
  }
  assert.equal(rows,42);
  assert.equal(m7SwordsmanSkill('1501').evidence.playerMemory?.level,'PLAYER_MEMORY');
  assert.equal(m7SwordsmanSkillLevel('1501',6).attackBonus,0.35);
  assert.equal(m7SwordsmanSkill('1501').evidence.numbers.level,'RECONSTRUCTION_POLICY');
});
