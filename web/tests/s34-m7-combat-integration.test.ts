import test from 'node:test';
import assert from 'node:assert/strict';
import {activeEnemyEncounterGroup,beginBattle,updateBattle,useAttack} from '../src/battle.ts';
import {useM7Skill,tickM7BattleStatuses} from '../src/combat/m7-battle-skills.ts';
import {createM7IntegratedSkillState,m7RuntimeSkillCommands} from '../src/training/m7-skill-progression.ts';
import {reconstructionEnemiesForTrainingBattle} from '../src/training/m7-integrated-training-catalog.ts';
import {reconstructionSetupForTrainingBattle,trainingBattleById} from '../src/training/m7-training-camp.ts';

function battle(battleId:number,character:string,level:number){
  const preset=trainingBattleById(battleId);
  return beginBattle(0,0,{battleZoneId:preset.battleZoneId,provenance:'RECONSTRUCTION_POLICY',authority:'offline-reconstruction'},{
    ...reconstructionSetupForTrainingBattle(preset,character,level,{}),
    enemies:reconstructionEnemiesForTrainingBattle(battleId),
  });
}
function command(character:string,level:number,id:string){
  const state=createM7IntegratedSkillState(character,level);
  const row=m7RuntimeSkillCommands(state,character,level).find(candidate=>candidate.id===id);
  assert.ok(row,`missing command ${id}`);
  return row;
}

test('S34 staged enemy groups cap simultaneous attackers at five and unlock sequentially',()=>{
  const state=battle(15,'169',65);
  assert.equal(state.enemies.length,20);
  assert.equal(activeEnemyEncounterGroup(state),0);
  assert.equal(state.enemies.filter(enemy=>enemy.encounterGroup===0).length,5);
  assert.ok(state.enemies.filter(enemy=>enemy.encounterGroup>0).every(enemy=>enemy.action===0));

  updateBattle(state,250,0,0,0);
  assert.ok(state.enemies.filter(enemy=>enemy.encounterGroup===0).some(enemy=>enemy.action>0));
  assert.ok(state.enemies.filter(enemy=>enemy.encounterGroup>0).every(enemy=>enemy.action===0));

  const future=state.enemies.find(enemy=>enemy.encounterGroup===1)!;
  state.action=state.actionMax;
  const blocked=useAttack(state,future.id,0,0,null);
  assert.equal(blocked.ok,false);
  assert.match(blocked.message,/尚未投入战斗/);

  for(const enemy of state.enemies.filter(enemy=>enemy.encounterGroup===0))enemy.hp=0;
  assert.equal(activeEnemyEncounterGroup(state),1);
  updateBattle(state,250,0,0,0);
  assert.ok(state.enemies.filter(enemy=>enemy.encounterGroup===1).some(enemy=>enemy.action>0));
  assert.ok(state.enemies.filter(enemy=>enemy.encounterGroup>1).every(enemy=>enemy.action===0));
});

test('S34 Sacrifice is a sustained periodic HP-cost buff with 1 HP floor',()=>{
  const state=battle(10,'140',36);
  const sacrifice=command('140',36,'swordsman:1501');
  const cast=useM7Skill(state,state.enemies[0]!.id,0,0,sacrifice);
  assert.equal(cast.ok,true);
  const start=state.hp;
  tickM7BattleStatuses(state,10_000);
  assert.ok(state.hp<start);
  assert.ok(state.playerM7Status.swordsman.some(status=>status.sourceSkillKey==='1501'));
  for(let i=0;i<20;i++)tickM7BattleStatuses(state,10_000);
  assert.ok(state.hp>=1);
});

test('S34 poison ticks without the poisoned target taking an action',()=>{
  const state=battle(3,'119',6);
  const poison=command('119',6,'wizard:poison-mist');
  const target=state.enemies[0]!;
  const cast=useM7Skill(state,target.id,0,0,poison);
  assert.equal(cast.ok,true);
  const before=target.hp;
  const events=tickM7BattleStatuses(state,5_000);
  assert.ok(target.hp<before);
  assert.ok(events.some(event=>event.target===target.id));
});

test('S34 Ashes blocks the S30 healer self-heal route',()=>{
  const state=battle(8,'139',26);
  const ashes=command('139',26,'wizard:ashes');
  const healer=state.enemies[0]!;
  healer.hp=healer.maxHp-100;
  const cast=useM7Skill(state,healer.id,0,0,ashes);
  assert.equal(cast.ok,true);
  const beforeHp=healer.hp;
  const beforeMp=healer.mp;
  healer.action=state.actionMax;
  updateBattle(state,1,0,0,0);
  assert.equal(healer.hp,beforeHp);
  assert.ok(healer.mp<beforeMp,'blocked heal still spends the monster ability MP cost');
});

test('S34 petrified target rejects ordinary attack while DOT/status can continue',()=>{
  const state=battle(10,'149',36);
  const petrify=command('149',36,'wizard:curse-eye');
  const target=state.enemies[0]!;
  const cast=useM7Skill(state,target.id,0,0,petrify);
  assert.equal(cast.ok,true);
  state.action=state.actionMax;
  const ordinary=useAttack(state,target.id,0,0,null,0,{staffOrdinaryHit:true});
  assert.equal(ordinary.ok,false);
  assert.match(ordinary.message,/石化/);
});

test('S34 Nature Force drains target MP only on wizard staff ordinary hit',()=>{
  const state=battle(8,'129',16);
  const nature=command('129',16,'wizard:nature-force');
  const target=state.enemies[0]!;
  state.mp=Math.max(0,state.mp-20);
  const cast=useM7Skill(state,target.id,0,0,nature);
  assert.equal(cast.ok,true);
  state.action=state.actionMax;
  const beforeCaster=state.mp;
  const beforeTarget=target.mp;
  const hit=useAttack(state,target.id,0,0,null,0,{staffOrdinaryHit:true});
  assert.equal(hit.ok,true);
  assert.ok(state.mp>beforeCaster);
  assert.ok(target.mp<beforeTarget);
});

test('S34 S30 poison monster applies independent player DOT through the production battle loop',()=>{
  const state=battle(5,'120',16);
  const venom=state.enemies.find(enemy=>enemy.id==='m7-blue-polearm-venom-l15');
  assert.ok(venom);
  venom.action=state.actionMax;
  updateBattle(state,1,0,0,0);
  assert.ok(state.playerPoisonTicks>0);
  const before=state.hp;
  tickM7BattleStatuses(state,5_000);
  assert.ok(state.hp<before);
});
