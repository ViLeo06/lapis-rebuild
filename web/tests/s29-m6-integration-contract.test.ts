import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

type Contract={
  schema:string;
  owner:string;
  stage_families:{swordsman:number[];wizard:number[]};
  upstream_handoffs:Array<{session:string;integration_note:string;required:boolean;status:string}>;
  shared_runtime_owned_by_s29:string[];
  current_baseline_constraints:{playable_class_catalog_ids:number[];runtime_save_character_ids:string[];progression_scope:string;save_shape:string;equipment_slots:string[];quest_model:string};
  progression_proof:{normal_game_entry_required:boolean;disallowed_shortcuts:string[];acceptable_acceleration:string[]};
  save_migration:{baseline_kind:string;baseline_version:number;must_load_m5_1_savev2:boolean;must_preserve:string[];future_or_unknown_schema:string;version_bump_decision:string};
  m5_1_regression_gates:string[];
  m6_acceptance_gates:string[];
};

const contract=JSON.parse(readFileSync(new URL('../../manifests/m6-integration-acceptance-contract.json',import.meta.url),'utf8')) as Contract;

test('S29 contract locks the two ten-stage families in canonical order',()=>{
  assert.deepEqual(contract.stage_families.swordsman,[100,110,120,130,140,150,160,170,180,190]);
  assert.deepEqual(contract.stage_families.wizard,[109,119,129,139,149,159,169,179,189,199]);
  for(const ids of Object.values(contract.stage_families)){
    assert.equal(new Set(ids).size,10);
    assert.deepEqual([...ids].sort((a,b)=>a-b),ids);
  }
});

test('S29 records all four upstream handoffs before final acceptance',()=>{
  assert.equal(contract.owner,'S29');
  assert.deepEqual(contract.upstream_handoffs.map(row=>row.session),['S25','S26','S27','S28']);
  assert.ok(contract.upstream_handoffs.every(row=>row.required));
  assert.ok(contract.upstream_handoffs.every(row=>row.integration_note.startsWith('docs/integration-notes/')));
  assert.ok(contract.shared_runtime_owned_by_s29.includes('web/src/main.ts'));
  assert.ok(contract.shared_runtime_owned_by_s29.includes('web/src/scene.ts'));
  assert.ok(contract.shared_runtime_owned_by_s29.includes('web/src/battle.ts'));
  assert.ok(contract.shared_runtime_owned_by_s29.includes('web/src/m4-runtime-integration.ts'));
});

test('S29 integrated contract records the resolved M6 runtime shape',()=>{
  const expected=[100,110,120,130,140,150,160,170,180,190,109,119,129,139,149,159,169,179,189,199];
  assert.deepEqual(contract.current_baseline_constraints.playable_class_catalog_ids,expected);
  assert.deepEqual(contract.current_baseline_constraints.runtime_save_character_ids,expected.map(String));
  assert.equal(contract.current_baseline_constraints.progression_scope,'single-active-profession-per-save');
  assert.equal(contract.current_baseline_constraints.save_shape,'SaveV2-plus-M6-extension-stage-quest-equipment');
  assert.deepEqual(contract.current_baseline_constraints.equipment_slots,['weapon','armor','accessory-domain-placeholder']);
});

test('M6 stage proof must use production progression authority rather than direct mutation',()=>{
  assert.equal(contract.progression_proof.normal_game_entry_required,true);
  assert.ok(contract.progression_proof.disallowed_shortcuts.includes('direct-memory-stage-mutation'));
  assert.ok(contract.progression_proof.disallowed_shortcuts.includes('raw-save-edit-as-acceptance-proof'));
  assert.ok(contract.progression_proof.acceptable_acceleration.length>=1);
});

test('M5.1 SaveV2 compatibility remains a hard M6 gate',()=>{
  assert.equal(contract.save_migration.baseline_kind,'lapis-rebuild-save');
  assert.equal(contract.save_migration.baseline_version,2);
  assert.equal(contract.save_migration.must_load_m5_1_savev2,true);
  for(const field of ['class-stage-state','inventory','equipment','quest-state','progression','reward-and-progression-receipts']){
    assert.ok(contract.save_migration.must_preserve.includes(field),`missing save preservation gate ${field}`);
  }
});

test('M6 cannot close without M5.1 regressions, new soak, and user playtest',()=>{
  for(const gate of ['npc-pointer','keyboard-e','mobile-touch','camera-delayed-centering','retreat-confirmation','developer-diagnostics-default-hidden','standalone-offline']){
    assert.ok(contract.m5_1_regression_gates.includes(gate),`missing M5.1 regression gate ${gate}`);
  }
  assert.ok(contract.m6_acceptance_gates.includes('new-m6-wall-clock-soak'));
  assert.equal(contract.m6_acceptance_gates.at(-1),'user-playtest');
});
