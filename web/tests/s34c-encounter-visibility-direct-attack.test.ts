import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeEnemyEncounterGroup,beginBattle,updateBattle,useAttack} from '../src/battle.ts';
import {enemyVisibleInBattle,resolveBattlePointerAction} from '../src/combat/m7-encounter-groups.ts';
import {M7_MAX_ACTIVE_ENEMIES_PER_GROUP,reconstructionEnemiesForTrainingBattle} from '../src/training/m7-integrated-training-catalog.ts';
import {reconstructionSetupForTrainingBattle,trainingBattleById} from '../src/training/m7-training-camp.ts';

function battle(battleId=15){
  const preset=trainingBattleById(battleId);
  return beginBattle(0,0,{battleZoneId:preset.battleZoneId,provenance:'RECONSTRUCTION_POLICY',authority:'offline-reconstruction'},{
    ...reconstructionSetupForTrainingBattle(preset,'169',65,{}),
    enemies:reconstructionEnemiesForTrainingBattle(battleId),
  });
}

test('S34C keeps all 20 living enemies visible independent of active encounter group',()=>{
  const state=battle();
  assert.equal(state.enemies.length,20);
  assert.equal(state.enemies.filter(enemy=>enemyVisibleInBattle(enemy)).length,20);
  const groupSizes=[...new Set(state.enemies.map(enemy=>enemy.encounterGroup))]
    .map(group=>state.enemies.filter(enemy=>enemy.encounterGroup===group).length);
  assert.ok(groupSizes.every(size=>size<=M7_MAX_ACTIVE_ENEMIES_PER_GROUP));

  const group0=state.enemies.find(enemy=>enemy.encounterGroup===0)!;
  const group3=state.enemies.find(enemy=>enemy.encounterGroup===3)!;
  assert.equal(activeEnemyEncounterGroup(state,group0.x,group0.y),0);
  assert.equal(enemyVisibleInBattle(group3),true,'inactive groups stay visually present');
  group3.hp=0;
  assert.equal(enemyVisibleInBattle(group3),false,'dead enemies are hidden');
});

test('S34C proximity activation runs only the nearby group and switches as the player moves',()=>{
  const state=battle();
  const group0=state.enemies.find(enemy=>enemy.encounterGroup===0)!;
  const group2=state.enemies.find(enemy=>enemy.encounterGroup===2)!;
  updateBattle(state,250,group0.x,group0.y,0);
  assert.ok(state.enemies.filter(enemy=>enemy.encounterGroup===0).some(enemy=>enemy.action>0));
  assert.ok(state.enemies.filter(enemy=>enemy.encounterGroup!==0).every(enemy=>enemy.action===0));

  for(const enemy of state.enemies)enemy.action=0;
  updateBattle(state,250,group2.x,group2.y,0);
  assert.equal(activeEnemyEncounterGroup(state,group2.x,group2.y),2);
  assert.ok(state.enemies.filter(enemy=>enemy.encounterGroup===2).some(enemy=>enemy.action>0));
  assert.ok(state.enemies.filter(enemy=>enemy.encounterGroup!==2).every(enemy=>enemy.action===0));
});

test('S34C battle pointer selects a living enemy and basic attack reuses readiness/range authority',()=>{
  const state=beginBattle(0,0);
  const target=state.enemies[0]!;
  const pointer=resolveBattlePointerAction(state,target.x,target.y,false);
  assert.ok(pointer);
  assert.equal(pointer.kind,'basic-attack');
  assert.equal(pointer.enemy.id,target.id);

  state.action=state.actionMax;
  const before=target.hp;
  const hit=useAttack(state,target.id,target.x,target.y,null);
  assert.equal(hit.ok,true);
  assert.ok(target.hp<before);

  const readinessState=beginBattle(0,0);
  const readinessTarget=readinessState.enemies[0]!;
  readinessState.action=0;
  const readinessHp=readinessTarget.hp;
  const notReady=useAttack(readinessState,readinessTarget.id,readinessTarget.x,readinessTarget.y,null);
  assert.equal(notReady.ok,false);
  assert.match(notReady.message,/行动槽/);
  assert.equal(readinessTarget.hp,readinessHp);

  const rangeState=beginBattle(0,0);
  const anchorEnemy=rangeState.enemies[0]!;
  const farTarget=rangeState.enemies[1]!;
  farTarget.x=anchorEnemy.x+10_000;
  farTarget.y=anchorEnemy.y;
  rangeState.action=rangeState.actionMax;
  const farHp=farTarget.hp;
  const outOfRange=useAttack(rangeState,farTarget.id,anchorEnemy.x,anchorEnemy.y,null);
  assert.equal(outOfRange.ok,false);
  assert.match(outOfRange.message,/射程/);
  assert.equal(farTarget.hp,farHp);
});

test('S34C skill-targeting pointer intent never becomes a basic attack',()=>{
  const state=beginBattle(0,0);
  const target=state.enemies[0]!;
  const pointer=resolveBattlePointerAction(state,target.x,target.y,true);
  assert.ok(pointer);
  assert.equal(pointer.kind,'skill-target');
  assert.equal(pointer.enemy.id,target.id);
});

test('S34C Scene uses one Phaser pointer path for desktop/mobile and preserves the targeting hook',()=>{
  const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  assert.equal((source.match(/this\.input\.on\('pointerdown'/g)??[]).length,1,'Phaser Pointer is the shared mouse/touch path');
  assert.match(source,/resolveBattlePointerAction\(this\.state,world\.x,world\.y,this\.isTargetingSkill\(\)\)/);
  assert.match(source,/if\(action\.kind==='skill-target'\)[\s\S]*?return;[\s\S]*?this\.attack\(null\);/);
  assert.match(source,/isTargetingSkill\(\):boolean/);
});

test('S34C Scene keeps recovered and fallback enemy visuals alive-only, never activeGroup-only',()=>{
  const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  assert.match(source,/const visible=enemyVisibleInBattle\(enemy\);[\s\S]*?if\(actor\)actor\.setVisible\(visible\);[\s\S]*?enemyFallbackLabels\.get\(enemy\.id\)[\s\S]*?setVisible\(visible\)/);
  assert.match(source,/const visible=this\.inBattleView&&enemyVisibleInBattle\(enemy\)/);
  assert.match(source,/if\(e\.hp<=0\)return;[\s\S]*?if\(!this\.enemyVisualActors\.has\(e\.id\)\)/);
  assert.match(source,/visible:this\.enemyVisualActors\.get\(enemy\.id\)\?\.image\.visible\?\?this\.enemyFallbackLabels\.get\(enemy\.id\)\?\.visible\?\?false/);
  assert.doesNotMatch(source,/setVisible\(enemy\.hp>0&&enemy\.encounterGroup===activeGroup\)/);
  assert.doesNotMatch(source,/const visible=this\.inBattleView&&enemy\.hp>0&&enemy\.encounterGroup===activeGroup/);
});