import {test} from 'node:test';
import assert from 'node:assert/strict';

import {
  M7_WIZARD_SKILLS,
  M7_WIZARD_SKILL_KEYS,
  M7_WIZARD_STAGE_RANGES,
  M7_WIZARD_RUNTIME_POLICY,
  createM7WizardSkillBook,
  developerM7WizardSkillBook,
  m7WizardAllowedSkillKeys,
  m7WizardSkillByKey,
  m7WizardSkillLevel,
  m7WizardStageForLevel,
  reconcileM7WizardSkillBookForLevel,
  upgradeM7WizardSkill,
  validateM7WizardSkillBook,
} from '../src/content/skills/wizard-seven-stage.ts';
import {
  applyM7WizardHealing,
  applyM7NatureForceStaffHit,
  applyM7WizardSkillStatus,
  consumeM7CursedSwordPhysicalWindow,
  createM7WizardStatusState,
  m7WizardAccuracyModifiers,
  m7WizardCanAct,
  m7WizardEffectiveRangeCells,
  m7WizardOrdinaryAttackTargetable,
  tickM7WizardStatus,
} from '../src/content/skills/wizard-seven-stage-runtime.ts';
import {
  attachM7WizardSkillBookToSaveV2,
  restoreM7WizardSkillBookFromSaveV2,
} from '../src/content/skills/wizard-seven-stage-save.ts';
import {createInventory} from '../src/progression/inventory.ts';
import {RECONSTRUCTION_PROGRESSION_POLICY,totalExpForLevel} from '../src/progression/progression.ts';
import {CURRENT_SAVE_VERSION,SAVE_KIND,serializeSaveV2,validateSaveV2} from '../src/progression/save-schema.ts';
import type {SaveV2,SaveValidationContext} from '../src/progression/save-schema.ts';

test('S32 locks the approved Lv1-65 seven-stage wizard axis',()=>{
  assert.deepEqual(
    M7_WIZARD_STAGE_RANGES.map(row=>[row.stage,row.classId,row.minLevel,row.maxLevel]),
    [
      [1,109,1,5],
      [2,119,6,15],
      [3,129,16,25],
      [4,139,26,35],
      [5,149,36,45],
      [6,159,46,55],
      [7,169,56,65],
    ],
  );
  for(const level of [1,5,6,15,16,25,26,35,36,45,46,55,56,65]){
    const row=m7WizardStageForLevel(level);
    assert.ok(level>=row.minLevel&&level<=row.maxLevel);
  }
  assert.throws(()=>m7WizardStageForLevel(0));
  assert.throws(()=>m7WizardStageForLevel(66));
});

test('S32 exposes seven skills and exactly 42 data-driven skill-level states',()=>{
  assert.equal(M7_WIZARD_SKILLS.length,7);
  assert.deepEqual(M7_WIZARD_SKILLS.map(skill=>skill.key),[...M7_WIZARD_SKILL_KEYS]);
  assert.equal(M7_WIZARD_SKILLS.reduce((sum,skill)=>sum+skill.levels.length,0),42);
  for(const skill of M7_WIZARD_SKILLS){
    assert.deepEqual(skill.levels.map(level=>level.level),[1,2,3,4,5,6]);
    assert.ok(skill.levels.every(level=>level.readinessCost===10));
  }
});

test('stage boundaries unlock only the intended cumulative wizard skills',()=>{
  const expected=[
    [1,['dark-veil']],
    [5,['dark-veil']],
    [6,['dark-veil','poison-mist']],
    [16,['dark-veil','poison-mist','nature-force']],
    [26,['dark-veil','poison-mist','nature-force','ashes']],
    [36,['dark-veil','poison-mist','nature-force','ashes','curse-eye']],
    [46,['dark-veil','poison-mist','nature-force','ashes','curse-eye','blindness']],
    [56,[...M7_WIZARD_SKILL_KEYS]],
    [65,[...M7_WIZARD_SKILL_KEYS]],
  ] as const;
  for(const [level,keys] of expected)assert.deepEqual(m7WizardAllowedSkillKeys(level),keys);
});

test('authored 19101-19501 identities stay distinct from historical-only stage 6/7 keys',()=>{
  const authored=[
    ['dark-veil',19101,'黑暗之帐'],
    ['poison-mist',19201,'毒雾'],
    ['nature-force',19301,'自然力量'],
    ['ashes',19401,'灰烬'],
    ['curse-eye',19501,'诅咒之眼'],
  ] as const;
  for(const [key,id,name] of authored){
    const skill=m7WizardSkillByKey(key);
    assert.equal(skill.authoredSkillId,id);
    assert.equal(skill.displayName,name);
    assert.equal(skill.evidence.identity,'VERIFIED-STATIC-ORIGINAL');
  }
  assert.equal(m7WizardSkillByKey('blindness').authoredSkillId,null);
  assert.equal(m7WizardSkillByKey('cursed-sword').authoredSkillId,null);
  assert.equal(m7WizardSkillByKey('blindness').evidence.clientId,'UNVERIFIED');
  assert.equal(m7WizardSkillByKey('cursed-sword').evidence.clientId,'UNVERIFIED');
});

test('normal skill points require stage legality while developer override exposes all Lv6',()=>{
  let book=createM7WizardSkillBook(1);
  assert.equal(book.unspentPoints,1);
  book=upgradeM7WizardSkill(book,1,'dark-veil');
  assert.equal(book.levels['dark-veil'],1);
  assert.equal(book.unspentPoints,0);
  assert.throws(()=>upgradeM7WizardSkill(book,1,'poison-mist'));
  const level6=reconcileM7WizardSkillBookForLevel(book,1,6);
  assert.equal(level6.unspentPoints,5);
  const dev=developerM7WizardSkillBook(1);
  assert.ok(M7_WIZARD_SKILL_KEYS.every(key=>dev.levels[key]===6));
  assert.throws(()=>validateM7WizardSkillBook(dev,1,false));
  assert.deepEqual(validateM7WizardSkillBook(dev,1,true),dev);
});

test('black veil is physical accuracy denial while blindness is stronger and also affects magic/range',()=>{
  let status=createM7WizardStatusState();
  status=applyM7WizardSkillStatus(status,'dark-veil',6);
  assert.deepEqual(m7WizardAccuracyModifiers(status),{physicalHitModifier:-0.4,magicHitModifier:0});
  assert.equal(m7WizardEffectiveRangeCells(4,status),4);
  status=applyM7WizardSkillStatus(status,'blindness',6);
  assert.deepEqual(m7WizardAccuracyModifiers(status),{physicalHitModifier:-1,magicHitModifier:-0.3});
  assert.equal(m7WizardEffectiveRangeCells(4,status),2);
});

test('poison mist scales with INT, deals fixed 50% follow-up damage, and ticks independently of actor actions',()=>{
  const low=applyM7WizardSkillStatus(createM7WizardStatusState(),'poison-mist',6,{intelligence:10});
  const high=applyM7WizardSkillStatus(createM7WizardStatusState(),'poison-mist',6,{intelligence:100});
  assert.equal(M7_WIZARD_RUNTIME_POLICY.poisonFollowupDamageRatio,0.5);
  assert.equal(M7_WIZARD_RUNTIME_POLICY.poisonTickIntervalMs,6000);
  assert.equal(high.poison?.initialDamage,33);
  assert.equal(high.poison?.damagePerTick,17);
  assert.ok((high.poison?.initialDamage??0)>(low.poison?.initialDamage??0));
  const first=tickM7WizardStatus(high,5999);
  assert.equal(first.poisonDamage,0);
  const second=tickM7WizardStatus(first.state,1);
  assert.equal(second.poisonDamage,high.poison?.damagePerTick);
  assert.equal(second.state.poison?.ticksRemaining,5);
});

test('poison keeps ticking while curse eye petrification prevents action and ordinary attacks',()=>{
  let status=applyM7WizardSkillStatus(createM7WizardStatusState(),'poison-mist',1,{intelligence:50});
  status=applyM7WizardSkillStatus(status,'curse-eye',6);
  assert.equal(m7WizardCanAct(status),false);
  assert.equal(m7WizardOrdinaryAttackTargetable(status),false);
  const tick=tickM7WizardStatus(status,6000);
  assert.ok(tick.poisonDamage>0);
  assert.equal(tick.state.petrifiedMs,9000);
});

test('nature force is battle-persistent and drains only available MP into available caster room',()=>{
  let status=applyM7WizardSkillStatus(createM7WizardStatusState(),'nature-force',6);
  const drained=applyM7NatureForceStaffHit(status,8,10,50,0.9);
  assert.deepEqual(drained,{casterMp:10,targetMp:48,drained:2},'caster room caps a Lv6 three-MP drain');
  status=tickM7WizardStatus(status,10*60*1000).state;
  assert.equal(status.natureForce?.battlePersistent,true);
  assert.deepEqual(applyM7NatureForceStaffHit(status,0,10,10,0.5),{casterMp:3,targetMp:7,drained:3});
});

test('ashes blocks HP recovery from any caller but leaves recovery available after expiry',()=>{
  let status=applyM7WizardSkillStatus(createM7WizardStatusState(),'ashes',1);
  assert.deepEqual(applyM7WizardHealing(status,40,100,30),{hp:40,applied:0,blocked:true});
  status=tickM7WizardStatus(status,20000).state;
  assert.deepEqual(applyM7WizardHealing(status,40,100,30),{hp:70,applied:30,blocked:false});
});

test('curse eye duration scales from five to fifteen seconds',()=>{
  assert.equal(m7WizardSkillLevel('curse-eye',1).durationMs,5000);
  assert.equal(m7WizardSkillLevel('curse-eye',6).durationMs,15000);
  let status=applyM7WizardSkillStatus(createM7WizardStatusState(),'curse-eye',1);
  assert.equal(m7WizardCanAct(status),false);
  status=tickM7WizardStatus(status,5000).state;
  assert.equal(m7WizardCanAct(status),true);
  assert.equal(m7WizardOrdinaryAttackTargetable(status),true);
});

test('cursed sword doubles one physical hit and then consumes the window',()=>{
  const status=applyM7WizardSkillStatus(createM7WizardStatusState(),'cursed-sword',6);
  const first=consumeM7CursedSwordPhysicalWindow(status,37);
  assert.equal(first.damage,74);
  assert.equal(first.multiplier,2);
  assert.equal(first.consumed,true);
  const second=consumeM7CursedSwordPhysicalWindow(first.state,37);
  assert.equal(second.damage,37);
  assert.equal(second.multiplier,1);
  assert.equal(second.consumed,false);
});

function saveAtLevel(level:number,character:string):{save:SaveV2;context:SaveValidationContext}{
  const context:SaveValidationContext={pack:'pack',characters:[character],mapBounds:{0:{width:100,height:100}}};
  const save:SaveV2={
    kind:SAVE_KIND,
    version:CURRENT_SAVE_VERSION,
    pack:'pack',
    character,
    mapId:0,
    x:32,
    y:32,
    gold:0,
    inventory:createInventory(),
    quest:{questId:'m5-training-house',stage:'active'},
    questFlags:{},
    progression:{level,exp:totalExpForLevel(level),policyId:RECONSTRUCTION_PROGRESSION_POLICY.id},
    rewardReceipts:[],
    savedAt:'2026-09-21T12:00:00Z',
  };
  return{save:validateSaveV2(save,context),context};
}

test('SaveV2 round-trip preserves legal wizard skill levels without changing legacy quest fields',()=>{
  const {save,context}=saveAtLevel(56,'169');
  let book=createM7WizardSkillBook(56);
  for(const key of M7_WIZARD_SKILL_KEYS){
    book=upgradeM7WizardSkill(book,56,key);
    book=upgradeM7WizardSkill(book,56,key);
  }
  const attached=attachM7WizardSkillBookToSaveV2(save,book,context);
  const serialized=serializeSaveV2(attached,context);
  const loaded=validateSaveV2(JSON.parse(serialized),context);
  const restored=restoreM7WizardSkillBookFromSaveV2(loaded,context);
  assert.deepEqual(restored,book);
  assert.equal((loaded.quest as Record<string,unknown>).questId,'m5-training-house');
  assert.equal((loaded.quest as Record<string,unknown>).stage,'active');
});

test('old SaveV2 without S32 payload remains compatible and restores a legal empty skill book',()=>{
  const {save,context}=saveAtLevel(26,'139');
  const restored=restoreM7WizardSkillBookFromSaveV2(save,context);
  assert.deepEqual(restored,createM7WizardSkillBook(26));
});

test('developer all-skills override is explicitly rejected by normal SaveV2 persistence',()=>{
  const {save,context}=saveAtLevel(56,'169');
  assert.throws(()=>attachM7WizardSkillBookToSaveV2(save,developerM7WizardSkillBook(56),context));
});
