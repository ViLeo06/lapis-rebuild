import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateM7AcceptanceInput} from '../src/m7-acceptance-harness.ts';
import type {
  M7AcceptanceInput,
  M7MonsterAcceptanceProbe,
  M7SkillAcceptanceProbe,
  M7TrainingAcceptanceProbe,
} from '../src/m7-acceptance-harness.ts';

const roles=['melee','high-offense','high-defense','ranged','tank','fast','magic','dot','control','healer','regenerator','elite','boss','skirmisher'];
const levels=[2,6,16,26,36,46,56,5,15,25,35,45,55,65];
const monsters:M7MonsterAcceptanceProbe[]=Object.freeze(roles.map((role,index)=>Object.freeze({
  monsterId:`fixture-${index+1}`,
  level:levels[index]!,
  archetypes:Object.freeze([role]),
  fixedStats:true,
  visualFamily:`B${4500+index}`,
  visualEvidence:'VERIFIED-STATIC-ORIGINAL' as const,
  balanceEvidence:'RECONSTRUCTION_POLICY' as const,
  ...(role==='healer'||role==='regenerator'?{canRecoverHp:true}:{}),
})));

function skillRows(profession:'swordsman'|'wizard'):M7SkillAcceptanceProbe[]{
  return [1,6,16,26,36,46,56].map((unlockLevel,index)=>Object.freeze({
    profession,
    skillId:`${profession}-skill-${index+1}`,
    unlockLevel,
    maximumSkillLevel:6,
    evidence:'RECONSTRUCTION_POLICY' as const,
  }));
}
const recommended=[2,5,6,10,15,16,25,26,35,36,45,46,55,56,65];
const training:M7TrainingAcceptanceProbe[]=recommended.map((recommendedLevel,index)=>{
  const a=monsters[index%monsters.length]!;
  const b=monsters[(index+1)%monsters.length]!;
  return Object.freeze({
    battleId:index+1,
    recommendedLevel,
    battleZoneId:index%2?3:1,
    monsterIds:Object.freeze([a.monsterId,b.monsterId]),
    fixedEnemyLevels:Object.freeze([a.level,b.level]),
    bindingEvidence:'RECONSTRUCTION_POLICY' as const,
  });
});

function validFixture():M7AcceptanceInput{
  return Object.freeze({
    monsters,
    skills:Object.freeze([...skillRows('swordsman'),...skillRows('wizard')]),
    training:Object.freeze(training),
    recovery:Object.freeze({
      hpAmount:200,mpAmount:200,readinessCost:10,infinite:true,provenance:'RECONSTRUCTION_POLICY' as const,
    }),
  });
}

test('S34 M7 acceptance harness accepts a complete structural handoff',()=>{
  const result=validateM7AcceptanceInput(validFixture());
  assert.equal(result.ok,true,result.errors.join('\n'));
  assert.deepEqual(result.errors,[]);
});

test('S34 harness rejects auto-scaled monsters and missing healer coverage',()=>{
  const fixture=validFixture();
  const brokenMonsters=fixture.monsters.map((row,index)=>Object.freeze({
    ...row,
    fixedStats:index===0?false:row.fixedStats,
    archetypes:row.archetypes.filter(tag=>tag!=='healer'&&tag!=='regenerator'),
    canRecoverHp:false,
  }));
  const result=validateM7AcceptanceInput({...fixture,monsters:brokenMonsters});
  assert.equal(result.ok,false);
  assert.ok(result.errors.some(error=>error.startsWith('monster-scaling:')));
  assert.ok(result.errors.includes('monster-archetype: missing healer'));
  assert.ok(result.errors.includes('monster-archetype: missing regenerator'));
  assert.ok(result.errors.includes('monster-healer: no HP recovery target'));
});

test('S34 harness rejects wrong skill unlock cadence or missing six-level support',()=>{
  const fixture=validFixture();
  const brokenSkills=fixture.skills.map((row,index)=>index===0?{...row,unlockLevel:10,maximumSkillLevel:1}:row);
  const result=validateM7AcceptanceInput({...fixture,skills:brokenSkills});
  assert.equal(result.ok,false);
  assert.ok(result.errors.some(error=>error.startsWith('skill-unlocks:')));
  assert.ok(result.errors.some(error=>error.startsWith('skill-level:')));
});

test('S34 harness rejects incomplete training, unknown monster IDs and mutable evidence claims',()=>{
  const fixture=validFixture();
  const broken=fixture.training.slice(0,14).map((row,index)=>index===0?{
    ...row,
    monsterIds:['unknown-monster'],
    fixedEnemyLevels:[row.recommendedLevel],
    bindingEvidence:'VERIFIED' as const,
  }:row);
  const result=validateM7AcceptanceInput({...fixture,training:broken});
  assert.equal(result.ok,false);
  assert.ok(result.errors.some(error=>error.startsWith('training-count:')));
  assert.ok(result.errors.some(error=>error.includes('unknown unknown-monster')));
  assert.ok(result.errors.some(error=>error.startsWith('training-binding-evidence:')));
});

test('S34 harness keeps recovery values explicitly reconstruction policy',()=>{
  const fixture=validFixture();
  const result=validateM7AcceptanceInput({...fixture,recovery:{...fixture.recovery,readinessCost:0,provenance:'VERIFIED'}});
  assert.equal(result.ok,false);
  assert.ok(result.errors.includes('recovery-readiness: pre-balance candidate must start at 10'));
  assert.ok(result.errors.includes('recovery-evidence: must be RECONSTRUCTION_POLICY'));
});
