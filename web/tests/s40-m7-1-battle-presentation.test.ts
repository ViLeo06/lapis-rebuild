import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceEnemyMotion,createEnemyMotion} from '../src/view/enemy-motion.ts';
import {resolveBattleFeedbackAnchor} from '../src/view/battle-feedback.ts';
import {buildWorldMinimapModel,worldMinimapLayout} from '../src/view/world-minimap.ts';
import {battleMinimapLayout} from '../src/view/battle-minimap.ts';
import {manualCameraWithinSettleWindow} from '../src/view/battle-camera.ts';
import {renderBattleHud} from '../src/ui/battle-hud.ts';
import type {BattleHudState,PlayerHudState} from '../src/ui/types.ts';

test('S40 enemy movement interpolates continuously before committing destination',()=>{
  const motion=createEnemyMotion('enemy',{x:0,y:0},{x:64,y:32},400);
  const first=advanceEnemyMotion(motion,100);
  assert.equal(first.done,false);
  assert.ok(first.position.x>0&&first.position.x<64);
  assert.ok(first.position.y>0&&first.position.y<32);
  const final=advanceEnemyMotion(first.motion,300);
  assert.equal(final.done,true);
  assert.deepEqual(final.position,{x:64,y:32});
});

test('S40 feedback anchors to the target actor and never falls back to player',()=>{
  const player={x:100,y:200},enemies=[{id:'a',x:420,y:360},{id:'b',x:640,y:440}];
  assert.deepEqual(resolveBattleFeedbackAnchor('a',player,enemies),{x:420,y:282});
  assert.deepEqual(resolveBattleFeedbackAnchor('b',player,enemies),{x:640,y:362});
  assert.deepEqual(resolveBattleFeedbackAnchor('player',player,enemies),{x:100,y:128});
  assert.equal(resolveBattleFeedbackAnchor('missing',player,enemies),null);
});

test('S40 world minimap is upper-left and tracks player plus viewport',()=>{
  const viewport={width:1280,height:720},world={x:0,y:0,width:2400,height:1600};
  const layout=worldMinimapLayout(viewport,world);
  assert.ok(layout.x<20&&layout.y<80);
  const model=buildWorldMinimapModel(viewport,world,{scrollX:320,scrollY:240,zoom:1},{x:900,y:700});
  assert.ok(model.player.x>=model.layout.inner.x&&model.player.x<=model.layout.inner.x+model.layout.inner.width);
  assert.ok(model.player.y>=model.layout.inner.y&&model.player.y<=model.layout.inner.y+model.layout.inner.height);
  assert.ok(model.viewport.width>0&&model.viewport.height>0);
});

test('S40 manual camera settles only inside the final 16px window',()=>{
  assert.equal(manualCameraWithinSettleWindow({x:0,y:90.5},{x:0,y:99.5}),true);
  assert.equal(manualCameraWithinSettleWindow({x:0,y:80},{x:0,y:99.5}),false);
  assert.throws(()=>manualCameraWithinSettleWindow({x:0,y:0},{x:0,y:1},0),/positive/);
});

test('S40 battle minimap remains right-side and above bottom HUD inset',()=>{
  const layout=battleMinimapLayout({width:1280,height:720},{x:0,y:0,width:2400,height:1600},{bottomInset:136});
  assert.ok(layout.x>1000);
  assert.ok(layout.y+layout.height<600);
});

test('S40 HUD removes range toggle and exposes EXP ATK DEF plus status chips',()=>{
  const player:PlayerHudState={name:'佣兵',className:'剑士',portraitLabel:'剑',level:12,hp:90,hpMax:100,mp:50,mpMax:80,exp:35,expMax:100,atk:42,def:31,gold:0};
  const battle:BattleHudState={
    phase:'active',readiness:20,readinessMax:20,ready:true,canAttack:true,canRest:true,canReturn:false,
    statuses:[
      {id:'stun',label:'Stun',durationText:'1 action',tone:'control'},
      {id:'poison',label:'Poison',durationText:'6s',tone:'poison'},
      {id:'petrify',label:'Petrify',tone:'control'},
      {id:'healing-block',label:'Healing Block',tone:'debuff'},
      {id:'blind',label:'Blind',tone:'debuff'},
      {id:'sacrifice',label:'Sacrifice',tone:'buff'},
      {id:'burst',label:'Burst',tone:'buff'},
      {id:'strong-defence',label:'Strong Defence',tone:'buff'},
      {id:'nature-force',label:'Nature Force',tone:'buff'},
      {id:'curse-sword',label:'Curse Sword',tone:'buff'},
    ],
    skills:[],
  };
  const html=renderBattleHud(player,battle);
  assert.doesNotMatch(html,/battle-range-toggle/);
  for(const expected of ['EXP','ATK','DEF','Stun','Poison','Petrify','Healing Block','Blind','Sacrifice','Burst','Strong Defence','Nature Force','Curse Sword'])assert.match(html,new RegExp(expected));
});
