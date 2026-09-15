import { test } from 'node:test';
import assert from 'node:assert/strict';
import {beginBattle,useAttack} from '../src/battle.ts';
test('invalid training action inputs cannot mutate state',()=>{
 for(const mp_cost of [-1,NaN,Infinity,1.5]){const s=beginBattle(0,0);const before=JSON.stringify(s);assert.equal(useAttack(s,'dummy-melee',0,0,{skill_id:1101,name:'bad',mp_cost,explanation:'',magic_pattern_id:1}).ok,false);assert.equal(JSON.stringify(s),before);}
 const s=beginBattle(0,0);assert.equal(useAttack(s,'dummy-melee',NaN,0,null).ok,false);
});
