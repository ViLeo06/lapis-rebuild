import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playableClassById,skillAvailableForClass,isEquipmentCompatibleWithClass,reconcileEquipmentForClass,serializableClassSnapshot} from '../src/content/classes/class-catalog.ts';
import {skillById,skillsForFamily} from '../src/content/skills/skill-catalog.ts';

test('swordsman has authored base stats, melee identity and three explicit showcase skills',()=>{
  const c=playableClassById(100);
  assert.equal(c.displayName,'见习剑士');
  assert.equal(c.family,'swordsman');
  assert.deepEqual(c.baseAuthoredStats,{hp:125,mp:100,move:5,hit:160,magicHit:160,range:1,stageEntrySkillId:1101});
  assert.equal(c.normalAttackProfile.identity,'melee');
  assert.equal(c.normalAttackProfile.rangeCells,1);
  assert.equal(c.normalAttackProfile.damageFormula,null);
  assert.deepEqual(c.availableSkillIds,[1101,1201,1301]);
  const hit=c.actionAnimationMapping.find(action=>action.semantic==='hit-reaction');
  assert.equal(hit?.slot,'03');
  assert.equal(hit?.semanticEvidence.level,'VERIFIED');
});

test('wizard has authored base stats, staff-melee normal attack and distinct showcase magic',()=>{
  const c=playableClassById(109);
  assert.equal(c.displayName,'见习巫师');
  assert.equal(c.family,'wizard');
  assert.deepEqual(c.baseAuthoredStats,{hp:100,mp:130,move:4,hit:160,magicHit:160,range:1,stageEntrySkillId:19101});
  assert.equal(c.normalAttackProfile.identity,'staff-melee');
  assert.deepEqual(c.availableSkillIds,[19101,19201,19301]);
  assert.deepEqual(skillsForFamily('wizard').map(skill=>skill.skillId),[19101,19201,19301]);
});

test('class equipment compatibility is explicit and cross-class items are rejected',()=>{
  for(const id of [1,3])assert.equal(isEquipmentCompatibleWithClass(100,id,'weapon'),true);
  assert.equal(isEquipmentCompatibleWithClass(100,25,'armor'),true);
  for(const id of [10,12,31])assert.equal(isEquipmentCompatibleWithClass(100,id),false);
  for(const id of [10,12])assert.equal(isEquipmentCompatibleWithClass(109,id,'weapon'),true);
  assert.equal(isEquipmentCompatibleWithClass(109,31,'armor'),true);
  for(const id of [1,3,25])assert.equal(isEquipmentCompatibleWithClass(109,id),false);
  assert.equal(playableClassById(100).allowedEquipment.provenance.level,'RECONSTRUCTION_POLICY');
});

test('skill availability is class-driven instead of numeric runtime branching',()=>{
  for(const id of [1101,1201,1301])assert.equal(skillAvailableForClass(100,id),true);
  for(const id of [19101,19201,19301])assert.equal(skillAvailableForClass(109,id),true);
  assert.equal(skillAvailableForClass(100,19101),false);
  assert.equal(skillAvailableForClass(109,1101),false);
});

test('MP cost, authored range and Magicptn effect references stay data-driven',()=>{
  const expected:[number,number,number,number][]=[
    [1101,25,1,1],[1201,23,1,2],[1301,20,0,3],
    [19101,20,2,181],[19201,20,4,182],[19301,20,0,183],
  ];
  for(const [id,mp,range,pattern] of expected){
    const skill=skillById(id);
    assert.equal(skill.mpCost,mp);
    assert.equal(skill.range,range);
    assert.equal(skill.effectReference.magicPatternId,pattern);
    assert.equal(skill.provenance.authoredRow.level,'VERIFIED');
    assert.equal(skill.provenance.gameplayBehavior.level,'RECONSTRUCTION_POLICY');
  }
  assert.deepEqual(skillById(19201).effectReference.magicResourceIds,[36,35]);
});

test('target types are explicit policies and preserve authored area separately',()=>{
  assert.equal(skillById(1101).targetType,'enemy');
  assert.equal(skillById(1301).targetType,'self');
  assert.equal(skillById(19201).targetType,'enemy-area');
  assert.equal(skillById(19201).authored.area,1);
  assert.equal(skillById(19201).provenance.targetType.level,'RECONSTRUCTION_POLICY');
});

test('class switch reconciles incompatible equipment without deleting ownership state',()=>{
  const before={weapon:3,armor:25} as const;
  assert.deepEqual(reconcileEquipmentForClass(before,100),before);
  assert.deepEqual(reconcileEquipmentForClass(before,109),{weapon:null,armor:null});
  const wizard={weapon:12,armor:31} as const;
  assert.deepEqual(reconcileEquipmentForClass(wizard,109),wizard);
  assert.deepEqual(reconcileEquipmentForClass(wizard,100),{weapon:null,armor:null});
});

test('class and skill definitions remain save-safe JSON data and do not invent damage formulas',()=>{
  const payload={classes:serializableClassSnapshot(),skills:[1101,1201,1301,19101,19201,19301].map(skillById)};
  const roundTrip=JSON.parse(JSON.stringify(payload));
  assert.deepEqual(roundTrip,payload);
  assert.equal(payload.classes.every(c=>c.normalAttackProfile.damageFormula===null),true);
  for(const skill of payload.skills)assert.equal('damage' in skill,false);
});
