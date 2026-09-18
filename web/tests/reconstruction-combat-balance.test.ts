import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBAT_BALANCE_PROVENANCE,
  DEFAULT_RECONSTRUCTION_COMBAT_BALANCE,
  RECONSTRUCTION_COMBAT_BALANCE_TUNING,
  ReconstructionCombatBalance,
} from '../src/combat/reconstruction-combat-balance.ts';
import {simulateCombatBatch} from '../src/combat/combat-balance-simulator.ts';

const balance=DEFAULT_RECONSTRUCTION_COMBAT_BALANCE;

test('S19 keeps authored class anchors separate from reconstruction combat stats',()=>{
  const swordsman=balance.playerStats(100);
  const wizard=balance.playerStats(109);
  assert.equal(balance.id,'m5-reconstruction-combat-balance-v1');
  assert.equal(balance.provenance,'RECONSTRUCTION_POLICY');
  assert.equal(swordsman.provenance,COMBAT_BALANCE_PROVENANCE);
  assert.deepEqual(swordsman.authoredAnchors,{hp:125,mp:100,hit:160,magicHit:160,provenance:'VERIFIED'});
  assert.deepEqual(wizard.authoredAnchors,{hp:100,mp:130,hit:160,magicHit:160,provenance:'VERIFIED'});
  assert.equal(swordsman.maxHp,125);
  assert.equal(wizard.maxMp,130);
  assert.notEqual(swordsman.attack,wizard.attack);
  assert.notEqual(swordsman.magicAttack,wizard.magicAttack);
});

test('level and enemy scaling are bounded, monotonic reconstruction policy',()=>{
  const l1=balance.playerStats(100,1);
  const l10=balance.playerStats(100,10);
  const e1=balance.enemyStats({level:1,rank:'normal',role:'melee'});
  const e10=balance.enemyStats({level:10,rank:'normal',role:'melee'});
  const elite=balance.enemyStats({level:10,rank:'elite',role:'melee'});
  assert.ok(l10.maxHp>l1.maxHp&&l10.attack>l1.attack&&l10.accuracy>l1.accuracy);
  assert.ok(e10.maxHp>e1.maxHp&&e10.attack>e1.attack);
  assert.ok(elite.maxHp>e10.maxHp&&elite.attack>e10.attack);
  assert.ok([l10.maxHp,l10.attack,e10.maxHp,e10.attack].every(value=>value<=RECONSTRUCTION_COMBAT_BALANCE_TUNING.bounds.maxStat));
  assert.throws(()=>balance.playerStats(100,0));
  assert.throws(()=>balance.enemyStats({level:100}));
});

test('hit, critical and damage bounds prevent one-shot extremes while preserving defence value',()=>{
  const player=balance.playerStats(100);
  const enemy=balance.enemyStats({level:1,rank:'normal',role:'melee'});
  const forced=balance.resolveAttack(player,enemy,{kind:'physical',multiplier:1.55,hits:1,criticalBonus:0.04},(()=>{const values=[0,0];return()=>values.shift()??0;})());
  assert.equal(forced.strikes[0]?.hit,true);
  assert.equal(forced.strikes[0]?.critical,true);
  assert.ok(forced.totalDamage>0);
  assert.ok(forced.totalDamage<=Math.floor(enemy.maxHp*RECONSTRUCTION_COMBAT_BALANCE_TUNING.bounds.maxSingleStrikeHpRatio));
  const miss=balance.resolveAttack(player,enemy,{kind:'physical',multiplier:1,hits:1},()=>0.999);
  assert.equal(miss.totalDamage,0);
  const wizard=balance.playerStats(109);
  const armoredWizard=balance.playerStats(109,1,{defense:20});
  const incoming=balance.deterministicDamage(enemy,wizard,'physical',1,false);
  const reduced=balance.deterministicDamage(enemy,armoredWizard,'physical',1,false);
  assert.ok(reduced<incoming);
  assert.ok(balance.hitChance(player,enemy,'physical')>=RECONSTRUCTION_COMBAT_BALANCE_TUNING.bounds.minHitChance);
  assert.ok(balance.hitChance(player,enemy,'physical')<=RECONSTRUCTION_COMBAT_BALANCE_TUNING.bounds.maxHitChance);
});

test('showcase skills preserve authored MP costs but use explicit reconstruction multipliers',()=>{
  const heavy=balance.skill(1101);
  const double=balance.skill(1201);
  const guard=balance.skill(1301);
  const blind=balance.skill(19101);
  const poison=balance.skill(19201);
  const mana=balance.skill(19301);
  assert.deepEqual([heavy.mpCost,double.mpCost,guard.mpCost,blind.mpCost,poison.mpCost,mana.mpCost],[25,23,20,20,20,20]);
  assert.ok([heavy,double,guard,blind,poison,mana].every(skill=>skill.authoredMpProvenance==='VERIFIED'));
  assert.ok([heavy,double,guard,blind,poison,mana].every(skill=>skill.provenance==='RECONSTRUCTION_POLICY'));
  assert.equal(double.hits,2);
  assert.equal(poison.dot?.ticks,3);
  assert.equal(guard.kind,'support');
  assert.equal(Math.floor(balance.playerStats(100).maxMp/heavy.mpCost),4);
  assert.equal(Math.floor(balance.playerStats(109).maxMp/poison.mpCost),6);
});

test('equipment inputs improve the intended combat axis without changing authored anchors',()=>{
  const baseSword=balance.playerStats(100);
  const gearedSword=balance.playerStats(100,1,{attack:7,defense:2});
  const baseWizard=balance.playerStats(109);
  const gearedWizard=balance.playerStats(109,1,{magicAttack:7,defense:2});
  assert.ok(gearedSword.attack>baseSword.attack&&gearedSword.defense>baseSword.defense);
  assert.ok(gearedWizard.magicAttack>baseWizard.magicAttack&&gearedWizard.defense>baseWizard.defense);
  assert.deepEqual(gearedSword.authoredAnchors,baseSword.authoredAnchors);
  assert.deepEqual(gearedWizard.authoredAnchors,baseWizard.authoredAnchors);
});

test('reward growth is centralized, monotonic and additive',()=>{
  const normal1=balance.rewardForEnemy({level:1,rank:'normal'});
  const normal5=balance.rewardForEnemy({level:5,rank:'normal'});
  const elite5=balance.rewardForEnemy({level:5,rank:'elite'});
  const pair=balance.rewardForEncounter([{level:1,rank:'normal'},{level:1,rank:'normal'}]);
  assert.deepEqual(normal1,{gold:4,exp:35,provenance:'RECONSTRUCTION_POLICY'});
  assert.ok(normal5.gold>normal1.gold&&normal5.exp>normal1.exp);
  assert.ok(elite5.gold>normal5.gold&&elite5.exp>normal5.exp);
  assert.equal(pair.gold,normal1.gold*2);
  assert.equal(pair.exp,normal1.exp*2);
});

test('deterministic simulations cover 1v1 and 2v1 swordsman/wizard playability targets',()=>{
  const sword1=simulateCombatBatch({playerClassId:100,enemyCount:1},400,1);
  const sword2=simulateCombatBatch({playerClassId:100,enemyCount:2},400,1);
  const wizard1=simulateCombatBatch({playerClassId:109,enemyCount:1},400,1);
  const wizard2=simulateCombatBatch({playerClassId:109,enemyCount:2},400,1);
  for(const sample of [sword1,sword2,wizard1,wizard2]){
    assert.equal(sample.provenance,'RECONSTRUCTION_POLICY');
    assert.ok(Math.abs(sample.deathRate-(1-sample.winRate))<1e-12);
    assert.ok(sample.meanDurationSeconds>=4&&sample.meanDurationSeconds<=20);
    assert.ok(sample.p90DurationSeconds<=25);
    assert.ok(sample.meanPlayerActions>=2&&sample.meanPlayerActions<=20);
  }
  assert.ok(sword1.winRate>=0.98);
  assert.ok(wizard1.winRate>=0.98);
  assert.ok(sword2.winRate>=0.85&&sword2.winRate<=1);
  assert.ok(wizard2.winRate>=0.65&&wizard2.winRate<=0.98);
  assert.ok(wizard2.deathRate>=0.02&&wizard2.deathRate<=0.35);
});

test('representative equipment improves or preserves two-enemy simulation outcomes',()=>{
  const swordBase=simulateCombatBatch({playerClassId:100,enemyCount:2},400,1000);
  const swordGear=simulateCombatBatch({playerClassId:100,enemyCount:2,playerEquipment:{attack:7,defense:2}},400,1000);
  const wizardBase=simulateCombatBatch({playerClassId:109,enemyCount:2},400,2000);
  const wizardGear=simulateCombatBatch({playerClassId:109,enemyCount:2,playerEquipment:{magicAttack:7,defense:2}},400,2000);
  assert.ok(swordGear.winRate>=swordBase.winRate);
  assert.ok(wizardGear.winRate>=wizardBase.winRate);
  assert.ok(swordGear.meanDurationSeconds<=swordBase.meanDurationSeconds*1.05);
  assert.ok(wizardGear.meanDurationSeconds<=wizardBase.meanDurationSeconds*1.05);
});

test('tuning remains replaceable through ReconstructionCombatBalance rather than scattered constants',()=>{
  const custom=new ReconstructionCombatBalance({
    ...RECONSTRUCTION_COMBAT_BALANCE_TUNING,
    id:'test-balance',
    reward:{...RECONSTRUCTION_COMBAT_BALANCE_TUNING.reward,baseGold:9},
  });
  assert.equal(custom.id,'test-balance');
  assert.equal(custom.rewardForEnemy({level:1,rank:'normal'}).gold,9);
  assert.equal(balance.rewardForEnemy({level:1,rank:'normal'}).gold,4);
});
