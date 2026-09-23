import Phaser from 'phaser';
import './style.css';
import './tactical.css';
import { loadPack } from './assets.ts';
import { LabScene } from './scene.ts';
import { ACTIONS, DIRECTIONS, PROVISIONAL } from './config.ts';
import {GUIDE_NAME,guideStageLabel} from './quest.ts';
import {selectZoneBgm} from './audio-runtime.ts';
import skillData from '../../data/skills/mvp.json';
import type { Skill } from './battle.ts';

declare global {
  interface Window { lapisDiagnostics?: { snapshot:()=>ReturnType<LabScene['snapshot']> }; }
}

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<header><div class="brand-mark">L</div><div><div class="eyebrow">LAPIS REBUILD / PRIVATE RESEARCH</div><h1>佣兵传说 <span>Web 实验场</span></h1></div><div class="header-right"><span class="badge">WEB-FIRST</span><span id="pack-kind" class="quiet">正在校验</span></div></header>
<main><section class="world"><div class="section-head"><div><span class="dot"></span><b id="map-title">0000 / 对练场</b><small id="mode-subtitle">非战斗地图：自由移动与资源诊断</small></div><div class="tools"><button id="zoom-out" title="缩小">−</button><button id="fit">全图</button><button id="zoom-in" title="放大">+</button></div></div><div id="canvas-host" tabindex="0" aria-label="地图画布"></div><div id="loading" role="status">正在读取资源…</div><div class="world-foot"><span id="move-help">非战斗：点击移动 / WASD / 滚轮缩放</span><span id="fps">-- FPS</span></div>
<div class="battle-bar"><div><b id="phase">非战斗地图</b><p id="vitals">HP 125 / MP 100</p></div><div id="action-wrap" class="action-wrap" hidden><span>行动槽 <b id="action-state">READY</b></span><progress id="action-gauge" max="20" value="20"></progress></div><div class="battle-actions"><button id="battle" class="accent">进入战斗画面</button><button id="battle-pause" hidden>暂停战斗</button><button id="return" hidden>退出战斗</button><button id="attack" hidden>普通攻击</button></div></div><div id="skills" class="skill-row" hidden></div>
<div class="disclaimer"><span class="tag inferred">RECOVERED</span> 行动槽、interaction→battle-entry 边界、AI program 绑定优先级和 ANI common timing 已接入运行时。当前离线 encounter 决策、具体历史敌人 program、伤害公式与未恢复视觉规则属于 <span class="tag unknown">RECONSTRUCTION_POLICY / UNVERIFIED</span>，不冒充原版服务器规则。</div>
<div class="journal"><span class="eyebrow">SESSION LOG</span><p id="quest-status">M3重构任务：未开始 / RECONSTRUCTION_POLICY</p><p id="notice" role="status">准备中</p><div class="save-tools"><button id="save">保存进度</button><button id="load">读取存档</button><button id="export">导出 JSON</button><label class="file-button">导入 JSON<input id="import" type="file" accept="application/json,.json"></label><button id="npc">与 ${GUIDE_NAME} 交谈</button></div></div></section>
<aside><div class="section-head"><b>调试面板</b><span class="quiet">DIAGNOSTICS</span></div><div class="panel"><h2>01 <span>角色与动画</span></h2><label>角色<select id="character"></select></label><label>原始动作槽 <span class="tag inferred">INFERRED</span><select id="action"></select></label><label>原始方向槽 <span class="tag inferred">INFERRED</span><select id="direction"></select></label><div class="playback"><button id="play" class="accent">暂停</button><button id="step">下一帧</button></div><label class="slider-label">序列帧 <output id="frame-count">0 / 0</output><input id="frame" type="range" min="0" max="3" value="0"></label><label>当前帧间隔 (ms) <span class="tag verified">RECOVERED</span><input id="duration" type="number" min="1" max="2000" step="1" value="160"></label><dl><dt>ANI raw timing</dt><dd id="raw-timing">--</dd><dt>SPR frame ID</dt><dd id="spr-frame">--</dd><dt>Bounds</dt><dd id="bounds">--</dd></dl><p class="hint">常见 consumer 使用 1000/raw timing；至少一条独立路径使用 1000/(raw−1)。此输入仅用于人工诊断覆盖，不会改写原始 timing。</p></div>
<div class="panel"><h2>02 <span>地图与碰撞</span></h2><label>地图 <span class="tag verified">VERIFIED</span><select id="map"></select></label><div class="checks"><label><input id="grid" type="checkbox">地图网格</label><label><input id="collision" type="checkbox">通行投影</label><label><input id="anchors" type="checkbox">锚点 / Bounds</label></div><dl><dt>角色像素</dt><dd id="anchor">--</dd><dt>鼠标像素</dt><dd id="mouse">--</dd><dt>参考点击格</dt><dd id="reference">--</dd><dt>路径锚点格</dt><dd id="projection">--</dd><dt>IMF 原值</dt><dd id="imf">--</dd><dt>Tile / Resource ID</dt><dd id="resource">--</dd><dt>BGM selector</dt><dd id="bgm-state">metadata-unavailable</dd></dl><p class="hint">路径仍用于内部寻路，但不再在正常画面绘制指引线。Bounds 默认隐藏。BGM 的 zone→track 选择链已恢复，但当前 Web pack 未加载原 zone metadata，因此不会把“metadata 未接入”误当成原版 fallback。</p></div>
<div class="panel"><h2>03 <span>MagicRes / FOCUS</span></h2><label>特效资源 <span class="tag verified">SPR ORDER</span><select id="effect"></select></label><div class="playback"><button id="effect-play" class="accent">诊断播放</button><button id="effect-step">下一帧</button></div><dl><dt>Effect frame</dt><dd id="effect-frame">--</dd><dt>ANI timing / interval</dt><dd id="effect-timing">--</dd><dt>Placement</dt><dd>RECONSTRUCTION_POLICY / UNVERIFIED</dd></dl><p class="hint">特效诊断 cadence 使用已恢复 common timing consumer；FOCUS 的方向、混合、放置和阶段组合仍未恢复。</p></div>
<div class="panel compact"><span class="tag verified">VERIFIED</span> 帧索引 / bounds / ANI common timing / state 3 受击 / battle-entry 显式 zone / BGM selector<br><span class="tag inferred">RECOVERED</span> 20 格 readiness / AI source precedence / client target candidate draw<br><span class="tag unknown">RECONSTRUCTION_POLICY</span> 离线 encounter authority / 训练敌人实例 / 伤害公式 / M3任务 / FOCUS 放置</div></aside></main><footer>私人研究预览·不含登录、遥测或原客户端执行 <span>BUILD 0.9 / M5 PLAYABLE RECOVERY</span></footer>`;

const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const notice=(s:string)=>el('notice').textContent=s;
const fail=(e:unknown)=>{
  el('loading').hidden=false;
  el('loading').textContent=`无法启动：${String(e)}。需先生成私有 game-data，或打开完整的离线 HTML 预览。`;
  notice(String(e));
};

async function start(){
  const pack=await loadPack(s=>el('loading').textContent=s);
  const scene=new LabScene(pack,notice);
  const host=el('canvas-host');
  const game=new Phaser.Game({
    type:Phaser.AUTO,parent:host,backgroundColor:'#111b1b',pixelArt:true,antialias:false,
    scale:{mode:Phaser.Scale.NONE,width:host.clientWidth,height:host.clientHeight},scene:[scene],audio:{noAudio:true}
  });
  const resize=new ResizeObserver(()=>{
    const width=host.clientWidth,height=host.clientHeight;
    if(width>0&&height>0)game.scale.resize(width,height);
  });
  resize.observe(host);
  window.addEventListener('beforeunload',()=>{resize.disconnect();game.destroy(true);});
  el('pack-kind').textContent=pack.manifest.provenance?.kind==='synthetic'?'SYNTHETIC / 测试样本':'PRIVATE / 原版资源';

  const char=el<HTMLSelectElement>('character');
  const action=el<HTMLSelectElement>('action');
  const direction=el<HTMLSelectElement>('direction');
  const map=el<HTMLSelectElement>('map');
  const effect=el<HTMLSelectElement>('effect');
  for(const [id,c] of Object.entries(pack.manifest.characters))char.add(new Option(`B${id} / ${c.label==='swordsman'?'剑士':c.label==='wizard'?'巫师':c.label}`,id));
  for(const [id,m] of Object.entries(pack.maps))map.add(new Option(`${String(m.manifest.id).padStart(4,'0')} / ${m.manifest.name}`,id));
  for(const [id,e] of Object.entries(pack.effects))effect.add(new Option(`magic-${String(e.resource_id).padStart(3,'0')} / ${e.frame_count} 帧`,id));
  if(!effect.options.length){
    effect.disabled=true;
    el<HTMLButtonElement>('effect-play').disabled=true;
    el<HTMLButtonElement>('effect-step').disabled=true;
  }

  function actions(){
    action.replaceChildren();
    for(const slot of Object.keys(pack.animations[scene.character]))action.add(new Option(`_${slot} / ${ACTIONS[slot]??'未知'}`,slot));
  }
  for(let d=0;d<8;d++)direction.add(new Option(`${d} / ${DIRECTIONS[d]}`,String(d)));
  actions();

  function skills(){
    el('skills').replaceChildren();
    const wizard=Number(scene.character)%10===9;
    for(const s of skillData.filter(s=>wizard?s.skill_id>=19000:s.skill_id<19000)){
      const b=document.createElement('button');
      b.id=`skill-${s.skill_id}`;
      b.textContent=`${s.name} / ${s.mp_cost} MP`;
      b.title=`${s.explanation}\nPattern ${s.magic_pattern_id}\n数值效果：RECONSTRUCTION_POLICY`;
      b.onclick=()=>scene.attack(s as Skill);
      el('skills').append(b);
    }
  }
  skills();

  char.onchange=()=>{scene.setCharacter(char.value);char.value=scene.character;actions();skills();};
  action.onchange=()=>{scene.route=[];scene.setAction(action.value);};
  direction.onchange=()=>scene.setDirection(Number(direction.value));
  map.onchange=()=>{scene.setMap(Number(map.value));map.value=String(scene.mapId);};
  effect.onchange=()=>scene.setEffect(Number(effect.value));
  el('play').onclick=()=>{scene.playing=!scene.playing;};
  el('step').onclick=()=>scene.step();
  el<HTMLInputElement>('frame').oninput=e=>scene.setFrame(Number((e.target as HTMLInputElement).value));
  el('effect-play').onclick=()=>scene.playEffect();
  el('effect-step').onclick=()=>scene.stepEffect();
  el<HTMLInputElement>('duration').onchange=e=>{
    const n=Number((e.target as HTMLInputElement).value);
    if(Number.isFinite(n)&&n>=1&&n<=2000)scene.duration=n;
    else(el('duration') as HTMLInputElement).value=String(scene.duration);
  };
  for(const [id,prop] of [['grid','showGrid'],['collision','showCollision'],['anchors','showBounds']] as const){
    el<HTMLInputElement>(id).onchange=e=>{scene[prop]=(e.target as HTMLInputElement).checked;};
  }
  el('zoom-out').onclick=()=>scene.zoom(.8);
  el('zoom-in').onclick=()=>scene.zoom(1.25);
  el('fit').onclick=()=>scene.fit();
  el('battle').onclick=()=>scene.enterBattle();
  el('return').onclick=()=>scene.leaveBattle();
  el('battle-pause').onclick=()=>scene.toggleBattlePause();
  el('attack').onclick=()=>scene.attack(null);
  el('save').onclick=()=>void scene.save();
  el('load').onclick=()=>void scene.loadSaved();
  el('npc').onclick=()=>scene.talkGuide();
  el('export').onclick=()=>{
    try{
      const blob=new Blob([JSON.stringify(scene.makeSave(),null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download='lapis-save.json';
      a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){notice(String(e));}
  };
  el<HTMLInputElement>('import').onchange=async e=>{
    try{
      const f=(e.target as HTMLInputElement).files?.[0];
      if(!f)return;
      if(f.size>65536)throw new Error('Save exceeds 64 KiB');
      scene.restore(JSON.parse(await f.text()));
      char.value=scene.character;
      actions();
      skills();
      map.value=String(scene.mapId);
    }catch(err){notice(String(err));}
  };

  window.addEventListener('keydown',e=>{
    if((e.target as HTMLElement).closest('input,select,button,textarea'))return;
    const dirs:Record<string,[number,number]>={w:[0,-1],a:[-1,0],s:[0,1],d:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
    // S34A: M4 battle owns A/S/D plus Q/W/E/R; keep legacy WASD movement field-only.
    if(scene.inBattleView&&document.body.classList.contains('m4-active')&&['w','a','s','d'].includes(e.key.toLowerCase()))return;
    if(dirs[e.key]){e.preventDefault();scene.moveKey(...dirs[e.key]);}
  });

  window.addEventListener('lapis-ready',()=>{
    el('loading').hidden=true;
    window.lapisDiagnostics={snapshot:()=>scene.snapshot()};
  });

  window.addEventListener('lapis-state',e=>{
    const s=(e as CustomEvent<ReturnType<LabScene['snapshot']>>).detail;
    if(char.value!==s.character){char.value=s.character;actions();skills();}
    action.value=s.slot;
    direction.value=String(s.direction);
    map.value=String(s.mapId);
    for(const id of ['action','direction','play','step','frame','duration','effect','effect-play','effect-step']){
      (el(id) as HTMLInputElement|HTMLButtonElement).disabled=s.inBattleView;
    }
    for(const id of ['save','load','export','import','npc']){
      (el(id) as HTMLInputElement|HTMLButtonElement).disabled=s.inBattleView;
    }
    el<HTMLButtonElement>('attack').disabled=!s.actionReady;
    document.querySelectorAll<HTMLButtonElement>('#skills button').forEach(b=>b.disabled=!s.actionReady);
    el<HTMLButtonElement>('battle-pause').hidden=!s.inBattleView;
    el<HTMLButtonElement>('battle-pause').disabled=s.phase!=='active';
    el('battle-pause').textContent=s.battlePaused?'继续战斗':'暂停战斗';
    char.disabled=s.inBattleView;
    map.disabled=s.inBattleView;
    el<HTMLButtonElement>('battle').hidden=s.inBattleView;
    el<HTMLButtonElement>('return').hidden=!s.inBattleView;
    el<HTMLButtonElement>('attack').hidden=!s.inBattleView;
    el('skills').hidden=!s.inBattleView;
    el('action-wrap').hidden=!s.inBattleView;
    document.querySelector('.world')?.classList.toggle('battle-mode',s.inBattleView);
    el('map-title').textContent=`${s.inBattleView?'战斗 / ':''}${String(s.mapId).padStart(4,'0')} / ${s.mapName}`;
    const bgm=selectZoneBgm(s.mapId,undefined);
    const bgmState=bgm.path??bgm.source;
    el('bgm-state').textContent=`${bgmState} / ${bgm.provenance}`;
    el('mode-subtitle').textContent=s.inBattleView?`独立战场：battleZone ${s.battleZoneId??'--'} · ${s.battleEntryProvenance} · BGM ${bgmState}`:`非战斗地图：自由移动与资源诊断 · BGM ${bgmState}`;
    el('move-help').textContent=s.inBattleView?`战斗：行动槽满后移动（最多 ${s.moveLimit} 格）/ 选敌 / 攻击`:'非战斗：点击移动 / WASD / 滚轮缩放';
    el('quest-status').textContent=`M3重构任务：${guideStageLabel(s.quest.guide)} / RECONSTRUCTION_POLICY`;
    el('frame-count').textContent=`${s.cursor+1} / ${s.length}`;
    const slider=el<HTMLInputElement>('frame');
    slider.max=String(s.length-1);
    slider.value=String(s.cursor);
    el('play').textContent=s.playing?'暂停':'播放';
    el('raw-timing').textContent=`${s.timing} → ${s.duration.toFixed(2)} ms / ${s.timingPolicy}`;
    if(document.activeElement!==el('duration'))el<HTMLInputElement>('duration').value=String(Number(s.duration.toFixed(2)));
    el('spr-frame').textContent=String(s.frame);
    el('bounds').textContent=`${s.bounds.left}, ${s.bounds.top} → ${s.bounds.right}, ${s.bounds.bottom}`;
    el('anchor').textContent=`${s.anchor.x.toFixed(1)}, ${s.anchor.y.toFixed(1)}`;
    el('mouse').textContent=`${s.hover.x}, ${s.hover.y}`;
    el('reference').textContent=s.referenceCell.join(', ');
    el('projection').textContent=s.projectedCell.join(', ');
    el('imf').textContent=`ref: ${s.rawReference??'OUT'} / anchor: ${s.rawAnchor??'OUT'}`;
    el('resource').textContent=s.tile?`${s.tile.x},${s.tile.y} / ${s.tile.resource_id}`:'--';
    el('fps').textContent=`${s.fps} FPS`;
    el('phase').textContent=!s.inBattleView?'非战斗地图':({safe:'战斗准备',active:'战斗场景',won:'战斗胜利',lost:'战斗失败'})[s.phase];
    el('vitals').textContent=`HP ${s.hp} / MP ${s.mp} / 金币 ${s.gold}`;
    const gauge=el<HTMLProgressElement>('action-gauge');
    gauge.max=s.actionMax;
    gauge.value=s.action;
    el('action-state').textContent=s.battlePaused?'已暂停':s.busy?'行动中':s.actionReady?'可行动':`${Math.floor(s.action)} / ${s.actionMax}`;
    if(s.effect){
      effect.value=String(s.effect.id);
      el('effect-frame').textContent=`${s.effect.cursor+1} / ${s.effect.length} (SPR ${s.effect.frame})`;
      el('effect-timing').textContent=`${s.effect.rawTiming} → ${s.effect.duration.toFixed(2)} ms`;
      el('effect-play').textContent=s.effect.playing?'播放中':'诊断播放';
    }
  });
  void PROVISIONAL;
}

start().catch(fail);