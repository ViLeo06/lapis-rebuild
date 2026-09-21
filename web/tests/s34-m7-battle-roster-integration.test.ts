import test from 'node:test';
import assert from 'node:assert/strict';
import {beginBattle} from '../src/battle.ts';
import {reconstructionEnemiesForTrainingBattle} from '../src/training/m7-integrated-training-catalog.ts';
import {trainingBattleById,reconstructionSetupForTrainingBattle} from '../src/training/m7-training-camp.ts';

function setupFor(battleId:number,playerLevel:number){
  const preset=trainingBattleById(battleId);
  return {
    ...reconstructionSetupForTrainingBattle(preset,'100',playerLevel,{}),
    enemies:reconstructionEnemiesForTrainingBattle(battleId),
  };
}

test('S34 battle core consumes explicit S30 fixed roster instead of dummy enemies',()=>{
  const state=beginBattle(100,100,{battleZoneId:23,provenance:'RECONSTRUCTION_POLICY',authority:'offline-reconstruction'},setupFor(8,26));
  assert.equal(state.battleZoneId,23);
  assert.deepEqual(state.enemies.map(enemy=>enemy.id),['m7-green-armored-renewer-l26']);
  assert.equal(state.enemies[0]?.combatStats?.level,26);
  assert.equal(state.enemies[0]?.maxHp,320);
  assert.equal(state.enemies[0]?.visualResourceId,4526);
});

test('player level does not scale fixed training enemy stats',()=>{
  const low=beginBattle(0,0,undefined,setupFor(15,1));
  const high=beginBattle(0,0,undefined,setupFor(15,65));
  assert.deepEqual(
    low.enemies.map(enemy=>({id:enemy.id,level:enemy.combatStats?.level,hp:enemy.maxHp,attack:enemy.combatStats?.attack,defense:enemy.combatStats?.defense})),
    high.enemies.map(enemy=>({id:enemy.id,level:enemy.combatStats?.level,hp:enemy.maxHp,attack:enemy.combatStats?.attack,defense:enemy.combatStats?.defense})),
  );
  assert.ok(low.enemies.some(enemy=>enemy.id==='m7-spectral-overseer-boss-l65'));
  assert.ok(low.enemies.some(enemy=>enemy.combatStats?.rank==='elite'));
});

test('legacy reconstruction setup still falls back to two dummies',()=>{
  const state=beginBattle(0,0,undefined,{playerClassId:'100',level:10,enemyLevel:10,enemyRank:'normal'});
  assert.deepEqual(state.enemies.map(enemy=>enemy.id),['dummy-melee','dummy-ranged']);
  assert.deepEqual(state.enemies.map(enemy=>enemy.visualResourceId),[4524,4544]);
});
