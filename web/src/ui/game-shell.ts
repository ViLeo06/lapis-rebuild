import {renderBattleHud} from './battle-hud.ts';
import {renderDebugPanel} from './debug-panel.ts';
import {renderFieldHud} from './field-hud.ts';
import {renderGameMenu} from './game-menu.ts';
import type {GameShellState} from './types.ts';
import {escapeHtml} from './ui-utils.ts';
export type {BattleHudState,BattleSkillView,BattleStatusView,DiagnosticsState,FieldHudState,GameMode,GameShellState,MenuState,PlayerHudState} from './types.ts';

export function renderGameShell(state:GameShellState):string{
  const hud=state.mode==='battle'&&state.battle?renderBattleHud(state.player,state.battle):renderFieldHud(state.player,state.field);
  return `<div class="lapis-game-shell mode-${state.mode}" data-ui="game-shell"><main class="game-stage"><div class="world-viewport" data-game-canvas aria-label="游戏地图区域"><div class="canvas-slot-note">Phaser canvas mount</div></div>${hud}${state.notice?`<div class="game-notice" role="status">${escapeHtml(state.notice)}</div>`:''}</main>${renderGameMenu(state.menu)}${state.menu.devEnabled||state.diagnostics.open?renderDebugPanel(state.diagnostics):''}</div>`;
}

export function normalizeShellState(state:GameShellState):GameShellState{
  const hpMax=Math.max(1,Math.floor(state.player.hpMax)); const mpMax=Math.max(0,Math.floor(state.player.mpMax));
  const expMax=state.player.expMax==null?undefined:Math.max(1,Math.floor(state.player.expMax));
  const exp=state.player.exp==null?undefined:Math.max(0,Math.min(expMax??Number.MAX_SAFE_INTEGER,Math.floor(state.player.exp)));
  const atk=state.player.atk==null?undefined:Math.max(0,Math.round(state.player.atk));
  const def=state.player.def==null?undefined:Math.max(0,Math.round(state.player.def));
  const player={...state.player,hpMax,mpMax,hp:Math.max(0,Math.min(hpMax,Math.floor(state.player.hp))),mp:Math.max(0,Math.min(mpMax,Math.floor(state.player.mp))),exp,expMax,atk,def,gold:Math.max(0,Math.floor(state.player.gold))};
  if(state.mode==='battle'&&!state.battle)throw new Error('battle mode requires battle HUD state');
  return {...state,player};
}
