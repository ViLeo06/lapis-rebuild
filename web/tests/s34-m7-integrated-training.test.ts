import test from 'node:test';
import assert from 'node:assert/strict';
import {
  M7_INTEGRATED_TRAINING_BATTLES,
  M7_MAX_ACTIVE_ENEMIES_PER_GROUP,
  M7_TRAINING_ENEMY_COUNTS,
  integratedTrainingBattleById,
  validateM7IntegratedTrainingBattles,
} from '../src/training/m7-integrated-training-catalog.ts';
import {M7_MONSTER_ARCHETYPE_CATALOG} from '../src/content/monsters/monster-archetype-catalog.ts';

test('S34 joins all 15 S33 presets to explicit S30 monster IDs',()=>{
  validateM7IntegratedTrainingBattles();
  assert.equal(M7_INTEGRATED_TRAINING_BATTLES.length,15);
  assert.deepEqual(
    M7_INTEGRATED_TRAINING_BATTLES.map(row=>row.recommendedLevel),
    [2,5,6,10,15,16,25,26,35,36,45,46,55,56,65],
  );
  assert.equal(new Set(M7_INTEGRATED_TRAINING_BATTLES.map(row=>row.enemies.map(enemy=>enemy.monsterId).join('|'))).size,15);
});


test('S34 playtest roster grows from 2 to 20 while every engagement group stays at five or fewer',()=>{
  assert.deepEqual(M7_INTEGRATED_TRAINING_BATTLES.map(row=>row.totalEnemyCount),[...M7_TRAINING_ENEMY_COUNTS]);
  assert.equal(M7_INTEGRATED_TRAINING_BATTLES[0]!.totalEnemyCount,2);
  assert.equal(M7_INTEGRATED_TRAINING_BATTLES.at(-1)!.totalEnemyCount,20);
  for(const battle of M7_INTEGRATED_TRAINING_BATTLES){
    const groups=new Map<number,number>();
    for(const enemy of battle.enemies)groups.set(enemy.encounterGroup,(groups.get(enemy.encounterGroup)??0)+1);
    assert.ok([...groups.values()].every(count=>count<=M7_MAX_ACTIVE_ENEMIES_PER_GROUP));
    assert.equal(groups.size,battle.groupCount);
    assert.equal(new Set(battle.enemies.map(enemy=>enemy.instanceId)).size,battle.enemies.length);
  }
});

test('S34 concrete training enemy levels come only from fixed S30 rows',()=>{
  for(const battle of M7_INTEGRATED_TRAINING_BATTLES){
    for(const enemy of battle.enemies){
      const source=M7_MONSTER_ARCHETYPE_CATALOG.require(enemy.monsterId);
      assert.equal(source.fixedLevel,true);
      assert.equal(enemy.fixedLevel,source.level);
      assert.equal(enemy.evidenceStatus,'RECONSTRUCTION_POLICY');
    }
  }
});

test('battle #8 is the Ash/healingBlocked acceptance fight',()=>{
  const battle=integratedTrainingBattleById(8);
  const healer=battle.enemies
    .map(enemy=>M7_MONSTER_ARCHETYPE_CATALOG.require(enemy.monsterId))
    .find(monster=>monster.recoveryCapability?.blockedByStatus==='healingBlocked');
  assert.ok(healer);
  assert.equal(healer.monsterId,'m7-green-armored-renewer-l26');
});

test('battle #15 contains the fixed S30 boss rather than a scaled dummy',()=>{
  const battle=integratedTrainingBattleById(15);
  const monsters=battle.enemies.map(enemy=>M7_MONSTER_ARCHETYPE_CATALOG.require(enemy.monsterId));
  assert.ok(monsters.some(monster=>monster.traits.includes('boss')));
  assert.ok(monsters.some(monster=>monster.traits.includes('elite')));
  assert.ok(monsters.every(monster=>monster.fixedLevel));
});

test('scene identity remains original evidence while training roster binding stays reconstruction',()=>{
  for(const battle of M7_INTEGRATED_TRAINING_BATTLES){
    assert.equal(battle.sceneEvidence,'VERIFIED-STATIC-ORIGINAL');
    assert.equal(battle.rosterBindingEvidence,'RECONSTRUCTION_POLICY');
  }
});
