import {escapeHtml} from './ui-utils.ts';
import {M7_TRAINING_BATTLES,monsterContractSummary,resolvePlayerDifficultyHint} from '../training/m7-training-camp.ts';
import {M7_DEVELOPER_PRESET_LEVELS} from '../training/m7-level-axis.ts';
import type {M7Profession} from '../training/m7-level-axis.ts';

function renderTrainingRows(playerLevel:number,selectedBattleId:number):string{
  return M7_TRAINING_BATTLES.map(row=>{
    const hint=resolvePlayerDifficultyHint(playerLevel,row.recommendedLevel);
    const selected=row.id===selectedBattleId?' selected':'';
    return '<article class="m7-training-battle'+selected+'" data-training-battle-id="'+row.id+'">'+
      '<div class="m7-training-battle-copy">'+
        '<b>Battle #'+row.id+' · Lv'+row.recommendedLevel+'</b>'+
        '<span>Stage '+row.stage+' · '+escapeHtml(row.difficultyBand)+' · 当前提示 '+hint+'</span>'+
        '<small>'+escapeHtml(row.sceneTitle)+' / Zone '+row.battleZoneId+'</small>'+
        '<small>'+escapeHtml(monsterContractSummary(row))+'</small>'+
        '<p>'+escapeHtml(row.purpose)+'</p>'+
      '</div>'+
      '<button type="button" data-action="training-start" data-training-battle-id="'+row.id+'">Start</button>'+
    '</article>';
  }).join('');
}

/**
 * Legacy S33 renderer retained as a compatibility surface until S41 removes the
 * shared-runtime insertion from the System menu. The authoritative rows still
 * come directly from M7_TRAINING_BATTLES.
 */
export function renderM7TrainingCamp(playerLevel:number,selectedBattleId:number):string{
  return '<section class="m7-training-camp" data-ui="m7-training-camp" data-training-surface="legacy-settings">'+
    '<header><div><b>Training Camp · 15 Battles</b><small>敌人等级固定；兼容入口：M7.1 集成后由世界训练管理员替代。</small></div><span>RECONSTRUCTION_POLICY</span></header>'+
    '<div class="m7-training-list">'+renderTrainingRows(playerLevel,selectedBattleId)+'</div>'+
  '</section>';
}

export function renderM7TrainingManagerDialog(
  playerLevel:number,
  selectedBattleId:number,
  open=true,
):string{
  return '<section class="m7-training-manager-dialog" data-ui="m7-training-manager-dialog"'+(open?'':' hidden')+' role="dialog" aria-modal="true" aria-label="训练管理员">'+
    '<div class="m7-training-manager-panel">'+
      '<header><div><b>训练管理员 · 15 场训练</b><small>选择后直接进入训练战；敌人等级固定，不随玩家缩放。</small></div>'+
      '<button type="button" class="m7-training-manager-close" data-action="training-manager-close" aria-label="关闭训练列表">×</button></header>'+
      '<div class="m7-training-list">'+renderTrainingRows(playerLevel,selectedBattleId)+'</div>'+
      '<footer><span>训练管理员身份与关卡绑定：RECONSTRUCTION_POLICY</span></footer>'+
    '</div>'+
  '</section>';
}

export function renderM7DeveloperPreset(
  currentProfession:M7Profession,
  currentLevel:number,
  unlockAll:boolean,
):string{
  const quick=M7_DEVELOPER_PRESET_LEVELS.map(level=>'<button type="button" data-action="dev-preset-quick" data-dev-level="'+level+'">Lv'+level+'</button>').join('');
  return '<section class="m7-developer-preset" data-ui="m7-developer-preset">'+
    '<header><b>Developer Character Preset</b><span>DEBUG · 不写入普通 SaveV2</span></header>'+
    '<div class="m7-developer-form">'+
      '<label>Profession<select data-dev-profession><option value="swordsman"'+(currentProfession==='swordsman'?' selected':'')+'>Swordsman</option><option value="wizard"'+(currentProfession==='wizard'?' selected':'')+'>Wizard</option></select></label>'+
      '<label>Level<input data-dev-level-input type="number" min="1" max="65" step="1" value="'+Math.max(1,Math.min(65,Math.floor(currentLevel)))+'"></label>'+
      '<label class="m7-debug-skills"><input data-dev-unlock-all type="checkbox"'+(unlockAll?' checked':'')+'> Unlock all implemented skills · Lv6 override</label>'+
      '<button type="button" data-action="dev-preset-apply">Apply Preset</button>'+
    '</div>'+
    '<div class="m7-developer-quick">'+quick+'</div>'+
  '</section>';
}
