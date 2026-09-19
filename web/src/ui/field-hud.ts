import type {FieldHudState,PlayerHudState} from './types.ts';
import {escapeHtml,meter} from './ui-utils.ts';

function disabledQuickSlot(key:string,label:string):string{
  return `<button type="button" class="legacy-quick-slot" disabled aria-label="${escapeHtml(label)}"><b>${escapeHtml(key)}</b><span>未恢复</span></button>`;
}

function command(label:string,action?:'inventory'|'menu'):string{
  if(action)return `<button type="button" class="top-command-button" data-action="${action}">${escapeHtml(label)}</button>`;
  return `<button type="button" class="top-command-button" disabled aria-label="${escapeHtml(label)}，尚未恢复">${escapeHtml(label)}</button>`;
}

export function renderFieldHud(player:PlayerHudState,field:FieldHudState):string{
  const level=player.level==null?'':`<span class="hud-level">Lv.${Math.max(1,Math.floor(player.level))}</span>`;
  const questTitle=field.questTitle||'任务';
  const questDetail=field.questDetail||'暂无追踪任务';
  const interaction=field.interactionPrompt?`<div class="interaction-prompt"><span class="keycap">E</span><span>${escapeHtml(field.interactionPrompt)}</span></div>`:'';
  const itemSlots=['A','S','D','F'].map(key=>disabledQuickSlot(key,`物品快捷槽 ${key}，尚未恢复`)).join('');
  const magicSlots=['Z','X','C','V'].map(key=>disabledQuickSlot(key,`魔法快捷槽 ${key}，尚未恢复`)).join('');
  const topCommands=[
    command('帮助'),
    command('状态'),
    command('物品'),
    command('魔法'),
    command('队伍'),
    command('聊天'),
    command('系统','menu'),
  ].join('');

  return `<div class="field-hud" data-ui="field-hud">
    <nav class="top-command-strip" data-ui="top-command-strip" aria-label="原版结构命令条">${topCommands}</nav>

    <section class="map-plate small-map-plate" data-ui="small-map" aria-label="小地图区域">
      <span class="hud-kicker">MAP</span>
      <b>${String(field.mapId).padStart(4,'0')} · ${escapeHtml(field.mapName)}</b>
      <span class="map-placeholder">地图框 / 未恢复</span>
    </section>

    <section class="quest-tracker hud-corner-top-right" aria-label="任务追踪">
      <div class="hud-kicker">任务 / GUIDE · RECONSTRUCTION</div>
      <b>${escapeHtml(questTitle)}</b>
      <p>${escapeHtml(questDetail)}</p>
    </section>

    <section class="player-plate hud-corner-lower-left" aria-label="角色状态">
      <div class="portrait-frame" aria-hidden="true">${escapeHtml(player.portraitLabel)}</div>
      <div class="player-vitals">
        <div class="player-title"><b>${escapeHtml(player.name)}</b><span>${escapeHtml(player.className)}</span>${level}</div>
        ${meter('HP',player.hp,player.hpMax,'hp')}
        ${meter('MP',player.mp,player.mpMax,'mp')}
      </div>
      <div class="coin-box"><span>金币</span><b>${Math.max(0,Math.floor(player.gold))}</b></div>
    </section>

    <section class="field-bottom-center" data-ui="bottom-deck" aria-label="聊天与系统信息区域">
      <div class="bottom-deck-heading"><span>CHAT / SYSTEM</span><small>原版结构占位</small></div>
      <div class="bottom-deck-log">系统信息 / 聊天功能尚未恢复</div>
    </section>

    <section class="field-bottom-right" data-ui="quick-slots" aria-label="物品与魔法快捷槽">
      <div class="quick-slot-group"><span class="quick-slot-label">ITEM</span><div class="quick-slot-row">${itemSlots}</div></div>
      <div class="quick-slot-group"><span class="quick-slot-label">MAGIC</span><div class="quick-slot-row">${magicSlots}</div></div>
    </section>

    ${interaction}
  </div>`;
}
