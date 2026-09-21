import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createM7DeveloperSkillState,
  createM7IntegratedSkillState,
  m7RuntimeSkillCommands,
  reconcileM7IntegratedSkillState,
} from '../src/training/m7-skill-progression.ts';

test('S34 integrated swordsman skill state unlocks cumulative Lv1 skills on approved boundaries',()=>{
  let state=createM7IntegratedSkillState(100,1);
  assert.deepEqual(m7RuntimeSkillCommands(state,100,1).map(row=>row.id),['swordsman:1101']);
  state=reconcileM7IntegratedSkillState(state,110,1,6);
  assert.deepEqual(m7RuntimeSkillCommands(state,110,6).map(row=>row.id),['swordsman:1101','swordsman:1201']);
  state=reconcileM7IntegratedSkillState(state,160,6,56);
  const commands=m7RuntimeSkillCommands(state,160,56);
  assert.equal(commands.length,7);
  assert.equal(commands.at(-2)?.id,'swordsman:battle-command');
  assert.equal(commands.at(-1)?.id,'swordsman:stun-strike');
  assert.equal(commands.at(-1)?.authoredSkillId,null);
});

test('S34 integrated wizard skill state auto-grants each newly unlocked skill at Lv1',()=>{
  let state=createM7IntegratedSkillState(109,1);
  assert.deepEqual(m7RuntimeSkillCommands(state,109,1).map(row=>row.id),['wizard:dark-veil']);
  state=reconcileM7IntegratedSkillState(state,119,1,6);
  assert.deepEqual(m7RuntimeSkillCommands(state,119,6).map(row=>row.id),['wizard:dark-veil','wizard:poison-mist']);
  state=reconcileM7IntegratedSkillState(state,169,6,56);
  const commands=m7RuntimeSkillCommands(state,169,56);
  assert.equal(commands.length,7);
  assert.equal(commands.at(-2)?.id,'wizard:blindness');
  assert.equal(commands.at(-1)?.id,'wizard:cursed-sword');
  assert.equal(commands.at(-1)?.authoredSkillId,null);
});

test('Developer override exposes all seven skills at Lv6 without changing persisted normal state',()=>{
  const normal=createM7IntegratedSkillState(100,1);
  const normalBefore=JSON.stringify(normal);
  const commands=m7RuntimeSkillCommands(normal,100,1,true);
  assert.equal(commands.length,7);
  assert.ok(commands.every(row=>row.skillLevel===6));
  assert.equal(JSON.stringify(normal),normalBefore);
  const dev=createM7DeveloperSkillState(109,1);
  assert.equal(m7RuntimeSkillCommands(dev,109,1,true).length,7);
});
