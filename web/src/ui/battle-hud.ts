import type {BattleHudState,PlayerHudState} from './types.ts';
import {attrDisabled,escapeHtml,meter} from './ui-utils.ts';
import {InfiniteTrainingRecoveryPolicy} from '../training/m7-recovery.ts';
const phaseLabel:Record<BattleHudState['phase'],string>={safe:'战斗准备',active:'交战中',won:'战斗胜利',lost:'战斗失败'};
export function renderBattleHud(player:PlayerHudState,battle:BattleHudState):string{
  const unavailable=!battle.ready||battle.busy||battle.paused||battle.phase!=='active';
  const target=battle.targetName?`<section class="target-plate"><span class="hud-kicker">当前目标</span><b>${escapeHtml(battle.targetName)}</b>${battle.targetHp!=null&&battle.targetHpMax!=null?meter('HP',battle.targetHp,battle.targetHpMax,'hp'):''}</section>`:`<section class="target-plate target-empty"><span class="hud-kicker">当前目标</span><b>未选择</b></section>`;
  const skills=battle.skills.length?battle.skills.map(skill=>`<button type="button" class="battle-command skill-command" data-action="skill" data-skill-id="${escapeHtml(skill.id)}"${attrDisabled(unavailable||skill.disabled||player.mp<skill.mpCost)}><span>${escapeHtml(skill.name)}</span><small>${skill.hotkey?`${escapeHtml(skill.hotkey)} · `:''}${Math.max(0,Math.floor(skill.mpCost))} MP</small></button>`).join(''):`<span class="empty-skills">无可用技能</span>`;
  const status=battle.statusText||(battle.paused?'战斗已暂停':battle.busy?'行动执行中':battle.ready?'可以行动':'等待行动槽');
  return `<div class="battle-hud" data-ui="battle-hud">
    <nav class="top-command-strip battle-top-command" data-ui="top-command-strip" aria-label="战斗顶部命令条">
      <button type="button" class="top-command-button" disabled>帮助</button>
      <button type="button" class="top-command-button" disabled>状态</button>
      <button type="button" class="top-command-button" disabled>物品</button>
      <button type="button" class="top-command-button" disabled>魔法</button>
      <button type="button" class="top-command-button" disabled>聊天</button>
      <button type="button" class="top-command-button" data-action="battle-menu">系统</button>
    </nav>
    <div class="battle-topline">
      <section class="battle-player"><div class="portrait-frame portrait-small" aria-hidden="true">${escapeHtml(player.portraitLabel)}</div><div><div class="player-title"><b>${escapeHtml(player.name)}</b><span>${escapeHtml(player.className)}</span></div>${meter('HP',player.hp,player.hpMax,'hp')}${meter('MP',player.mp,player.mpMax,'mp')}</div></section>
      ${target}
      <section class="battle-state"><span class="hud-kicker">${phaseLabel[battle.phase]}</span><b>${escapeHtml(status)}</b>${meter('行动',battle.readiness,battle.readinessMax,'ready')}</section>
    </div>
    <div class="command-deck" aria-label="战斗操作">
      <button type="button" class="battle-command primary-command" data-action="attack"${attrDisabled(unavailable||!battle.canAttack)}><span>普通攻击</span><small>A</small></button>
      <div class="skill-deck" aria-label="技能栏">${skills}</div>
      <div class="battle-utility-deck" aria-label="战斗辅助操作">
        <button type="button" class="battle-command m7-recovery-command" data-action="recovery-hp"${attrDisabled(unavailable||player.hp>=player.hpMax)}><span>HP +${InfiniteTrainingRecoveryPolicy.hpAmount}</span><small>S · 行动 ${InfiniteTrainingRecoveryPolicy.readinessCost} · 约 ${InfiniteTrainingRecoveryPolicy.estimatedWaitMs/1000} 秒</small></button>
        <button type="button" class="battle-command m7-recovery-command" data-action="recovery-mp"${attrDisabled(unavailable||player.mp>=player.mpMax)}><span>MP +${InfiniteTrainingRecoveryPolicy.mpAmount}</span><small>D · 行动 ${InfiniteTrainingRecoveryPolicy.readinessCost} · 约 ${InfiniteTrainingRecoveryPolicy.estimatedWaitMs/1000} 秒</small></button>
        <button type="button" class="battle-command" data-action="rest"${attrDisabled(unavailable||!battle.canRest)}><span>休息</span><small>F</small></button>
        <button type="button" class="battle-command quiet-command" data-action="battle-range-toggle"${attrDisabled(battle.phase!=='active')}><span>范围</span><small>Space</small></button>
        <button type="button" class="battle-command quiet-command" data-action="battle-menu"><span>菜单</span><small>Esc</small></button>
        ${battle.phase==='active'?`<button type="button" class="battle-command quiet-command" data-action="battle-exit-request"><span>退出战斗</span><small>撤退</small></button>`:''}
        ${battle.canReturn?`<button type="button" class="battle-command return-command" data-action="return"><span>返回</span><small>结算</small></button>`:''}
      </div>
    </div>
  </div>`;
}
