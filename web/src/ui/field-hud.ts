import type {FieldHudState,PlayerHudState} from './types.ts';
import {escapeHtml,meter} from './ui-utils.ts';
export function renderFieldHud(player:PlayerHudState,field:FieldHudState):string{
  const level=player.level==null?'':`<span class="hud-level">Lv.${Math.max(1,Math.floor(player.level))}</span>`;
  const quest=field.questTitle?`<section class="quest-tracker" aria-label="任务追踪"><div class="hud-kicker">任务</div><b>${escapeHtml(field.questTitle)}</b>${field.questDetail?`<p>${escapeHtml(field.questDetail)}</p>`:''}</section>`:'';
  const interaction=field.interactionPrompt?`<div class="interaction-prompt"><span class="keycap">E</span><span>${escapeHtml(field.interactionPrompt)}</span></div>`:'';
  return `<div class="field-hud" data-ui="field-hud"><section class="player-plate"><div class="portrait-frame" aria-hidden="true">${escapeHtml(player.portraitLabel)}</div><div class="player-vitals"><div class="player-title"><b>${escapeHtml(player.name)}</b><span>${escapeHtml(player.className)}</span>${level}</div>${meter('HP',player.hp,player.hpMax,'hp')}${meter('MP',player.mp,player.mpMax,'mp')}</div><div class="coin-box"><span>金币</span><b>${Math.max(0,Math.floor(player.gold))}</b></div></section><section class="map-plate"><span class="hud-kicker">当前位置</span><b>${String(field.mapId).padStart(4,'0')} · ${escapeHtml(field.mapName)}</b></section>${quest}${interaction}<button class="menu-button" data-action="menu" type="button" aria-label="打开菜单">菜单</button></div>`;
}
