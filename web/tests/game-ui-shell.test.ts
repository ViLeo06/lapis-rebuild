import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeShellState,renderGameShell} from '../src/ui/game-shell.ts';
import {renderDebugPanel} from '../src/ui/debug-panel.ts';
import type {GameShellState} from '../src/ui/types.ts';

const fieldState:GameShellState={
  mode:'field',
  player:{name:'卫兵',className:'剑士',portraitLabel:'剑',level:12,hp:125,hpMax:125,mp:40,mpMax:100,gold:27},
  field:{mapId:1,mapName:'外城',questTitle:'训练委托',questDetail:'前往训练场完成一次战斗',interactionPrompt:'与训练官交谈'},
  menu:{open:false,canSave:true,canLoad:true,devEnabled:false},
  diagnostics:{open:false,rawTiming:'5 -> 200ms',bounds:'hidden',provenance:'VERIFIED + RECONSTRUCTION_POLICY'},
};

test('field shell follows S20 edge-chrome relationships and keeps diagnostics out of normal view',()=>{
  const html=renderGameShell(fieldState);
  assert.match(html,/data-ui="field-hud"/);
  assert.match(html,/data-ui="top-command-strip"/);
  assert.match(html,/hud-corner-lower-left/);
  assert.match(html,/hud-corner-top-right/);
  assert.match(html,/data-ui="small-map"/);
  assert.match(html,/data-ui="bottom-deck"/);
  assert.match(html,/data-ui="quick-slots"/);
  assert.match(html,/外城/);
  assert.match(html,/训练委托/);
  assert.match(html,/HP/);
  assert.doesNotMatch(html,/game-chrome/);
  assert.doesNotMatch(html,/id="developer-diagnostics"/);
});

test('missing retail functions keep disabled original-structure categories and eight historical quick-slot keys',()=>{
  const html=renderGameShell(fieldState);
  const quickSlots=(html.match(/class="legacy-quick-slot" disabled/g)||[]).length;
  assert.equal(quickSlots,8);
  for(const key of ['A','S','D','F','Z','X','C','V'])assert.match(html,new RegExp(`<b>${key}<\\/b>`));
  assert.match(html,/top-command-button" disabled/);
  assert.match(html,/未恢复/);
});

test('quest area remains anchored even when no quest text is available',()=>{
  const html=renderGameShell({...fieldState,field:{mapId:7,mapName:'训练屋'}});
  assert.match(html,/任务 \/ GUIDE/);
  assert.match(html,/暂无追踪任务/);
});

test('developer diagnostics are opt-in and preserve required inspector categories',()=>{
  const html=renderDebugPanel({...fieldState.diagnostics,open:false});
  assert.match(html,/Developer \/ Diagnostics/);
  assert.match(html,/map selector/);
  assert.match(html,/ANI raw timing/);
  assert.match(html,/action slot/);
  assert.match(html,/direction/);
  assert.match(html,/anchor \/ bounds/);
  assert.match(html,/MagicRes inspector/);
  assert.match(html,/Provenance/);
  assert.doesNotMatch(html,/<details[^>]+ open/);
});

test('battle shell exposes readiness, target, attack, skill, rest and settlement return',()=>{
  const state:GameShellState={...fieldState,mode:'battle',battle:{phase:'active',readiness:20,readinessMax:20,ready:true,targetName:'训练木偶',targetHp:36,targetHpMax:60,statusText:'可以行动',canAttack:true,canRest:true,canReturn:true,skills:[{id:101,name:'重击',mpCost:8,hotkey:'1'}]}};
  const html=renderGameShell(state);
  assert.match(html,/data-ui="battle-hud"/);
  assert.match(html,/训练木偶/);
  assert.match(html,/普通攻击/);
  assert.match(html,/重击/);
  assert.match(html,/休息/);
  assert.match(html,/返回/);
  assert.match(html,/行动/);
  assert.match(html,/<span>普通攻击<\/span><small>A<\/small>/);
  assert.match(html,/<span>休息<\/span><small>F<\/small>/);
  assert.doesNotMatch(html,/data-action="battle-range-toggle"/);
  assert.match(html,/EXP/);
  assert.match(html,/ATK/);
  assert.match(html,/DEF/);
});

test('shell escapes authored display text and clamps player vitals before integration',()=>{
  const bad:GameShellState={...fieldState,player:{...fieldState.player,name:'<img src=x onerror=1>',hp:999,hpMax:125,mp:-3}};
  const normalized=normalizeShellState(bad);
  assert.equal(normalized.player.hp,125);
  assert.equal(normalized.player.mp,0);
  const html=renderGameShell(normalized);
  assert.doesNotMatch(html,/<img src=x/);
  assert.match(html,/&lt;img src=x onerror=1&gt;/);
});

test('battle mode fails closed without battle HUD state',()=>{
  assert.throws(()=>normalizeShellState({...fieldState,mode:'battle'}),/battle mode requires battle HUD state/);
});
