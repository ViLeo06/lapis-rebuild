import test from 'node:test';
import assert from 'node:assert/strict';
import {createMonsterVisualArchetype,MonsterVisualCatalog} from '../src/content/monsters/monster-visual-catalog.ts';

test('catalog preserves evidence boundaries for action semantics',()=>{
  const row=createMonsterVisualArchetype({visualId:'monster-visual-001',sourceNumericId:4524,availableSlots:['00','01','02','03','05']});
  assert.equal(row.actions.hit.slot,'03');
  assert.equal(row.actions.hit.provenance,'VERIFIED_STATIC_ORIGINAL');
  assert.equal(row.actions.attack.provenance,'RECOVERED_SECONDARY');
  assert.equal(row.actions.death.slot,null);
  assert.equal(row.actions.death.provenance,'UNVERIFIED');
  assert.equal(row.directionSemantics,'RAW_ROWS_UNIVERSAL_ORDER_UNVERIFIED');
});

test('catalog requires explicit visual id and never binds by numeric equality',()=>{
  const row=createMonsterVisualArchetype({visualId:'monster-visual-001',sourceNumericId:4524,availableSlots:['00','03']});
  const catalog=new MonsterVisualCatalog([row]);
  assert.equal(catalog.resolve({battleUnitKey:'4524',visualId:'monster-visual-001',provenance:'RECONSTRUCTION_POLICY',basis:'manual coordinator binding'}),row);
  assert.throws(()=>catalog.require('4524'));
});

test('duplicate visual ids are rejected',()=>{
  const row=createMonsterVisualArchetype({visualId:'monster-visual-001',sourceNumericId:1,availableSlots:['03']});
  assert.throws(()=>new MonsterVisualCatalog([row,row]));
});
