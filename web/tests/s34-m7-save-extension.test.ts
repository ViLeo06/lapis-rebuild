import test from 'node:test';
import assert from 'node:assert/strict';
import {createInventory} from '../src/progression/inventory.ts';
import {RECONSTRUCTION_PROGRESSION_POLICY,totalExpForLevel} from '../src/progression/progression.ts';
import {CURRENT_SAVE_VERSION,SAVE_KIND,validateSaveV2} from '../src/progression/save-schema.ts';
import type {SaveV2,SaveValidationContext} from '../src/progression/save-schema.ts';
import {M6_CHARACTER_IDS,M6_SAVE_CONTENT} from '../src/m6-runtime-content.ts';
import {migrateSaveToM7,serializeM7SaveV2} from '../src/progression/m7-save-migration.ts';
import {createM7SaveExtension} from '../src/progression/m7-save-extension.ts';
import {createM7DeveloperSkillState,m7RuntimeSkillCommands} from '../src/training/m7-skill-progression.ts';
import {createM7WizardSkillBook,upgradeM7WizardSkill} from '../src/content/skills/wizard-seven-stage.ts';
import {attachM7WizardSkillBookToSaveV2} from '../src/content/skills/wizard-seven-stage-save.ts';

const context:SaveValidationContext={
  pack:'pack',
  characters:M6_CHARACTER_IDS,
  mapBounds:{0:{width:100,height:100}},
};

function base(character:string,level:number):SaveV2{
  return validateSaveV2({
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
  },context);
}

test('S34 migrates a legacy M6-compatible SaveV2 into a normal M7 swordsman skill extension',()=>{
  const save=migrateSaveToM7(base('100',1),context,M6_SAVE_CONTENT);
  assert.equal(save.m7.family,'swordsman');
  assert.deepEqual(m7RuntimeSkillCommands(save.m7.skills,'100',1).map(row=>row.id),['swordsman:1101']);
  const json=serializeM7SaveV2(save,context,M6_SAVE_CONTENT);
  const loaded=migrateSaveToM7(JSON.parse(json),context,M6_SAVE_CONTENT);
  assert.deepEqual(loaded.m7,save.m7);
});

test('S34 migrates the temporary S32 quest payload into top-level SaveV2.m7',()=>{
  let book=createM7WizardSkillBook(6);
  book=upgradeM7WizardSkill(book,6,'dark-veil');
  book=upgradeM7WizardSkill(book,6,'poison-mist');
  const legacy=attachM7WizardSkillBookToSaveV2(base('119',6),book,context);
  const save=migrateSaveToM7(legacy,context,M6_SAVE_CONTENT);
  assert.equal(save.m7.family,'wizard');
  assert.deepEqual(save.m7.skills.family==='wizard'?save.m7.skills.wizard:undefined,book);
  assert.deepEqual(m7RuntimeSkillCommands(save.m7.skills,'119',6).map(row=>row.id),['wizard:dark-veil','wizard:poison-mist']);
});

test('Developer all-skills state cannot enter normal SaveV2.m7',()=>{
  const dev=createM7DeveloperSkillState('160',56);
  assert.throws(()=>createM7SaveExtension('160',56,dev));
});


test('S34 M7 SaveV2 persists current HP/MP and keeps legacy saves migratable',()=>{
  const normal=createM7SaveExtension('100',6,undefined,{hp:123,mp:45});
  assert.deepEqual(normal.vitals,{hp:123,mp:45});
  const legacy=migrateSaveToM7(base('100',6),context,M6_SAVE_CONTENT);
  assert.equal(legacy.m7.vitals,null);
  const withVitals={...legacy,m7:createM7SaveExtension('100',6,legacy.m7.skills,{hp:77,mp:33})};
  const roundTrip=migrateSaveToM7(JSON.parse(serializeM7SaveV2(withVitals,context,M6_SAVE_CONTENT)),context,M6_SAVE_CONTENT);
  assert.deepEqual(roundTrip.m7.vitals,{hp:77,mp:33});
});
