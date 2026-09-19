import type {FieldHudState,PlayerHudState} from './types.ts';
import {escapeHtml,meter} from './ui-utils.ts';

function disabledSlot(label:string):string{
  return `<button type="button" class="legacy-slot" disabled aria-label="${escapeHtml(label)}"><span>未恢复</span></button>`;
}

export function renderFieldHud(player:PlayerHudState,field:FieldHudState):string{
  const level=player.level==null?'':`<span class="hud-level">Lv.${Math.max(1,Math.floor(player.level))}</span>`;
  const questTitle=field.questTitle||'任务';
  const questDetail=field.questDetail||'暂无追踪任务';
  const interaction=field.interactionPrompt?`<div class="interaction-prompt"><span class="keycap">E</span><span>${escapeHtml(field.interactionPrompt)}</span></div>`:'';
  const slots=[1,2,3,4].map(index=>disabledSlot(`原版功能槽 ${index}，尚未恢复`)).join('');
  const commands=[1,2,3].map(index=>disabledSlot(`原版命令槽 ${index}，尚未恢复`)).join('');
  return `<div class="field-hud" data-ui="field-hud">
    <section class="player-plate hud-corner-top-left" aria-label="角色状态">
      <div class="portrait-frame" aria-hidden="true">${escapeHtml(player.portraitLabel)}</div>
      <div class="player-vitals">
        <div class="player-title"><b>${escapeHtml(player.name)}</b><span>${escapeHtml(player.className)}</span>${level}</div>
        ${meter('HP',player.hp,player.hpMax,'hp')}
        ${meter('MP',player.mp,player.mpMax,'mp')}
      </div>
      <div class="coin-box"><span>金币</span><b>${Math.max(0,Math.floor(player.gold))}</b></div>
    </section>
    <section class="quest-tracker hud-corner-top-right" aria-label="任务追踪">
      <div class="hud-kicker">任务 / GUIDE</div>
      <b>${escapeHtml(questTitle)}</b>
      <p>${escapeHtml(questDetail)}</p>
    </section>
    <section class="field-bottom-left" aria-label="地图与原版功能槽占位">
      <div class="map-plate"><span class="hud-kicker">当前位置</span><b>${String(field.mapId).padStart(4,'0')} · ${escapeHtml(field.mapName)}</b></div>
      <div class="legacy-slot-strip" aria-label="未恢复功能槽">${slots}</div>
    </section>
    <section class="field-bottom-right" aria-label="命令与系统区">
      <div class="legacy-command-strip" aria-label="未恢复命令槽">${commands}</div>
      <button class="menu-button" data-action="menu" type="button" aria-label="打开系统菜单">系统</button>
    </section>
    ${interaction}
  </div>`;
}
