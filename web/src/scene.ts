import {installInventoryPanel} from './inventory-panel.ts';
import {initialInventory,equip,equipmentBonus,changeRole} from './inventory.ts';
import Phaser from 'phaser';
import { frameIndex, textureKey, advanceClock, mapTextureKey, effectTextureKey } from './model.ts';
import type { LoadedPack, Animation, LoadedMap, EffectAsset } from './model.ts';
import { referenceCellToScreen, referenceScreenToCell, closestWalkable, rawCell, nearestAnchor, findRoute, directionFor } from './coordinates.ts';
import type { Cell } from './coordinates.ts';
import { PROVISIONAL as P } from './config.ts';
import { initialState, beginBattle, updateBattle, useAttack } from './battle.ts';
import type { Skill } from './battle.ts';
import { validateSave, writeSave, readSave } from './save.ts';
import type { Save } from './save.ts';
export class LabScene extends Phaser.Scene {
  pack: LoadedPack; character='100'; slot='00'; direction=0; cursor=0; elapsed=0;
  duration:number=P.frameDurationMs; playing=true; showGrid=false; showCollision=false; showBounds=true;
  anchor={x:768,y:384}; hover={x:0,y:0}; route: Cell[]=[]; mapId=0;
  effectId:number|null=null;effectCursor=0;effectElapsed=0;effectPlaying=false;effectDuration=P.frameDurationMs;
  inventory=initialInventory();
  state=initialState(); selectedEnemy='dummy-melee'; gold=0;
  private mapImage!:Phaser.GameObjects.Image;
  private sprite!: Phaser.GameObjects.Image;
  private companion!: Phaser.GameObjects.Image;
  private effectSprite?:Phaser.GameObjects.Image;
  private overlay!: Phaser.GameObjects.Graphics;
  private enemyLabels: Phaser.GameObjects.Text[]=[];
  private lastPublish=0;private timedAction=0;private effectUntil=0;
  private notice: (message:string)=>void;
  constructor(pack:LoadedPack, notice:(message:string)=>void){super('lab');this.pack=pack;this.notice=notice;this.character=Object.keys(pack.manifest.characters)[0];this.mapId=pack.manifest.map.id;const effect=Object.keys(pack.effects)[0];this.effectId=effect===undefined?null:Number(effect);}
  preload(){ this.load.on('loaderror',(file:Phaser.Loader.File)=>{this.notice(`资源加载失败: ${file.key}`);this.events.emit('asset-failure',file.key);}); for(const [key,url] of Object.entries(this.pack.images))this.load.image(key,url); }
  create(){
    const missing=Object.keys(this.pack.images).filter(k=>!this.textures.exists(k));
    if(missing.length){this.notice(`缺失 ${missing.length} 张图片，停止初始化`);return;}
    this.mapImage=this.add.image(0,0,mapTextureKey(this.mapId)).setOrigin(0);
    this.resetPosition();
    this.sprite=this.add.image(0,0,textureKey(this.character,'00',0)).setOrigin(0);
    const other=Object.keys(this.pack.manifest.characters).find(id=>id!==this.character)??this.character;
    const otherAnim=this.pack.animations[other]['00']; const otherIndex=frameIndex(otherAnim,0,0);const b=otherAnim.frame_bounds[otherIndex];
    this.companion=this.add.image(this.anchor.x+85+b.left,this.anchor.y+25+b.top,textureKey(other,'00',otherIndex)).setOrigin(0).setAlpha(.65);
    if(this.effectId!==null){const e=this.effect();const eb=e.frame_bounds[0];this.effectSprite=this.add.image(this.anchor.x+eb.left,this.anchor.y+eb.top,effectTextureKey(e.resource_id,0)).setOrigin(0).setVisible(false);}
    this.overlay=this.add.graphics();
    for(let i=0;i<2;i++)this.enemyLabels.push(this.add.text(0,0,'',{fontFamily:'sans-serif',fontSize:'13px',color:'#ffe0a0',backgroundColor:'#182120'}).setOrigin(.5,1));
    this.fit();this.scale.on('resize',()=>this.fit());
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{const world=this.cameras.main.getWorldPoint(p.x,p.y);this.hover={x:Math.round(world.x),y:Math.round(world.y)};});
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{const world=this.cameras.main.getWorldPoint(p.x,p.y);const enemy=this.state.enemies.find(e=>e.hp>0&&Math.hypot(e.x-world.x,e.y-world.y)<30);if(enemy){this.selectedEnemy=enemy.id;this.notice(`已选中 ${enemy.id}`);}else this.moveTo(world.x,world.y);});
    this.input.on('wheel',(_p:unknown,_o:unknown,_x:number,dy:number)=>this.zoom(dy>0?.9:1.1));
    this.events.once('shutdown',()=>this.scale.removeAllListeners('resize'));
    this.notice(this.pack.manifest.provenance?.kind==='synthetic'?'合成测试样本已加载。不是原版美术。':'真实地图、角色和诊断特效已加载。点地图移动；右侧可逐帧检查。');
    installInventoryPanel(this);
    window.dispatchEvent(new CustomEvent('lapis-ready'));
  }
  animation():Animation{return this.pack.animations[this.character][this.slot];}
  currentMap():LoadedMap{const m=this.pack.maps[String(this.mapId)];if(!m)throw new Error(`Unknown map ${this.mapId}`);return m;}
  effect():EffectAsset{if(this.effectId===null||!this.pack.effects[String(this.effectId)])throw new Error('No diagnostic effect selected');return this.pack.effects[String(this.effectId)];}
  resetPosition(){const p=referenceCellToScreen(closestWalkable(this.currentMap().collision,[22,23]));this.anchor={x:p[0],y:p[1]};this.route=[];}
  fit(){if(!this.cameras?.main)return;const {width,height}=this.currentMap().manifest.render;this.cameras.main.setZoom(Math.min(this.scale.width/width,this.scale.height/height)*.98).centerOn(width/2,height/2);}
  zoom(mult:number){this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom*mult,.25,3));}
  setMap(id:number){const next=this.pack.maps[String(id)];if(!next){this.notice(`未知地图 ${id}`);return;}if(this.state.phase==='active'){this.notice('训练战斗中不能切换地图');return;}this.mapId=id;this.mapImage?.setTexture(mapTextureKey(id));this.state=initialState();this.resetPosition();this.setAction('00');this.effectSprite?.setVisible(false);this.effectPlaying=false;this.fit();this.notice(`已切换地图 ${String(id).padStart(4,'0')} / ${next.manifest.name}`);}
  setCharacter(id:string){if(!this.pack.animations[id])return;this.character=id;this.inventory=changeRole(this.inventory,id);this.setAction('00');this.route=[];this.state=initialState();this.companion?.setVisible(false);}
  setAction(slot:string){if(!this.pack.animations[this.character][slot])return;this.timedAction=0;this.slot=slot;this.cursor=0;this.elapsed=0;}
  setDirection(direction:number){if(!Number.isInteger(direction)||direction<0||direction>7)return;this.direction=direction;this.cursor=0;this.elapsed=0;}
  setFrame(index:number){this.playing=false;this.cursor=Math.max(0,Math.min(this.animation().frames_per_direction-1,Math.floor(index)));this.elapsed=0;}
  step(){this.playing=false;this.cursor=(this.cursor+1)%this.animation().frames_per_direction;this.elapsed=0;}
  setEffect(id:number){if(!this.pack.effects[String(id)])return;this.effectId=id;this.effectCursor=0;this.effectElapsed=0;this.effectPlaying=false;if(this.effectSprite){this.effectSprite.setTexture(effectTextureKey(id,0)).setVisible(true);}this.notice(`MagicRes ${id}：仅按 SPR 文件顺序诊断播放；FOCUS 放置/时序仍未验证。`);}
  playEffect(){if(this.effectId===null)return;this.effectCursor=0;this.effectElapsed=0;this.effectPlaying=true;this.effectSprite?.setVisible(true);}
  stepEffect(){if(this.effectId===null)return;this.effectPlaying=false;this.effectCursor=(this.effectCursor+1)%this.effect().frame_count;this.effectElapsed=0;this.effectSprite?.setVisible(true);}
  moveTo(x:number,y:number){
    if(this.state.phase==='lost')return;
    const c=this.currentMap().collision,start=closestWalkable(c,nearestAnchor(this.anchor.x,this.anchor.y));
    const end=referenceScreenToCell(x,y);const route=findRoute(c,start,end);
    if(!route){this.notice('无可通行路径');return;}
    this.route=route;this.setAction('01');this.playing=true;
  }
  moveKey(dx:number,dy:number){this.moveTo(this.anchor.x+dx*64,this.anchor.y+dy*32);}
  enterBattle(){this.resetPosition();this.state=beginBattle(this.anchor.x,this.anchor.y);this.selectedEnemy='dummy-melee';this.setAction('00');this.notice('训练战斗：木桩、伤害与时序均为临时实现，非原版规则。');}
  leaveBattle(){if(this.state.phase==='won')this.gold+=this.state.reward;this.state=initialState();this.route=[];this.setAction('00');this.notice('已返回安全诊断区');}
  attack(skill:Skill|null){const result=useAttack(this.state,this.selectedEnemy,this.anchor.x,this.anchor.y,skill,equipmentBonus(this.inventory,this.character).attack);this.notice(result.message);if(result.ok){this.setAction('02');this.playing=true;this.route=[];this.timedAction=P.effectDurationMs;this.effectUntil=P.effectDurationMs;const rid=skill?.magic_pattern?.magic_resources?.[0]?.magic_resource_id;if(rid&&this.pack.effects[String(rid)]){this.setEffect(rid);this.playEffect();}}}
  equipItem(id:number|null,slot:'weapon'|'armor'){try{if(this.state.phase==='active')throw new Error('Cannot change equipment in combat');this.inventory=equip(this.inventory,id,slot,this.character);this.notice('装备已更新 / UNVERIFIED');}catch(e){this.notice(String(e));}}
  makeSave():Save {if(this.route.length)throw new Error('Wait for movement to finish');if(this.state.phase==='active')throw new Error('战斗中不能存档');return {version:1,pack:this.pack.digest,character:this.character,mapId:this.mapId,x:this.anchor.x,y:this.anchor.y,gold:this.gold+(this.state.phase==='won'?this.state.reward:0),inventory:{...this.inventory,owned:[...this.inventory.owned]},savedAt:new Date().toISOString()};}
  async save(){try{await writeSave(this.makeSave());this.notice('存档已写入浏览器 IndexedDB');}catch(e){this.notice(`存档失败，可使用导出 JSON：${String(e)}`);}}
  restore(raw:unknown){const all=Object.values(this.pack.maps).map(m=>m.manifest.render);const maxWidth=Math.max(...all.map(m=>m.width)),maxHeight=Math.max(...all.map(m=>m.height));const s=validateSave(raw,this.pack.digest,Object.keys(this.pack.manifest.characters),maxWidth,maxHeight);const mapId=s.mapId??this.pack.manifest.map.id;if(!this.pack.maps[String(mapId)])throw new Error('Unknown save map');this.setCharacter(s.character);this.setMap(mapId);if(rawCell(this.currentMap().collision,nearestAnchor(s.x,s.y))!==1)throw new Error('存档位置不可通行');this.anchor={x:s.x,y:s.y};this.gold=s.gold;this.inventory=s.inventory!;this.notice('存档恢复成功');}
  async loadSaved(){try{this.restore(await readSave());}catch(e){this.notice(`读档失败：${String(e)}`);}}
  snapshot(){const a=this.animation(),i=frameIndex(a,this.direction,this.cursor);const ref=referenceScreenToCell(this.hover.x,this.hover.y),projected=nearestAnchor(this.hover.x,this.hover.y);const tileX=Math.floor(this.hover.x/64),tileY=Math.floor(this.hover.y/32);const ins=this.currentMap().inspector;const tile=ins&&tileX>=0&&tileY>=0&&tileX<ins.width&&tileY<ins.height?ins.cells[tileX*ins.height+tileY]:null;const e=this.effectId===null?null:this.effect();
    return {inventory:{...this.inventory,owned:[...this.inventory.owned]},equipment:equipmentBonus(this.inventory,this.character),ready:!!this.sprite,mapId:this.mapId,mapName:this.currentMap().manifest.name,character:this.character,slot:this.slot,direction:this.direction,cursor:this.cursor,frame:i,length:a.frames_per_direction,bounds:a.frame_bounds[i],timing:a.raw_timing,duration:this.duration,playing:this.playing,anchor:{...this.anchor},hover:{...this.hover},referenceCell:ref,projectedCell:projected,rawReference:rawCell(this.currentMap().collision,ref),rawAnchor:rawCell(this.currentMap().collision,projected),tile:tile?{x:tileX,y:tileY,resource_id:tile.resource_id,path:tile.directory_path}:null,routeLength:this.route.length,cooldown:this.state.cooldown,phase:this.state.phase,hp:Math.ceil(this.state.hp),mp:this.state.mp,gold:this.gold+(this.state.phase==='won'?this.state.reward:0),enemies:this.state.enemies.map(enemy=>({id:enemy.id,hp:Math.ceil(enemy.hp),x:enemy.x,y:enemy.y})),target:this.selectedEnemy,effect:e?{id:e.resource_id,cursor:this.effectCursor,frame:e.sequence[this.effectCursor],length:e.frame_count,rawTiming:e.raw_timing,playing:this.effectPlaying}:null,fps:Math.round(this.game.loop.actualFps)};
  }
  update(time:number,delta:number){if(!this.sprite)return;const dt=Math.min(delta,100);
    if(this.route.length){const target=referenceCellToScreen(this.route[0]),dx=target[0]-this.anchor.x,dy=target[1]-this.anchor.y,d=Math.hypot(dx,dy),step=P.movementPixelsPerSecond*dt/1000;if(d<=step){this.anchor={x:target[0],y:target[1]};this.route.shift();if(!this.route.length)this.setAction('00');}else{this.direction=directionFor(dx,dy);this.anchor.x+=dx/d*step;this.anchor.y+=dy/d*step;}}
    if(this.timedAction>0){this.timedAction-=dt;if(this.timedAction<=0)this.setAction('00');}
    this.effectUntil=Math.max(0,this.effectUntil-dt);
    const a=this.animation();if(this.playing){const next=advanceClock(this.cursor,this.elapsed,dt,this.duration,a.frames_per_direction);this.cursor=next.cursor;this.elapsed=next.elapsed;}
    const i=frameIndex(a,this.direction,this.cursor),b=a.frame_bounds[i];this.sprite.setTexture(textureKey(this.character,this.slot,i)).setPosition(this.anchor.x+b.left,this.anchor.y+b.top).setAlpha(this.state.phase==='lost'?.3:1);
    if(this.effectId!==null&&this.effectSprite){const e=this.effect();if(this.effectPlaying){const next=advanceClock(this.effectCursor,this.effectElapsed,dt,this.effectDuration,e.frame_count);const wrapped=next.cursor<this.effectCursor;this.effectCursor=next.cursor;this.effectElapsed=next.elapsed;if(wrapped){this.effectPlaying=false;this.effectSprite.setVisible(false);}}if(this.effectSprite.visible){const ei=e.sequence[this.effectCursor],eb=e.frame_bounds[ei];this.effectSprite.setTexture(effectTextureKey(e.resource_id,ei)).setPosition(this.anchor.x+eb.left,this.anchor.y+eb.top);}}
    const before=this.state.phase;updateBattle(this.state,dt,this.anchor.x,this.anchor.y,equipmentBonus(this.inventory,this.character).defense);if(before!==this.state.phase){this.route=[];this.notice(this.state.phase==='won'?'训练胜利，结算 +10。可返回并存档。':'训练失败，可重新开始。');}
    this.drawOverlay();if(time-this.lastPublish>90){window.dispatchEvent(new CustomEvent('lapis-state',{detail:this.snapshot()}));this.lastPublish=time;}
  }
  private drawOverlay(){const g=this.overlay;g.clear();const m=this.currentMap().manifest.render;
    if(this.showGrid){g.lineStyle(1,0xf0d09b,.18);for(let x=0;x<=m.width;x+=64)g.lineBetween(x,0,x,m.height);for(let y=0;y<=m.height;y+=32)g.lineBetween(0,y,m.width,y);}
    if(this.showCollision){const c=this.currentMap().collision;for(let x=0;x<c.width;x++)for(let y=0;y<c.height;y++){if((x+y)%2)continue;const [sx,sy]=referenceCellToScreen([x,y]);g.lineStyle(1,rawCell(c,[x,y])===1?0x8edca4:0xf08472,.4);g.strokePoints([{x:sx,y:sy-16},{x:sx+32,y:sy},{x:sx,y:sy+16},{x:sx-32,y:sy}],true);}}
    if(this.route.length){g.lineStyle(2,0xf2d28b,.9);let p:Cell=[this.anchor.x,this.anchor.y];for(const cell of this.route){const n=referenceCellToScreen(cell);g.lineBetween(p[0],p[1],n[0],n[1]);p=n;}}
    if(this.showBounds){const b=this.animation().frame_bounds[frameIndex(this.animation(),this.direction,this.cursor)];g.lineStyle(1,0xe3c288,.9);g.strokeRect(this.anchor.x+b.left,this.anchor.y+b.top,b.right-b.left,b.bottom-b.top);g.lineStyle(2,0x9ce8c4);g.lineBetween(this.anchor.x-7,this.anchor.y,this.anchor.x+7,this.anchor.y);g.lineBetween(this.anchor.x,this.anchor.y-7,this.anchor.x,this.anchor.y+7);}
    this.enemyLabels.forEach(t=>t.setVisible(false));
    this.state.enemies.forEach((e,j)=>{if(e.hp<=0)return;g.fillStyle(e.id===this.selectedEnemy?0xa06b45:0x685440,1);g.fillRect(e.x-13,e.y-38,26,36);g.fillCircle(e.x,e.y-45,12);g.lineStyle(3,0xd3b387,1);g.lineBetween(e.x-23,e.y-24,e.x+23,e.y-24);g.lineBetween(e.x,e.y-35,e.x,e.y+4);g.fillStyle(0x2b3332);g.fillRect(e.x-24,e.y-66,48,5);g.fillStyle(0xe39168);g.fillRect(e.x-24,e.y-66,48*e.hp/e.maxHp,5);this.enemyLabels[j]?.setText(`${e.role==='melee'?'近战':'远程'} ${Math.ceil(e.hp)}`).setPosition(e.x,e.y-70).setVisible(true);});
    if(this.effectUntil>0){g.lineStyle(3,0xe5cb8c,this.effectUntil/P.effectDurationMs);g.strokeCircle(this.anchor.x,this.anchor.y-20,20+(P.effectDurationMs-this.effectUntil)/20);}
  }
}
