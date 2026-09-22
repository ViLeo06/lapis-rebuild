import assert from 'node:assert/strict';
import test from 'node:test';
import {battleSkillHotkeyLabel,resolveBattleHotkey} from '../src/input/battle-hotkeys.ts';
import {renderBattleHud} from '../src/ui/battle-hud.ts';
import type {BattleHudState,PlayerHudState} from '../src/ui/types.ts';

test('S34A battle hotkeys resolve to one command contract',()=>{
  assert.deepEqual(resolveBattleHotkey('a',true),{kind:'attack'});
  assert.deepEqual(resolveBattleHotkey('A',true),{kind:'attack'});
  assert.deepEqual(resolveBattleHotkey('s',true),{kind:'recovery',resource:'hp'});
  assert.deepEqual(resolveBattleHotkey('d',true),{kind:'recovery',resource:'mp'});
  assert.deepEqual(resolveBattleHotkey('f',true),{kind:'rest'});
  for(const [key,slot] of [['q',0],['w',1],['e',2],['r',3]] as const)
    assert.deepEqual(resolveBattleHotkey(key,true),{kind:'skill',slot});
  for(let slot=0;slot<6;slot++)
    assert.deepEqual(resolveBattleHotkey(String(slot+1),true),{kind:'skill',slot});
  assert.equal(resolveBattleHotkey('7',true),null);
  assert.deepEqual(resolveBattleHotkey(' ',true),{kind:'toggle-range'});
  assert.deepEqual(resolveBattleHotkey('Space',true),{kind:'toggle-range'});
  assert.deepEqual(resolveBattleHotkey('Escape',true),{kind:'cancel'});
});

test('S34A battle-only commands do not steal field input',()=>{
  for(const key of ['a','s','d','f','q','w','e','r','1','2','3','4','5','6',' ','Space','Escape'])
    assert.equal(resolveBattleHotkey(key,false),null,key);
});

test('S34A skill labels keep QWER and 1-6 on the same slots',()=>{
  assert.deepEqual(
    Array.from({length:7},(_,index)=>battleSkillHotkeyLabel(index)),
    ['Q / 1','W / 2','E / 3','R / 4','5','6',undefined],
  );
});

test('S34A battle HUD displays the runtime hotkeys and hides legacy H/M recovery labels',()=>{
  const player:PlayerHudState={
    name:'佣兵',className:'巫师',portraitLabel:'巫',level:56,hp:100,hpMax:100,mp:130,mpMax:130,gold:0,
  };
  const battle:BattleHudState={
    phase:'active',readiness:20,readinessMax:20,ready:true,busy:false,paused:false,
    targetName:'训练目标',targetHp:50,targetHpMax:50,statusText:'可以行动',
    canAttack:true,canRest:true,canReturn:false,
    skills:[
      {id:'one',name:'技能一',mpCost:1,hotkey:'Q / 1'},
      {id:'two',name:'技能二',mpCost:2,hotkey:'W / 2'},
      {id:'three',name:'技能三',mpCost:3,hotkey:'E / 3'},
      {id:'four',name:'技能四',mpCost:4,hotkey:'R / 4'},
      {id:'five',name:'技能五',mpCost:5,hotkey:'5'},
      {id:'six',name:'技能六',mpCost:6,hotkey:'6'},
      {id:'seven',name:'技能七',mpCost:7},
    ],
  };
  const html=renderBattleHud(player,battle);
  assert.match(html,/<span>普通攻击<\/span><small>A<\/small>/);
  assert.match(html,/<small>S · 行动/);
  assert.match(html,/<small>D · 行动/);
  assert.match(html,/<span>休息<\/span><small>F<\/small>/);
  assert.match(html,/<span>范围<\/span><small>Space<\/small>/);
  assert.match(html,/<span>菜单<\/span><small>Esc<\/small>/);
  for(const label of ['Q / 1','W / 2','E / 3','R / 4','5 ·','6 ·'])assert.match(html,new RegExp(label.replace('/','\\/')));
  assert.doesNotMatch(html,/<small>H · 行动/);
  assert.doesNotMatch(html,/<small>M · 行动/);
});
