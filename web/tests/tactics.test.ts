import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reachableCells,tacticalRoute,tileDistance,chooseBattleLayout,enemyStep} from '../src/tactics.ts';
import {beginBattle,consumeAction,updateBattle} from '../src/battle.ts';
import type {Collision} from '../src/model.ts';
const grid=():Collision=>({width:11,height:11,grid_order:'first-major',grid:Array.from({length:121},(_,i)=>(Math.floor(i/11)+i%11)%2===0?1:0)});
test('battle grid preserves parity and counts diagonal steps, not pixels',()=>{
 const paths=reachableCells(grid(),[5,5],3);assert.ok(paths.size>1);
 for(const path of paths.values()){assert.ok(path.length<=4);for(let i=1;i<path.length;i++){assert.equal(Math.abs(path[i][0]-path[i-1][0]),1);assert.equal(Math.abs(path[i][1]-path[i-1][1]),1);}}
 assert.equal(tileDistance([5,5],[6,6]),1);assert.equal(tileDistance([5,5],[7,5]),2);assert.equal(tileDistance([5,5],[6,5]),Infinity);
});
test('occupied cells cannot be entered or crossed and range is enforced',()=>{
 assert.equal(tacticalRoute(grid(),[5,5],[6,6],5,[[6,6]]),null);
 assert.equal(tacticalRoute(grid(),[5,5],[9,9],3),null);
 for(const path of reachableCells(grid(),[5,5],5,[[6,6]]).values())assert.ok(path.every(c=>!(c[0]===6&&c[1]===6)));
 assert.throws(()=>reachableCells(grid(),[5,5],Infinity));assert.throws(()=>reachableCells(grid(),[5,5],-1));
});
test('battle formation is deterministic, connected and nonoverlapping',()=>{
 const c=grid(),a=chooseBattleLayout(c);assert.deepEqual(a,chooseBattleLayout(c));
 assert.notDeepEqual(a.player,a.enemies[0]);assert.notDeepEqual(a.enemies[0],a.enemies[1]);
 for(const e of a.enemies)assert.ok(tacticalRoute(c,a.player,e,4));
 assert.throws(()=>chooseBattleLayout({...c,grid:c.grid.map(()=>0)}));
});
test('enemy path approaches without stepping on player or reserved cells',()=>{
 const c=grid(),next=enemyStep(c,[3,3],[7,7],[[7,7],[4,4]]);assert.ok(next);assert.notDeepEqual(next,[4,4]);assert.notDeepEqual(next,[7,7]);
 assert.equal(enemyStep(c,[5,5],[7,7],[[4,4],[4,6],[6,4],[6,6],[7,7]]),null);
});
test('action gauge cannot refill while the player is still executing movement',()=>{
 const s=beginBattle(192,96);consumeAction(s);s.enemies.forEach(e=>{e.x=320;e.y=160;});
 for(let i=0;i<30;i++)updateBattle(s,100,192,96,0,{collision:grid(),playerBusy:true,reserved:[]});
 // Avoid a terminal victory fixture: check recharge on a live encounter instead.
 assert.equal(s.phase,'active');assert.equal(s.action,0);
 for(let i=0;i<8;i++)updateBattle(s,100,192,96,0,{collision:grid(),playerBusy:false,reserved:[]});
 assert.equal(s.action,s.actionMax);
});
test('invalid battle clock inputs are atomic',()=>{
 for(const delta of [NaN,Infinity,-1]){const s=beginBattle(0,0),before=JSON.stringify(s);updateBattle(s,delta,0,0);assert.equal(JSON.stringify(s),before);}
});
test('enemies carry independent action gauges and terminal battles freeze',()=>{
 const s=beginBattle(0,0);s.enemies[0].action=95;s.enemies[1].action=0;
 updateBattle(s,100,0,0);assert.equal(s.enemies[0].action,0);assert.ok(s.enemies[1].action>0&&s.enemies[1].action<10);
 s.phase='won';const before=JSON.stringify(s);updateBattle(s,100,0,0);assert.equal(JSON.stringify(s),before);
});
