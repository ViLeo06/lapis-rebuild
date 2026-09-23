import test from 'node:test';
import assert from 'node:assert/strict';

import {beginBattle} from '../src/battle.ts';
import type {Enemy} from '../src/battle.ts';
import {referenceCellToScreen} from '../src/coordinates.ts';
import {
  M7_WIZARD_RUNTIME_POLICY,
  M7_WIZARD_SKILL_KEYS,
  m7WizardSkillLevel,
} from '../src/content/skills/wizard-seven-stage.ts';
import {
  applyM7NatureForceStaffHit,
  applyM7WizardSkillStatus,
  createM7WizardStatusState,
  m7WizardActiveStatusKeys,
  m7WizardPoisonDamageProfile,
  tickM7WizardStatus,
} from '../src/content/skills/wizard-seven-stage-runtime.ts';
import {
  tickM7BattleStatuses,
  useM7SkillTargeted,
} from '../src/combat/m7-battle-skills.ts';
import type {
  M7BattleFeedbackEvent,
} from '../src/combat/m7-battle-skills.ts';
import type {M7GridCell} from '../src/combat/m7-grid-targeting.ts';
import type {M7RuntimeSkillCommand} from '../src/training/m7-skill-progression.ts';

const casterCell:M7GridCell=[10,10];

function wizardCommand(
  key:(typeof M7_WIZARD_SKILL_KEYS)[number],
  level:1|2|3|4|5|6,
  target:'enemy'|'enemy-area'|'self',
):M7RuntimeSkillCommand{
  const row=m7WizardSkillLevel(key,level);
  const authoredIds:Partial<Record<(typeof M7_WIZARD_SKILL_KEYS)[number],number>>={
    'dark-veil':19101,
    'poison-mist':19201,
    'nature-force':19301,
    ashes:19401,
    'curse-eye':19501,
  };
  return Object.freeze({
    id:'wizard:'+key,
    family:'wizard',
    skillKey:key,
    authoredSkillId:authoredIds[key]??null,
    displayName:key,
    skillLevel:level,
    mpCost:row.mpCost,
    readinessCost:row.readinessCost,
    target,
    provenance:'RECONSTRUCTION_POLICY',
  });
}

function place(enemy:Enemy,id:string,cell:M7GridCell,encounterGroup=0):Enemy{
  const [x,y]=referenceCellToScreen(cell);
  enemy.id=id;
  enemy.x=x;
  enemy.y=y;
  enemy.encounterGroup=encounterGroup;
  enemy.hp=enemy.maxHp;
  enemy.m7Status=Object.freeze({
    swordsman:Object.freeze([]),
    wizard:createM7WizardStatusState(),
  });
  return enemy;
}

function cloneEnemy(source:Enemy,id:string,cell:M7GridCell,encounterGroup=0):Enemy{
  const clone:Enemy={
    ...source,
    id,
    abilityCooldownMs:{},
    traits:Object.freeze([...source.traits]),
    abilities:Object.freeze([...source.abilities]),
    m7Status:Object.freeze({
      swordsman:Object.freeze([]),
      wizard:createM7WizardStatusState(),
    }),
  };
  return place(clone,id,cell,encounterGroup);
}

function battle(){
  const [x,y]=referenceCellToScreen(casterCell);
  return {state:beginBattle(x,y),x,y};
}

test('S37 keeps all 42 wizard skill-level states gameplay-active',()=>{
  for(const key of M7_WIZARD_SKILL_KEYS){
    for(const level of [1,2,3,4,5,6] as const){
      const before=createM7WizardStatusState();
      const after=applyM7WizardSkillStatus(before,key,level,{intelligence:80});
      assert.notDeepEqual(after,before,key+' Lv'+level+' must change combat state');
      assert.ok(m7WizardActiveStatusKeys(after).includes(key),key+' Lv'+level+' must expose an active status');
      switch(key){
        case 'dark-veil':
          assert.ok((after.darkVeil?.physicalHitModifier??0)<0);
          break;
        case 'poison-mist':
          assert.ok((after.poison?.initialDamage??0)>0);
          assert.equal(after.poison?.tickIntervalMs,6000);
          assert.equal(after.poison?.damagePerTick,Math.max(1,Math.round((after.poison?.initialDamage??0)*0.5)));
          break;
        case 'nature-force':
          assert.equal(after.natureForce?.battlePersistent,true);
          break;
        case 'ashes':
          assert.ok(after.healingBlockedMs>0);
          break;
        case 'curse-eye':
          assert.ok(after.petrifiedMs>0);
          break;
        case 'blindness':
          assert.ok((after.blind?.magicHitModifier??0)<0);
          assert.ok((after.blind?.rangeReductionCells??0)>=1);
          break;
        case 'cursed-sword':
          assert.equal(after.cursedSword?.nextPhysicalDamageMultiplier,2);
          break;
      }
    }
  }
});

test('S37 applies the approved/candidate M7.1 MP curves without claiming retail formulas',()=>{
  assert.deepEqual([1,2,3,4,5,6].map(level=>m7WizardSkillLevel('dark-veil',level).mpCost),[20,20,25,25,30,35]);
  assert.deepEqual([1,2,3,4,5,6].map(level=>m7WizardSkillLevel('poison-mist',level).mpCost),[20,25,30,35,40,50]);
  assert.deepEqual([1,2,3,4,5,6].map(level=>m7WizardSkillLevel('ashes',level).mpCost),[27,33,39,45,51,60]);
  assert.deepEqual([1,2,3,4,5,6].map(level=>m7WizardSkillLevel('curse-eye',level).mpCost),[18,23,30,36,43,49]);
  assert.deepEqual([1,2,3,4,5,6].map(level=>[
    m7WizardSkillLevel('dark-veil',level).rangeCells,
    m7WizardSkillLevel('dark-veil',level).areaCode,
  ]),[[2,0],[2,0],[3,1],[3,1],[4,2],[4,2]]);
});

test('S37 poison is immediate damage followed by fixed 50% DOT at the 6-second cadence',()=>{
  assert.equal(M7_WIZARD_RUNTIME_POLICY.poisonTickIntervalMs,6000);
  assert.equal(M7_WIZARD_RUNTIME_POLICY.poisonFollowupDamageRatio,0.5);
  const profile=m7WizardPoisonDamageProfile(6,100);
  assert.deepEqual(profile,{
    initialDamage:33,
    followupDamage:17,
    tickIntervalMs:6000,
    followupTicks:6,
  });

  const {state,x,y}=battle();
  const first=place(state.enemies[0]!,'poison-a',[13,9],0);
  const second=place(state.enemies[1]!,'poison-b',[15,11],0);
  const center:M7GridCell=[14,10];
  const hpBefore=new Map([[first.id,first.hp],[second.id,second.hp]]);

  const cast=useM7SkillTargeted(state,{targetCell:center},x,y,wizardCommand('poison-mist',1,'enemy-area'));
  assert.equal(cast.ok,true);
  assert.deepEqual([...cast.affectedEnemyIds].sort(),['poison-a','poison-b']);
  assert.equal(cast.events.length,2);
  for(const enemy of [first,second]){
    assert.ok(enemy.hp<(hpBefore.get(enemy.id)??0),'poison must damage immediately');
    assert.ok(enemy.m7Status.wizard.poison);
    assert.equal(
      enemy.m7Status.wizard.poison?.damagePerTick,
      Math.max(1,Math.round((enemy.m7Status.wizard.poison?.initialDamage??0)*0.5)),
    );
  }
  for(const raw of cast.events){
    const event=raw as M7BattleFeedbackEvent;
    assert.equal(event.effect,'POISON_INITIAL_DAMAGE');
    assert.equal(event.eventTimeMs,0);
    assert.ok(event.targetCell);
  }
  assert.deepEqual(
    cast.feedbackEvents?.map(event=>[event.targetId,event.kind,event.eventTimeMs]).sort(),
    [['poison-a','POISON_INITIAL_DAMAGE',0],['poison-b','POISON_INITIAL_DAMAGE',0]],
  );

  assert.equal(tickM7BattleStatuses(state,5999).length,0);
  const ticks=tickM7BattleStatuses(state,1);
  assert.equal(ticks.length,2);
  for(const raw of ticks){
    const event=raw as M7BattleFeedbackEvent;
    assert.equal(event.effect,'POISON_TICK');
    assert.equal(event.eventTimeMs,6000);
    assert.ok(event.targetCell);
  }
});

test('S37 high-level Dark Veil grows from single target into area accuracy denial',()=>{
  const {state,x,y}=battle();
  const first=place(state.enemies[0]!,'veil-a',[12,10],0);
  const second=place(state.enemies[1]!,'veil-b',[13,10],0);
  const far=cloneEnemy(first,'veil-far',[18,10],0);
  state.enemies.push(far);

  const cast=useM7SkillTargeted(
    state,
    {targetId:first.id},
    x,
    y,
    wizardCommand('dark-veil',6,'enemy'),
  );
  assert.equal(cast.ok,true);
  assert.deepEqual([...cast.affectedEnemyIds].sort(),['veil-a','veil-b']);
  assert.ok(first.m7Status.wizard.darkVeil);
  assert.ok(second.m7Status.wizard.darkVeil);
  assert.equal(far.m7Status.wizard.darkVeil,null);
  assert.ok(cast.feedbackEvents?.every(event=>event.kind==='DARK_VEIL_APPLIED'));
});

test('S37 Nature Force persists for the battle and still drains only small historical-range MP',()=>{
  let status=applyM7WizardSkillStatus(createM7WizardStatusState(),'nature-force',6);
  status=tickM7WizardStatus(status,10*60*1000).state;
  assert.equal(status.natureForce?.battlePersistent,true);
  const drained=applyM7NatureForceStaffHit(status,0,100,100,0.99);
  assert.equal(drained.drained,3);
  assert.equal(drained.casterMp,3);
  assert.equal(drained.targetMp,97);
});
