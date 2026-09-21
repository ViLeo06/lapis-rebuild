import {escapeHtml} from './ui-utils.ts';
import {M7_TRAINING_BATTLES,monsterContractSummary,resolvePlayerDifficultyHint} from '../training/m7-training-camp.ts';
import {M7_DEVELOPER_PRESET_LEVELS} from '../training/m7-level-axis.ts';
import type {M7Profession} from '../training/m7-level-axis.ts';

export function renderM7TrainingCamp(playerLevel:number,selectedBattleId:number):string{
  const rows=M7_TRAINING_BATTLES.map(row=>{
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
  return '<section class="m7-training-camp" data-ui="m7-training-camp">'+
    '<header><div><b>Training Camp · 15 Battles</b><small>敌人等级固定；难度提示只比较当前等级，不缩放敌人。</small></div><span>RECONSTRUCTION_POLICY</span></header>'+
    '<div class="m7-training-list">'+rows+'</div>'+
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
