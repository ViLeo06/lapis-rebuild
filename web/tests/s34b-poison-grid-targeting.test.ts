import test from 'node:test';
import assert from 'node:assert/strict';

import {beginBattle} from '../src/battle.ts';
import {referenceCellToScreen} from '../src/coordinates.ts';
import {createM7WizardStatusState} from '../src/content/skills/wizard-seven-stage-runtime.ts';
import {m7WizardSkillLevel} from '../src/content/skills/wizard-seven-stage.ts';
import {
  affectedM7GridTargets,
  beginM7SkillTargeting,
  cancelM7SkillTargeting,
  confirmedM7TargetCell,
  createM7SkillTargetingState,
  enumerateM7DiamondArea,
  hoverM7SkillTargeting,
  m7OriginalAreaCellCount,
  m7PoisonGeometry,
  tapM7SkillTargeting,
  validateM7CastCell,
} from '../src/combat/m7-grid-targeting.ts';
import {useM7SkillTargeted} from '../src/combat/m7-battle-skills.ts';
import type {M7RuntimeSkillCommand} from '../src/training/m7-skill-progression.ts';
import type {Enemy} from '../src/battle.ts';
import type {M7GridCell} from '../src/combat/m7-grid-targeting.ts';

const casterCell:M7GridCell=[10,10];

function poisonCommand(level:1|2|3|4|5|6):M7RuntimeSkillCommand{
  const row=m7WizardSkillLevel('poison-mist',level);
  return Object.freeze({
    id:'wizard:poison-mist',
    family:'wizard',
    skillKey:'poison-mist',
    authoredSkillId:19201,
    displayName:'毒雾',
    skillLevel:level,
    mpCost:row.mpCost,
    readinessCost:row.readinessCost,
    target:'enemy-area',
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

function poisonBattle(){
  const [x,y]=referenceCellToScreen(casterCell);
  const state=beginBattle(x,y);
  return {state,x,y};
}

test('S34B original Area 1/2/3/4 enumerate 5/13/25/41 diamond cells',()=>{
  const expected:[[number,number],[number,number],[number,number],[number,number]]=[
    [1,5],[2,13],[3,25],[4,41],
  ];
  for(const [area,cells] of expected){
    assert.equal(m7OriginalAreaCellCount(area),cells);
    assert.equal(enumerateM7DiamondArea([20,20],area).length,cells);
  }
});

test('S34B poison cast distance validates exact 4/5/6-cell boundaries',()=>{
  assert.equal(validateM7CastCell(casterCell,[14,10],4).ok,true);
  assert.equal(validateM7CastCell(casterCell,[15,9],4).ok,false);
  assert.equal(validateM7CastCell(casterCell,[15,9],5).ok,true);
  assert.equal(validateM7CastCell(casterCell,[16,10],5).ok,false);
  assert.equal(validateM7CastCell(casterCell,[16,10],6).ok,true);
  assert.equal(validateM7CastCell(casterCell,[17,9],6).ok,false);
});

test('S34B poison Lv1-Lv6 geometry matches the fixed-hash Magictbl authority',()=>{
  const expected=[
    [1,4,1,5],
    [2,4,1,5],
    [3,5,2,13],
    [4,5,2,13],
    [5,6,2,13],
    [6,6,3,25],
  ] as const;
  for(const [level,distance,areaCode,areaCells] of expected){
    const authority=m7PoisonGeometry(level);
    assert.deepEqual(
      [authority.level,authority.castDistance,authority.areaCode,authority.areaCells],
      [level,distance,areaCode,areaCells],
    );
    const manifest=m7WizardSkillLevel('poison-mist',level);
    assert.equal(manifest.rangeCells,distance);
    assert.equal(manifest.areaCode,areaCode);
    assert.equal(manifest.areaCells,areaCells);
  }
});

test('S34B target center may be empty; all in-area active-cluster enemies are affected and outsiders are not',()=>{
  const {state,x,y}=poisonBattle();
  const first=place(state.enemies[0]!,'inside-a',[13,9],0);
  const second=place(state.enemies[1]!,'inside-b',[15,11],0);
  const outside=cloneEnemy(first,'outside',[16,10],0);
  const otherCluster=cloneEnemy(first,'other-cluster',[13,9],1);
  state.enemies.push(outside,otherCluster);

  const center:M7GridCell=[14,10];
  assert.equal(state.enemies.some(enemy=>{
    const [px,py]=referenceCellToScreen(center);
    return enemy.x===px&&enemy.y===py;
  }),false,'target center must remain empty for this acceptance');

  const previewTargets=affectedM7GridTargets(state.enemies,center,1,0);
  assert.deepEqual(previewTargets.map(enemy=>enemy.id).sort(),['inside-a','inside-b']);

  const beforeOutside=outside.m7Status.wizard.poison;
  const beforeOther=otherCluster.m7Status.wizard.poison;
  const cast=useM7SkillTargeted(state,{targetCell:center},x,y,poisonCommand(1));
  assert.equal(cast.ok,true);
  assert.deepEqual([...cast.affectedEnemyIds].sort(),['inside-a','inside-b']);
  assert.ok(first.m7Status.wizard.poison);
  assert.ok(second.m7Status.wizard.poison);
  assert.equal(outside.m7Status.wizard.poison,beforeOutside);
  assert.equal(otherCluster.m7Status.wizard.poison,beforeOther);
});

test('S34B preview and cancel are pure UI state; confirm is the only step that executes battle authority',()=>{
  const {state,x,y}=poisonBattle();
  place(state.enemies[0]!,'inside',[13,9],0);
  place(state.enemies[1]!,'far',[20,10],0);
  const center:M7GridCell=[14,10];
  const mpBefore=state.mp;
  const actionBefore=state.action;

  const idle=createM7SkillTargetingState();
  const aiming=beginM7SkillTargeting('wizard:poison-mist');
  const hovered=hoverM7SkillTargeting(aiming,center);
  assert.equal(idle.phase,'idle');
  assert.equal(hovered.phase,'aiming');
  assert.deepEqual(hovered.previewCell,center);
  assert.equal(state.mp,mpBefore);
  assert.equal(state.action,actionBefore);
  assert.equal(state.enemies[0]!.m7Status.wizard.poison,null);

  const cancelled=cancelM7SkillTargeting(hovered);
  assert.equal(cancelled.phase,'cancelled');
  assert.equal(confirmedM7TargetCell(cancelled),null);
  assert.equal(state.mp,mpBefore);
  assert.equal(state.action,actionBefore);

  let mobile=beginM7SkillTargeting('wizard:poison-mist');
  mobile=tapM7SkillTargeting(mobile,center);
  assert.equal(mobile.phase,'aiming','first mobile tap previews only');
  mobile=tapM7SkillTargeting(mobile,[12,10]);
  assert.equal(mobile.phase,'aiming','tap on another cell moves preview');
  assert.deepEqual(mobile.previewCell,[12,10]);
  mobile=tapM7SkillTargeting(mobile,center);
  assert.equal(mobile.phase,'aiming');
  mobile=tapM7SkillTargeting(mobile,center);
  assert.equal(mobile.phase,'confirmed','second tap on the same cell confirms');
  const confirmed=confirmedM7TargetCell(mobile);
  assert.deepEqual(confirmed,center);

  const cast=useM7SkillTargeted(state,{targetCell:confirmed},x,y,poisonCommand(1));
  assert.equal(cast.ok,true);
  assert.ok(state.mp<mpBefore);
  assert.ok(state.action<actionBefore);
  assert.ok(state.enemies[0]!.m7Status.wizard.poison);
});

test('S34B invalid or cancelled poison selection never consumes MP/readiness',()=>{
  const {state,x,y}=poisonBattle();
  place(state.enemies[0]!,'inside',[13,9],0);
  place(state.enemies[1]!,'far',[20,10],0);
  const mpBefore=state.mp;
  const actionBefore=state.action;

  const missing=useM7SkillTargeted(state,{targetCell:null},x,y,poisonCommand(1));
  assert.equal(missing.ok,false);
  assert.match(missing.message,/施法格/);
  assert.equal(state.mp,mpBefore);
  assert.equal(state.action,actionBefore);

  const tooFar=useM7SkillTargeted(state,{targetCell:[17,9]},x,y,poisonCommand(1));
  assert.equal(tooFar.ok,false);
  assert.match(tooFar.message,/超出技能射程/);
  assert.equal(state.mp,mpBefore);
  assert.equal(state.action,actionBefore);
});
