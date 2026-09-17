import {renderBattleHud} from './battle-hud.ts';
import {renderDebugPanel} from './debug-panel.ts';
import {renderFieldHud} from './field-hud.ts';
import {renderGameMenu} from './game-menu.ts';
import type {GameShellState} from './types.ts';
import {escapeHtml} from './ui-utils.ts';
export type {BattleHudState,BattleSkillView,DiagnosticsState,FieldHudState,GameMode,GameShellState,MenuState,PlayerHudState} from './types.ts';
export function renderGameShell(state:GameShellState):string{
  const hud=state.mode==='battle'&&state.battle?renderBattleHud(state.player,state.battle):renderFieldHud(state.player,state.field);
  return `<div class="lapis-game-shell mode-${state.mode}" data-ui="game-shell"><header class="game-chrome"><div class="game-brand"><span class="game-mark">L</span><div><b>佣兵传说</b><small>LAPIS REBUILD</small></div></div><div class="chrome-map">${String(state.field.mapId).padStart(4,'0')} · ${escapeHtml(state.field.mapName)}</div><button type="button" class="chrome-menu" data-action="menu">菜单</button></header><main class="game-stage"><div class="world-viewport" data-game-canvas aria-label="游戏地图区域"><div class="canvas-slot-note">S13 integration: mount Phaser canvas here</div></div>${hud}${state.notice?`<div class="game-notice" role="status">${escapeHtml(state.notice)}</div>`:''}</main>${renderGameMenu(state.menu)}${state.menu.devEnabled||state.diagnostics.open?renderDebugPanel(state.diagnostics):''}</div>`;
}
export function normalizeShellState(state:GameShellState):GameShellState{
  const hpMax=Math.max(1,Math.floor(state.player.hpMax)); const mpMax=Math.max(0,Math.floor(state.player.mpMax));
  const player={...state.player,hpMax,mpMax,hp:Math.max(0,Math.min(hpMax,Math.floor(state.player.hp))),mp:Math.max(0,Math.min(mpMax,Math.floor(state.player.mp))),gold:Math.max(0,Math.floor(state.player.gold))};
  if(state.mode==='battle'&&!state.battle)throw new Error('battle mode requires battle HUD state');
  return {...state,player};
}
