import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NPC350_PORTRAIT_MAPPING,NpcVisualCatalog,resolveNpcVisualBinding,type NpcVisualArchetype} from '../src/npc/npc-visual-catalog.ts';

const visual:NpcVisualArchetype={
  visualId:'npc-visual-b5000',
  characterResourceId:5000,
  sourceFamily:'CHAR_BODY_ANI_SPR',
  actions:[],
  anchor:{x:0,y:0,evidence:'UNVERIFIED'},
  provenance:{source:'synthetic S16 unit fixture',evidence:'UNVERIFIED'},
};

test('NpcVisualCatalog is keyed by explicit presentation id',()=>{
  const catalog=new NpcVisualCatalog([visual]);
  assert.equal(catalog.require('npc-visual-b5000').characterResourceId,5000);
  assert.throws(()=>catalog.require('5000'));
});

test('world binding must explicitly name visual id and never falls back to NPCScript-style numbers',()=>{
  const catalog=new NpcVisualCatalog([visual]);
  const resolved=resolveNpcVisualBinding(catalog,{
    worldEntityKey:'map:0/entity:guide',
    visualId:'npc-visual-b5000',
    provenance:{source:'synthetic coordinator binding',evidence:'RECONSTRUCTION_POLICY'},
  });
  assert.equal(resolved.visualId,'npc-visual-b5000');
  assert.throws(()=>resolveNpcVisualBinding(catalog,{
    worldEntityKey:'5000',
    visualId:'5000',
    provenance:{source:'forbidden numeric-equality shortcut',evidence:'UNVERIFIED'},
  }));
});

test('NPC350 runtime portrait source mapping is bounded to the verified 100..149 range',()=>{
  assert.equal(NPC350_PORTRAIT_MAPPING.npcPortraitIdMin,100);
  assert.equal(NPC350_PORTRAIT_MAPPING.npcPortraitIdMax,149);
  assert.equal(NPC350_PORTRAIT_MAPPING.resource,'NRes/NPC350.Tip');
  assert.equal(NPC350_PORTRAIT_MAPPING.evidence,'VERIFIED_STATIC_ORIGINAL');
});
