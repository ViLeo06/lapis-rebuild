import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMonsterVisualArchetype,MonsterVisualCatalog,S17_MONSTER_VISUALS,
  S17_MONSTER_VISUAL_CATALOG,S17_RECONSTRUCTION_TRAINING_BINDINGS,
} from '../src/content/monsters/monster-visual-catalog.ts';

test('catalog preserves evidence boundaries for action semantics',()=>{
  const row=createMonsterVisualArchetype({visualId:'monster-visual-099',sourceNumericId:9999,availableSlots:['00','01','02','03','05']});
  assert.equal(row.actions.hit.slot,'03');
  assert.equal(row.actions.hit.provenance,'VERIFIED_STATIC_ORIGINAL');
  assert.equal(row.actions.attack.provenance,'RECOVERED_SECONDARY');
  assert.equal(row.actions.death.slot,null);
  assert.equal(row.actions.death.provenance,'UNVERIFIED');
  assert.equal(row.directionSemantics,'RAW_ROWS_UNIVERSAL_ORDER_UNVERIFIED');
});

test('catalog requires explicit visual id and never binds by numeric equality',()=>{
  const row=createMonsterVisualArchetype({visualId:'monster-visual-099',sourceNumericId:4524,availableSlots:['00','03']});
  const catalog=new MonsterVisualCatalog([row]);
  assert.equal(catalog.resolve({battleUnitKey:'4524',visualId:'monster-visual-099',provenance:'RECONSTRUCTION_POLICY',basis:'manual coordinator binding'}),row);
  assert.throws(()=>catalog.require('4524'));
});

test('S17 exposes four manually reviewed original-client visual archetypes',()=>{
  assert.deepEqual(S17_MONSTER_VISUALS.map(row=>row.sourceFamily),['B4524','B4525','B4526','B4544']);
  for(const row of S17_MONSTER_VISUALS){
    assert.equal(row.identityProvenance,'VERIFIED_MANUAL_VISUAL');
    assert.equal(row.directionSemantics,'RECOVERED_SECONDARY_BODY_ROW_ORDER');
    assert.equal(row.actions.hit.provenance,'VERIFIED_STATIC_ORIGINAL');
    assert.equal(row.actions.death.slot,null);
    assert.equal(S17_MONSTER_VISUAL_CATALOG.require(row.visualId),row);
  }
});

test('training enemy bindings are explicit reconstruction policy',()=>{
  assert.deepEqual(S17_RECONSTRUCTION_TRAINING_BINDINGS.map(row=>row.battleUnitKey),['dummy-melee','dummy-ranged']);
  assert.deepEqual(S17_RECONSTRUCTION_TRAINING_BINDINGS.map(row=>row.visualId),['monster-visual-001','monster-visual-004']);
  for(const binding of S17_RECONSTRUCTION_TRAINING_BINDINGS){
    assert.equal(binding.provenance,'RECONSTRUCTION_POLICY');
    assert.ok(S17_MONSTER_VISUAL_CATALOG.resolve(binding));
  }
});

test('duplicate visual ids are rejected',()=>{
  const row=createMonsterVisualArchetype({visualId:'monster-visual-099',sourceNumericId:1,availableSlots:['03']});
  assert.throws(()=>new MonsterVisualCatalog([row,row]));
});
