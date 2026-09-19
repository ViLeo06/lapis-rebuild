import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inflatePointerBounds,pickWorldPointerTarget,unionPointerBounds} from '../src/input/world-pointer-arbitration.ts';

test('S22 pointer bounds include sprite/label union and retain a compact minimum target',()=>{
  const merged=unionPointerBounds(
    {left:100,top:120,right:124,bottom:162},
    {left:94,top:102,right:130,bottom:116},
  );
  assert.deepEqual(merged,{left:94,top:102,right:130,bottom:162});
  const hit=inflatePointerBounds(merged,6,32,48);
  assert.deepEqual(hit,{left:88,top:96,right:136,bottom:168});
});

test('S22 NPC target consumes pointer before map movement candidates',()=>{
  const targets=[
    {id:'training-guide',kind:'npc' as const,visible:true,bounds:{left:90,top:90,right:130,bottom:150},depth:10},
    {id:'encounter-preview',kind:'encounter' as const,visible:true,bounds:{left:90,top:90,right:130,bottom:150},depth:12},
  ];
  assert.equal(pickWorldPointerTarget({x:110,y:120},targets)?.id,'training-guide');
  assert.equal(pickWorldPointerTarget({x:20,y:20},targets),null);
});

test('S22 ignores hidden targets and resolves overlapping NPCs by render depth',()=>{
  const targets=[
    {id:'hidden',kind:'npc' as const,visible:false,bounds:{left:0,top:0,right:100,bottom:100},depth:99},
    {id:'rear',kind:'npc' as const,visible:true,bounds:{left:0,top:0,right:100,bottom:100},depth:9},
    {id:'front',kind:'npc' as const,visible:true,bounds:{left:20,top:20,right:80,bottom:80},depth:11},
  ];
  assert.equal(pickWorldPointerTarget({x:50,y:50},targets)?.id,'front');
});
