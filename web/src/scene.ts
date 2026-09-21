import {installInventoryPanel} from './inventory-panel.ts';
import {initialInventory,equip,equipmentBonus,changeRole} from './inventory.ts';
import Phaser from 'phaser';
import { frameIndex, textureKey, advanceClock, mapTextureKey, effectTextureKey } from './model.ts';
import type { LoadedPack, Animation, LoadedMap, EffectAsset } from './model.ts';
import { referenceCellToScreen, referenceScreenToCell, closestWalkable, rawCell, nearestAnchor, findRoute, directionFor } from './coordinates.ts';
import type { Cell } from './coordinates.ts';
import { PROVISIONAL as P } from './config.ts';
import { initialState, beginBattle, updateBattle, useAttack, actionReady, consumeAction } from './battle.ts';
import type { Skill,ReconstructionBattleSetup } from './battle.ts';
import { validateSave, writeSave, readSave } from './save.ts';
import type { Save } from './save.ts';
import {initialQuestState,advanceGuide} from './quest.ts';
import {chooseBattleLayout,reachableCells,tacticalRoute,pixelCell,tileDistance,cellKey} from './tactics.ts';
import {frameIntervalMs,sequenceDurationMs} from './animation-policy.ts';
import {createTrainingInteraction,OFFLINE_TRAINING_ENCOUNTER_AUTHORITY} from './runtime-boundaries.ts';
import type {BattleEntry,InteractionIntent} from './runtime-boundaries.ts';
import {ViewportController,BrowserFullscreenPort} from './view/viewport-controller.ts';
import {VisualActor} from './visual-actor.ts';
import {inflatePointerBounds,pickWorldPointerTarget,unionPointerBounds} from './input/world-pointer-arbitration.ts';
import type {WorldPointerBounds,WorldPointerTarget} from './input/world-pointer-arbitration.ts';

type FieldReturn = {mapId:number;anchor:{x:number;y:number};direction:number;camera:{x:number;y:number;zoom:number}};
export type WorldVisualSpec={id:string;mapId:number;cell:Cell;resourceId:number;label:string;kind:'npc'|'encounter'};
export type WorldMarkerSpec={id:string;mapId:number;cell:Cell;label:string};

export class LabScene extends Phaser.Scene {
  pack: LoadedPack;
  character='100';
  slot='00';
  direction=0;
  cursor=0;
  elapsed=0;
  duration:number=P.frameDurationMs;
  playing=true;
  showGrid=false;
  showCollision=false;
  showBounds=false;
  inBattleView=false;
  battlePaused=false;
  private battleFocus:{x:number;y:number;width:number;height:number}|null=null;
  private effectOrigin:{x:number;y:number}|null=null;
  anchor={x:768,y:384};
  hover={x:0,y:0};
  route: Cell[]=[];
  mapId=0;
  effectId:number|null=null;
  effectCursor=0;
  effectElapsed=0;
  effectPlaying=false;
  effectDuration=P.frameDurationMs;
  inventory=initialInventory();
  quest=initialQuestState();
  state=initialState();
  selectedEnemy='dummy-melee';
  gold=0;
  private fieldReturn:FieldReturn|null=null;
  private lastInteraction:InteractionIntent|null=null;
  private battleEntry:BattleEntry|null=null;
  private mapImage!:Phaser.GameObjects.Image;
  private sprite!: Phaser.GameObjects.Image;
  private effectSprite?:Phaser.GameObjects.Image;
  private viewport?:ViewportController;
  private cameraFollowEnabled=false;
  private reconstructionBattleSetup?:ReconstructionBattleSetup;
  private worldVisualActors=new Map<string,{spec:WorldVisualSpec;actor:VisualActor;label:Phaser.GameObjects.Text}>();
  private worldInteractionHandler?: (entityId:string)=>void;
  private worldMarkers=new Map<string,{spec:WorldMarkerSpec;label:Phaser.GameObjects.Text}>();
  private enemyVisualActors=new Map<string,VisualActor>();
  private overlay!: Phaser.GameObjects.Graphics;
  private guideLabel!:Phaser.GameObjects.Text;
  private enemyLabels: Phaser.GameObjects.Text[]=[];
  private lastPublish=0;
  private timedAction=0;
  private effectUntil=0;
  private notice: (message:string)=>void;

  constructor(pack:LoadedPack, notice:(message:string)=>void){
    super('lab');
    this.pack=pack;
    this.notice=notice;
    this.character=Object.keys(pack.manifest.characters)[0];
    this.mapId=pack.maps[String(P.defaultFieldMapId)]?P.defaultFieldMapId:pack.manifest.map.id;
    this.duration=frameIntervalMs(this.animation().raw_timing);
    const effect=Object.keys(pack.effects)[0];
    this.effectId=effect===undefined?null:Number(effect);
    if(this.effectId!==null)this.effectDuration=frameIntervalMs(this.effect().raw_timing);
  }

  preload(){
    this.load.on('loaderror',(file:Phaser.Loader.File)=>{
      this.notice(`资源加载失败: ${file.key}`);
      this.events.emit('asset-failure',file.key);
    });
    for(const [key,url] of Object.entries(this.pack.images))this.load.image(key,url);
  }

  create(){
    const missing=Object.keys(this.pack.images).filter(k=>!this.textures.exists(k));
    if(missing.length){
      this.notice(`缺失 ${missing.length} 张图片，停止初始化`);
      return;
    }
    this.mapImage=this.add.image(0,0,mapTextureKey(this.mapId)).setOrigin(0).setDepth(0);
    this.resetPosition();
    this.sprite=this.add.image(0,0,textureKey(this.character,'00',0)).setOrigin(0).setDepth(20);
    if(this.effectId!==null){
      const e=this.effect();
      const eb=e.frame_bounds[0];
      this.effectSprite=this.add.image(this.anchor.x+eb.left,this.anchor.y+eb.top,effectTextureKey(e.resource_id,0)).setOrigin(0).setDepth(30).setVisible(false);
    }
    this.overlay=this.add.graphics().setDepth(40);
    this.guideLabel=this.add.text(0,0,'M3 引导员\nRECONSTRUCTION',{
      fontFamily:'sans-serif',fontSize:'11px',color:'#f1d39a',backgroundColor:'#172322cc',align:'center',padding:{x:5,y:3}
    }).setOrigin(.5,1).setDepth(50);
    this.updateGuideLabel();
    for(let i=0;i<2;i++)this.enemyLabels.push(this.add.text(0,0,'',{
      fontFamily:'sans-serif',fontSize:'13px',color:'#ffe0a0',backgroundColor:'#182120'
    }).setOrigin(.5,1).setDepth(50));
    this.setupViewport();
    this.ensureEnemyVisualActors();
    this.fit();
    this.scale.on('resize',()=>this.viewport?.reclamp());
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{
      const world=this.cameras.main.getWorldPoint(p.x,p.y);
      this.hover={x:Math.round(world.x),y:Math.round(world.y)};
      this.game.canvas.style.cursor=!this.inBattleView&&this.worldPointerTargetAt(world.x,world.y)?'pointer':'default';
    });
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
      const world=this.cameras.main.getWorldPoint(p.x,p.y);
      if(!this.inBattleView){
        const target=this.worldPointerTargetAt(world.x,world.y);
        if(target){
          if(this.worldInteractionHandler)this.worldInteractionHandler(target.id);
          else this.notice('NPC 交互运行时尚未接入');
          return;
        }
      }
      if(this.inBattleView){
        const enemy=this.state.enemies.find(e=>e.hp>0&&Math.hypot(e.x-world.x,e.y-world.y)<30);
        if(enemy){
          this.selectedEnemy=enemy.id;
          this.notice(`已选中 ${enemy.id}`);
          return;
        }
      }
      this.moveTo(world.x,world.y);
    });
    this.input.on('wheel',(_p:unknown,_o:unknown,_x:number,dy:number)=>{if(this.viewport)this.viewport.handleWheel(dy);else this.zoom(dy>0?.9:1.1);});
    this.events.once('shutdown',()=>this.scale.removeAllListeners('resize'));
    this.notice(this.pack.manifest.provenance?.kind==='synthetic'
      ?'合成测试样本已加载。不是原版美术。'
      :'真实地图、角色和诊断特效已加载。当前为非战斗地图；战斗入口通过显式 authority/battle-entry 边界。');
    installInventoryPanel(this);
    window.dispatchEvent(new CustomEvent('lapis-ready'));
  }

  animation():Animation{return this.pack.animations[this.character][this.slot];}
  currentMap():LoadedMap{
    const m=this.pack.maps[String(this.mapId)];
    if(!m)throw new Error(`Unknown map ${this.mapId}`);
    return m;
  }
  effect():EffectAsset{
    if(this.effectId===null||!this.pack.effects[String(this.effectId)])throw new Error('No diagnostic effect selected');
    return this.pack.effects[String(this.effectId)];
  }
  // State 3 is a recovered hit presentation. It does not, by itself, prove a
  // retail command lock, so only route execution and non-hit transient actions
  // gate input in the reconstruction runtime.
  private busy():boolean{return this.route.length>0||(this.slot!=='03'&&this.timedAction>0);}
  canAct():boolean{return this.inBattleView&&!this.battlePaused&&!document.hidden&&!this.busy()&&actionReady(this.state);}
  private occupiedCells():Cell[]{return this.state.enemies.filter(e=>e.hp>0).map(e=>pixelCell(e.x,e.y));}
  private reachable():Cell[][]{return this.canAct()?[...reachableCells(this.currentMap().collision,pixelCell(this.anchor.x,this.anchor.y),this.battleMoveLimit(),this.occupiedCells()).values()].filter(p=>p.length>1):[];}
  toggleBattlePause(){if(this.inBattleView&&this.state.phase==='active')this.battlePaused=!this.battlePaused;}
  private battleMoveLimit():number{return Number(this.character)%10===9?P.wizardMoveCells:P.swordsmanMoveCells;}

  resetPosition(){
    const p=referenceCellToScreen(closestWalkable(this.currentMap().collision,[22,23]));
    this.anchor={x:p[0],y:p[1]};
    this.route=[];
  }

  private updateGuideLabel(){
    if(!this.guideLabel)return;
    if(this.worldVisualActors.size){this.guideLabel.setVisible(false);return;}
    const preferred:Cell=this.mapId===0?[26,23]:[34,39];
    const cell=closestWalkable(this.currentMap().collision,preferred);
    const p=referenceCellToScreen(cell);
    this.guideLabel.setPosition(p[0],p[1]-18).setVisible(!this.inBattleView&&this.state.phase==='safe');
  }

  private setupViewport(){
    const target=document.querySelector<HTMLElement>('.world')??document.getElementById('canvas-host');
    const host=document.getElementById('canvas-host');
    let lastViewportSize={width:this.scale.width,height:this.scale.height};
    if(lastViewportSize.width<=0||lastViewportSize.height<=0){
      lastViewportSize={width:host?.clientWidth??0,height:host?.clientHeight??0};
    }
    const port={
      viewportSize:()=>{
        const width=this.scale.width,height=this.scale.height;
        if(width>0&&height>0)lastViewportSize={width,height};
        return{...lastViewportSize};
      },
      worldBounds:()=>({x:0,y:0,width:this.currentMap().manifest.render.width,height:this.currentMap().manifest.render.height}),
      cameraState:()=>{
        const camera=this.cameras.main,origin=camera.getWorldPoint(0,0);
        return{scrollX:origin.x,scrollY:origin.y,zoom:camera.zoom};
      },
      resize:(width:number,height:number)=>{if(this.scale.width!==width||this.scale.height!==height)this.scale.resize(width,height);},
      setZoom:(zoom:number)=>void this.cameras.main.setZoom(zoom),
      setScroll:(scrollX:number,scrollY:number)=>{
        const zoom=this.cameras.main.zoom;
        this.cameras.main.centerOn(scrollX+this.scale.width/(2*zoom),scrollY+this.scale.height/(2*zoom));
      },
    };
    this.viewport=new ViewportController(port,target?new BrowserFullscreenPort(document,target):undefined);
  }
  fit(){
    if(!this.cameras?.main)return;
    if(this.viewport){
      if(this.inBattleView&&this.battleFocus){
        const f=this.battleFocus;
        this.viewport.frameRect({x:f.x-f.width/2,y:f.y-f.height/2,width:f.width,height:f.height});
        return;
      }
      this.viewport.fitWorld();return;
    }
    if(this.inBattleView&&this.battleFocus){const f=this.battleFocus;this.cameras.main.setZoom(Math.min(this.scale.width/f.width,this.scale.height/f.height)*.96).centerOn(f.x,f.y);return;}
    const {width,height}=this.currentMap().manifest.render;
    this.cameras.main.setZoom(Math.min(this.scale.width/width,this.scale.height/height)*.98).centerOn(width/2,height/2);
  }
  focusPlayer(){
    if(this.viewport){this.viewport.resetZoom();this.viewport.centerOn(this.anchor);}
    else this.cameras.main.setZoom(1).centerOn(this.anchor.x,this.anchor.y);
  }
  setPlayerCameraFollow(enabled:boolean){this.cameraFollowEnabled=enabled;if(enabled)this.viewport?.centerOn(this.anchor);}
  zoom(mult:number){if(this.viewport)this.viewport.setZoom(this.cameras.main.zoom*mult);else this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom*mult,.25,3));}
  zoomIn(){return this.viewport?.zoomIn()??this.zoom(1.25)}
  zoomOut(){return this.viewport?.zoomOut()??this.zoom(.8)}
  resetZoom(){if(this.viewport)return this.viewport.resetZoom();this.cameras.main.setZoom(1);return 1;}
  async toggleFullscreen(){return this.viewport?.toggleFullscreen()??false}
  viewportSnapshot(){return this.viewport?.snapshot()??null}

  setWorldInteractionHandler(handler:((entityId:string)=>void)|undefined){this.worldInteractionHandler=handler;}

  private worldPointerTargets():WorldPointerTarget[]{
    const targets:WorldPointerTarget[]=[];
    for(const row of this.worldVisualActors.values()){
      if(!row.actor.image.visible||row.spec.mapId!==this.mapId)continue;
      const image=row.actor.image.getBounds();
      let bounds:WorldPointerBounds={left:image.x,top:image.y,right:image.x+image.width,bottom:image.y+image.height};
      if(row.label.visible){
        const label=row.label.getBounds();
        bounds=unionPointerBounds(bounds,{left:label.x,top:label.y,right:label.x+label.width,bottom:label.y+label.height});
      }
      targets.push({id:row.spec.id,kind:row.spec.kind,visible:true,bounds:inflatePointerBounds(bounds),depth:row.actor.image.depth});
    }
    return targets;
  }

  private worldPointerTargetAt(x:number,y:number):WorldPointerTarget|null{
    return pickWorldPointerTarget({x,y},this.worldPointerTargets(),'npc');
  }

  setReconstructionBattleSetup(setup:ReconstructionBattleSetup|undefined){this.reconstructionBattleSetup=setup;}

  configureWorldVisuals(specs:readonly WorldVisualSpec[]){
    for(const row of this.worldVisualActors.values()){row.actor.destroy();row.label.destroy();}
    this.worldVisualActors.clear();
    for(const spec of specs){
      if(!this.pack.animations[String(spec.resourceId)])continue;
      const [x,y]=referenceCellToScreen(spec.cell);
      const actor=new VisualActor(this,this.pack,String(spec.resourceId),x,y,0);actor.image.setDepth(10);
      const label=this.add.text(x,y-58,spec.label,{fontFamily:'sans-serif',fontSize:'12px',color:'#f4e6bd',backgroundColor:'#14201dcc',padding:{x:4,y:2}}).setOrigin(.5,1).setDepth(50);
      this.worldVisualActors.set(spec.id,{spec:{...spec},actor,label});
    }
    if(this.worldVisualActors.size)this.guideLabel.setVisible(false);
    this.refreshRecoveredVisualVisibility();
  }

  configureWorldMarkers(specs:readonly WorldMarkerSpec[]){
    for(const row of this.worldMarkers.values())row.label.destroy();
    this.worldMarkers.clear();
    for(const spec of specs){
      const [x,y]=referenceCellToScreen(spec.cell);
      const label=this.add.text(x,y-12,spec.label,{fontFamily:'sans-serif',fontSize:'13px',color:'#fff0b8',backgroundColor:'#4b3828dd',padding:{x:6,y:3}}).setOrigin(.5,1).setDepth(50);
      this.worldMarkers.set(spec.id,{spec:{...spec},label});
    }
    this.refreshRecoveredVisualVisibility();
  }

  private ensureEnemyVisualActors(){
    const bindings=new Map<string,number>([['dummy-melee',4524],['dummy-ranged',4544]]);
    for(const enemy of this.state.enemies){
      if(enemy.visualResourceId!==undefined)bindings.set(enemy.id,enemy.visualResourceId);
    }
    for(const [id,resourceId] of bindings){
      const resource=String(resourceId);
      if(this.enemyVisualActors.has(id)||!this.pack.animations[resource])continue;
      const actor=new VisualActor(this,this.pack,resource,0,0,0);actor.image.setDepth(12);actor.setVisible(false);
      this.enemyVisualActors.set(id,actor);
    }
  }

  private refreshRecoveredVisualVisibility(){
    for(const row of this.worldVisualActors.values()){
      const visible=!this.inBattleView&&row.spec.mapId===this.mapId;
      row.actor.setVisible(visible);row.label.setVisible(visible);
    }
    for(const row of this.worldMarkers.values())row.label.setVisible(!this.inBattleView&&row.spec.mapId===this.mapId);
    for(const actor of this.enemyVisualActors.values())actor.setVisible(false);
    if(this.inBattleView){
      for(const enemy of this.state.enemies)this.enemyVisualActors.get(enemy.id)?.setVisible(enemy.hp>0);
    }
  }

  setMap(id:number){
    const next=this.pack.maps[String(id)];
    if(!next){this.notice(`未知地图 ${id}`);return;}
    if(this.inBattleView){this.notice('战斗画面中不能切换非战斗地图');return;}
    this.mapId=id;
    this.mapImage?.setTexture(mapTextureKey(id));
    this.state=initialState();
    this.resetPosition();
    this.setAction('00');
    this.effectSprite?.setVisible(false);
    this.effectPlaying=false;
    this.updateGuideLabel();
    this.refreshRecoveredVisualVisibility();
    this.fit();
    this.notice(`已切换非战斗地图 ${String(id).padStart(4,'0')} / ${next.manifest.name}`);
  }

  setCharacter(id:string){
    if(!this.pack.animations[id])return;
    if(this.inBattleView){this.notice('请先退出战斗画面再切换主角');return;}
    this.character=id;
    this.inventory=changeRole(this.inventory,id);
    this.setAction('00');
    this.route=[];
    this.state=initialState();
    this.updateGuideLabel();
  }
  setAction(slot:string){
    if(!this.pack.animations[this.character][slot])return;
    this.timedAction=0;
    this.slot=slot;
    this.cursor=0;
    this.elapsed=0;
    this.duration=frameIntervalMs(this.animation().raw_timing);
  }
  private setTransientAction(slot:'02'|'03'){
    if(!this.pack.animations[this.character][slot])return;
    this.setAction(slot);
    this.playing=true;
    this.timedAction=sequenceDurationMs(this.animation().raw_timing,this.animation().frames_per_direction);
  }
  setDirection(direction:number){
    if(!Number.isInteger(direction)||direction<0||direction>7)return;
    this.direction=direction;
    this.cursor=0;
    this.elapsed=0;
  }
  setFrame(index:number){
    this.playing=false;
    this.cursor=Math.max(0,Math.min(this.animation().frames_per_direction-1,Math.floor(index)));
    this.elapsed=0;
  }
  step(){
    this.playing=false;
    this.cursor=(this.cursor+1)%this.animation().frames_per_direction;
    this.elapsed=0;
  }

  setEffect(id:number){
    if(!this.pack.effects[String(id)])return;
    this.effectId=id;
    this.effectOrigin=null;
    this.effectCursor=0;
    this.effectElapsed=0;
    this.effectPlaying=false;
    this.effectDuration=frameIntervalMs(this.effect().raw_timing);
    if(this.effectSprite)this.effectSprite.setTexture(effectTextureKey(id,0)).setVisible(true);
    this.notice(`MagicRes ${id}：ANI timing 使用已恢复 common consumer；FOCUS 放置/混合/阶段仍未验证。`);
  }
  playEffect(){
    if(this.effectId===null)return;
    this.effectCursor=0;
    this.effectElapsed=0;
    this.effectPlaying=true;
    this.effectSprite?.setVisible(true);
  }
  stepEffect(){
    if(this.effectId===null)return;
    this.effectPlaying=false;
    this.effectCursor=(this.effectCursor+1)%this.effect().frame_count;
    this.effectElapsed=0;
    this.effectSprite?.setVisible(true);
  }

  moveTo(x:number,y:number){
    if(this.inBattleView&&!this.canAct()){this.notice('行动未就绪、正在执行或战斗已暂停');return;}
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const c=this.currentMap().collision;
    const start=closestWalkable(c,nearestAnchor(this.anchor.x,this.anchor.y));
    const end=referenceScreenToCell(x,y);
    const found=this.inBattleView?tacticalRoute(c,start,end,this.battleMoveLimit(),this.occupiedCells()):findRoute(c,start,end);
    if(!found){this.notice('无可通行路径');return;}
    const nextRoute=found.slice(1);
    if(!nextRoute.length)return;
    if(this.inBattleView){
      if(this.state.phase!=='active'){this.notice('当前战斗已结束，请返回非战斗地图');return;}
      if(!actionReady(this.state)){this.notice('行动槽尚未蓄满');return;}
      const limit=this.battleMoveLimit();
      if(nextRoute.length>limit){this.notice(`超出本次战斗移动范围：${nextRoute.length} > ${limit}`);return;}
      if(!consumeAction(this.state)){this.notice('行动槽尚未蓄满');return;}
    }
    this.route=nextRoute;
    this.setAction('01');
    this.playing=true;
  }

  moveKey(dx:number,dy:number){this.moveTo(this.anchor.x+dx*64,this.anchor.y+dy*32);}

  talkGuide(){
    if(this.inBattleView){this.notice('战斗画面中不能推进非战斗任务');return;}
    const result=advanceGuide(this.quest,this.mapId);
    this.quest=result.state;
    if(result.transitionMapId!==null)this.setMap(result.transitionMapId);
    this.updateGuideLabel();
    this.notice(`${result.message} / RECONSTRUCTION_POLICY`);
  }

  enterBattle(entryOverride?:BattleEntry){
    if(this.inBattleView)return;
    if(this.route.length){this.notice('请等角色停稳后进入战斗');return;}
    const intent=createTrainingInteraction(this.mapId);
    const entry=entryOverride??OFFLINE_TRAINING_ENCOUNTER_AUTHORITY.resolve(intent,{trainingBattleZoneId:P.battleMapId});
    if(!entry){this.notice('当前交互没有产生战斗入口');return;}
    this.lastInteraction=intent;
    this.applyBattleEntry(entry);
  }

  private applyBattleEntry(entry:BattleEntry){
    const map=this.pack.maps[String(entry.battleZoneId)];
    if(!map){this.notice(`缺少 battleZone ${entry.battleZoneId} 资源`);return;}
    let layout:ReturnType<typeof chooseBattleLayout>;
    try{layout=chooseBattleLayout(map.collision);}catch(e){this.notice(String(e));return;}
    const camera=this.cameras.main,center=camera.getWorldPoint(this.scale.width/2,this.scale.height/2);
    this.fieldReturn={mapId:this.mapId,anchor:{...this.anchor},direction:this.direction,camera:{x:center.x,y:center.y,zoom:camera.zoom}};
    this.battleEntry=entry;
    this.inBattleView=true;
    this.battlePaused=false;
    this.mapId=entry.battleZoneId;
    this.mapImage.setTexture(mapTextureKey(this.mapId));
    this.battleFocus=layout.focus;
    const pos=referenceCellToScreen(layout.player);this.anchor={x:pos[0],y:pos[1]};
    this.route=[];
    this.state=beginBattle(this.anchor.x,this.anchor.y,entry,this.reconstructionBattleSetup);
    layout.enemies.forEach((cell,i)=>{const enemy=this.state.enemies[i];if(!enemy)return;const xy=referenceCellToScreen(cell);enemy.x=xy[0];enemy.y=xy[1];});
    this.ensureEnemyVisualActors();
    this.fit();
    this.selectedEnemy=this.state.enemies.find(enemy=>enemy.hp>0)?.id??'dummy-melee';
    this.setAction('00');
    this.effectSprite?.setVisible(false);
    this.effectPlaying=false;
    this.updateGuideLabel();
    this.refreshRecoveredVisualVisibility();
    this.notice(`已进入 battleZone ${entry.battleZoneId} / ${entry.provenance}。训练 encounter authority 仍为离线重构策略。`);
  }

  leaveBattle(){
    if(!this.inBattleView)return;
    if(this.state.phase==='won')this.gold+=this.state.reward;
    const back=this.fieldReturn;
    this.inBattleView=false;
    this.fieldReturn=null;
    this.battleEntry=null;
    this.battleFocus=null;
    this.battlePaused=false;
    this.effectOrigin=null;
    this.state=initialState();
    this.route=[];
    this.setAction('00');
    if(back){
      this.mapId=back.mapId;
      this.mapImage?.setTexture(mapTextureKey(back.mapId));
      this.anchor={...back.anchor};
      this.direction=back.direction;
    }
    this.effectSprite?.setVisible(false);
    this.effectPlaying=false;
    this.updateGuideLabel();
    this.refreshRecoveredVisualVisibility();
    if(back)this.cameras.main.setZoom(back.camera.zoom).centerOn(back.camera.x,back.camera.y);else this.fit();
    this.notice('已退出战斗画面，返回非战斗地图');
  }

  attack(skill:Skill|null){
    if(!this.inBattleView){this.notice('非战斗状态不能使用战斗指令');return;}
    if(!this.canAct()){this.notice('请等待行动就绪');return;}
    const target=this.state.enemies.find(e=>e.id===this.selectedEnemy&&e.hp>0);
    const buff=skill?.skill_id===1301||skill?.skill_id===19301;
    const range=skill&&skill.skill_id>=19000?P.battleSpellRangeCells:1;
    if(!buff&&target&&tileDistance(pixelCell(this.anchor.x,this.anchor.y),pixelCell(target.x,target.y))>range){this.notice(`目标超出格子射程（${range}格）`);return;}
    const staffOrdinaryHit=!skill&&Number(this.character)%10===9&&this.inventory.weapon!==null;
    const result=useAttack(this.state,this.selectedEnemy,this.anchor.x,this.anchor.y,skill,equipmentBonus(this.inventory,this.character).attack,{staffOrdinaryHit});
    this.notice(result.message);
    if(result.ok){
      if(!buff&&target)this.direction=directionFor(target.x-this.anchor.x,target.y-this.anchor.y);
      this.setTransientAction('02');
      this.route=[];
      this.effectUntil=P.effectDurationMs;
      if(result.event&&result.event.target!=='player')this.enemyVisualActors.get(result.event.target)?.playTransient('03');
      const rid=skill?.magic_pattern?.magic_resources?.[0]?.magic_resource_id;
      if(rid&&this.pack.effects[String(rid)]){
        this.setEffect(rid);
        this.effectOrigin=!buff&&target?{x:target.x,y:target.y}:{...this.anchor};
        this.playEffect();
      }
    }
  }

  presentM7SkillAction(targetIds:readonly string[],magicResourceId?:number,selfTarget=false){
    if(!this.inBattleView)return;
    const targets=targetIds
      .map(id=>this.state.enemies.find(enemy=>enemy.id===id&&enemy.hp>0))
      .filter((enemy):enemy is NonNullable<typeof enemy>=>!!enemy);
    const primary=targets[0];
    if(primary&&!selfTarget)this.direction=directionFor(primary.x-this.anchor.x,primary.y-this.anchor.y);
    this.setTransientAction('02');
    this.route=[];
    this.effectUntil=P.effectDurationMs;
    for(const target of targets)this.enemyVisualActors.get(target.id)?.playTransient('03');
    if(magicResourceId!==undefined&&this.pack.effects[String(magicResourceId)]){
      this.setEffect(magicResourceId);
      this.effectOrigin=selfTarget||!primary?{...this.anchor}:{x:primary.x,y:primary.y};
      this.playEffect();
    }
  }

  equipItem(id:number|null,slot:'weapon'|'armor'){
    try{
      if(this.inBattleView)throw new Error('Cannot change equipment in combat');
      this.inventory=equip(this.inventory,id,slot,this.character);
      this.notice('装备已更新 / UNVERIFIED');
    }catch(e){this.notice(String(e));}
  }

  makeSave():Save {
    if(this.route.length)throw new Error('Wait for movement to finish');
    if(this.inBattleView)throw new Error('战斗画面中不能存档，请先返回非战斗地图');
    return {
      version:1,pack:this.pack.digest,character:this.character,mapId:this.mapId,x:this.anchor.x,y:this.anchor.y,
      gold:this.gold,inventory:{...this.inventory,owned:[...this.inventory.owned]},quest:{...this.quest},savedAt:new Date().toISOString()
    };
  }
  async save(){
    try{await writeSave(this.makeSave());this.notice('存档已写入浏览器 IndexedDB');}
    catch(e){this.notice(`存档失败，可使用导出 JSON：${String(e)}`);}
  }
  restore(raw:unknown){
    if(this.inBattleView)throw new Error('请先退出战斗再读档');
    const all=Object.values(this.pack.maps).map(m=>m.manifest.render);
    const maxWidth=Math.max(...all.map(m=>m.width)),maxHeight=Math.max(...all.map(m=>m.height));
    const s=validateSave(raw,this.pack.digest,Object.keys(this.pack.manifest.characters),maxWidth,maxHeight);
    const mapId=s.mapId??this.pack.manifest.map.id;
    const destination=this.pack.maps[String(mapId)];
    if(!destination)throw new Error('Unknown save map');
    if(s.x>destination.manifest.render.width||s.y>destination.manifest.render.height||rawCell(destination.collision,nearestAnchor(s.x,s.y))!==1)throw new Error('存档位置不可通行');
    this.inBattleView=false;
    this.fieldReturn=null;
    this.battleEntry=null;
    this.setCharacter(s.character);
    this.setMap(mapId);
    this.anchor={x:s.x,y:s.y};
    this.gold=s.gold;
    this.inventory=s.inventory!;
    this.quest=s.quest!;
    this.updateGuideLabel();
    this.notice('存档恢复成功');
  }
  async loadSaved(){
    try{this.restore(await readSave());}
    catch(e){this.notice(`读档失败：${String(e)}`);}
  }

  snapshot(){
    const a=this.animation(),i=frameIndex(a,this.direction,this.cursor);
    const ref=referenceScreenToCell(this.hover.x,this.hover.y),projected=nearestAnchor(this.hover.x,this.hover.y);
    const tileX=Math.floor(this.hover.x/64),tileY=Math.floor(this.hover.y/32);
    const ins=this.currentMap().inspector;
    const tile=ins&&tileX>=0&&tileY>=0&&tileX<ins.width&&tileY<ins.height?ins.cells[tileX*ins.height+tileY]:null;
    const e=this.effectId===null?null:this.effect();
    const cam=this.cameras.main,origin=cam.getWorldPoint(0,0);
    return {
      camera:{x:origin.x,y:origin.y,zoom:cam.zoom},viewport:this.viewportSnapshot(),cameraFollow:this.cameraFollowEnabled,
      debugBounds:this.showBounds,routeLineVisible:false,busy:this.busy(),battlePaused:this.battlePaused,
      battleCell:pixelCell(this.anchor.x,this.anchor.y),
      reachable:this.reachable().map(p=>p.at(-1)!),
      fieldReturn:this.fieldReturn?{mapId:this.fieldReturn.mapId,anchor:{...this.fieldReturn.anchor}}:null,
      lastInteraction:this.lastInteraction?{...this.lastInteraction}:null,
      battleEntry:this.battleEntry?{...this.battleEntry}:null,
      inventory:{...this.inventory,owned:[...this.inventory.owned]},equipment:equipmentBonus(this.inventory,this.character),quest:{...this.quest},
      ready:!!this.sprite,inBattleView:this.inBattleView,mapId:this.mapId,mapName:this.currentMap().manifest.name,character:this.character,
      slot:this.slot,direction:this.direction,cursor:this.cursor,frame:i,length:a.frames_per_direction,bounds:a.frame_bounds[i],timing:a.raw_timing,
      duration:this.duration,timingPolicy:'RETAIL_COMMON' as const,playing:this.playing,anchor:{...this.anchor},hover:{...this.hover},referenceCell:ref,projectedCell:projected,
      rawReference:rawCell(this.currentMap().collision,ref),rawAnchor:rawCell(this.currentMap().collision,projected),
      tile:tile?{x:tileX,y:tileY,resource_id:tile.resource_id,path:tile.directory_path}:null,routeLength:this.route.length,
      cooldown:this.state.cooldown,action:this.state.action,actionMax:this.state.actionMax,actionReady:this.canAct(),moveLimit:this.battleMoveLimit(),
      phase:this.state.phase,hp:Math.ceil(this.state.hp),mp:this.state.mp,gold:this.gold,
      battleZoneId:this.state.battleZoneId,battleEntryProvenance:this.state.battleEntryProvenance,damagePolicy:{id:this.state.damagePolicyId,provenance:this.state.damagePolicyProvenance},
      enemies:this.state.enemies.map(enemy=>({id:enemy.id,hp:Math.ceil(enemy.hp),maxHp:enemy.maxHp,x:enemy.x,y:enemy.y,action:enemy.action,cell:pixelCell(enemy.x,enemy.y),visualResourceId:enemy.visualResourceId??(enemy.id==='dummy-melee'?4524:enemy.id==='dummy-ranged'?4544:null),aiBinding:{...enemy.aiBinding}})),target:this.selectedEnemy,
      worldVisuals:[...this.worldVisualActors.values()].map(row=>({id:row.spec.id,mapId:row.spec.mapId,resourceId:row.spec.resourceId,visible:row.actor.image.visible,cell:row.spec.cell})),
      worldPointerTargets:this.worldPointerTargets().map(target=>({id:target.id,kind:target.kind,visible:target.visible,bounds:{...target.bounds},depth:target.depth})),
      effect:e?{id:e.resource_id,cursor:this.effectCursor,frame:e.sequence[this.effectCursor],length:e.frame_count,rawTiming:e.raw_timing,duration:this.effectDuration,timingPolicy:'RETAIL_COMMON' as const,playing:this.effectPlaying}:null,
      fps:Math.round(this.game.loop.actualFps)
    };
  }

  update(time:number,delta:number){
    if(!this.sprite)return;
    const dt=this.inBattleView&&(this.battlePaused||document.hidden)?0:Math.min(delta,100);
    if(this.route.length){
      const target=referenceCellToScreen(this.route[0]),dx=target[0]-this.anchor.x,dy=target[1]-this.anchor.y,d=Math.hypot(dx,dy),step=P.movementPixelsPerSecond*dt/1000;
      if(d<=step){
        if(d>0)this.direction=directionFor(dx,dy);
        this.anchor={x:target[0],y:target[1]};
        this.route.shift();
        if(!this.route.length)this.setAction('00');
      }else{
        this.direction=directionFor(dx,dy);
        this.anchor.x+=dx/d*step;
        this.anchor.y+=dy/d*step;
      }
    }
    if(!this.inBattleView&&this.cameraFollowEnabled)this.viewport?.follow(this.anchor,dt);
    if(this.timedAction>0){
      this.timedAction=Math.max(0,this.timedAction-dt);
      if(this.timedAction<=0)this.setAction('00');
    }
    this.effectUntil=Math.max(0,this.effectUntil-dt);
    const a=this.animation();
    if(this.playing){
      const next=advanceClock(this.cursor,this.elapsed,dt,this.duration,a.frames_per_direction);
      this.cursor=next.cursor;
      this.elapsed=next.elapsed;
    }
    const i=frameIndex(a,this.direction,this.cursor),b=a.frame_bounds[i];
    this.sprite.setTexture(textureKey(this.character,this.slot,i)).setPosition(this.anchor.x+b.left,this.anchor.y+b.top).setAlpha(this.state.phase==='lost'?.3:1);
    if(this.effectId!==null&&this.effectSprite){
      const e=this.effect();
      if(this.effectPlaying){
        const next=advanceClock(this.effectCursor,this.effectElapsed,dt,this.effectDuration,e.frame_count);
        const wrapped=this.effectCursor+Math.floor((this.effectElapsed+dt)/this.effectDuration)>=e.frame_count;
        this.effectCursor=next.cursor;
        this.effectElapsed=next.elapsed;
        if(wrapped){this.effectPlaying=false;this.effectSprite.setVisible(false);}
      }
      if(this.effectSprite.visible){
        const ei=e.sequence[this.effectCursor],eb=e.frame_bounds[ei];
        const origin=this.effectOrigin??this.anchor;
        this.effectSprite.setTexture(effectTextureKey(e.resource_id,ei)).setPosition(origin.x+eb.left,origin.y+eb.top);
      }
    }
    const before=this.state.phase;
    const events=updateBattle(this.state,dt,this.anchor.x,this.anchor.y,equipmentBonus(this.inventory,this.character).defense,
      this.inBattleView?{collision:this.currentMap().collision,playerBusy:this.busy(),reserved:this.route}:undefined);
    if(events.some(event=>event.kind==='hp-loss'&&event.target==='player')&&this.state.phase==='active')this.setTransientAction('03');
    for(const event of events){
      if(event.target==='player'&&event.source)this.enemyVisualActors.get(event.source)?.playTransient('02');
      else if(event.target!=='player')this.enemyVisualActors.get(event.target)?.playTransient('03');
    }
    for(const row of this.worldVisualActors.values())row.actor.update(dt);
    for(const enemy of this.state.enemies){
      const actor=this.enemyVisualActors.get(enemy.id);if(!actor)continue;
      actor.setVisible(this.inBattleView&&enemy.hp>0).setAnchor(enemy.x,enemy.y).setDirection(directionFor(this.anchor.x-enemy.x,this.anchor.y-enemy.y)).setAlpha(enemy.hp>0?1:.25);
      actor.update(dt);
    }
    if(before!==this.state.phase){
      this.route=[];
      this.updateGuideLabel();
      this.notice(this.state.phase==='won'?'训练胜利。点击“退出战斗”返回非战斗地图。':'训练失败。点击“退出战斗”返回非战斗地图。');
    }
    this.drawOverlay();
    if(time-this.lastPublish>90){
      window.dispatchEvent(new CustomEvent('lapis-state',{detail:this.snapshot()}));
      this.lastPublish=time;
    }
  }

  private drawOverlay(){
    const g=this.overlay;
    g.clear();
    const m=this.currentMap().manifest.render;
    // Movement cells are battle UI, not a route polyline or sprite bounds.
    if(this.inBattleView){
      for(const path of this.reachable()){const cell=path.at(-1)!,[x,y]=referenceCellToScreen(cell);
        g.fillStyle(0x7db5a5,.22);g.lineStyle(1,0xb8d4a1,.55);
        const points=[{x,y:y-16},{x:x+32,y},{x,y:y+16},{x:x-32,y}];
        g.fillPoints(points,true);g.strokePoints(points,true);
      }
    }
    if(this.showGrid){
      g.lineStyle(1,0xf0d09b,.18);
      for(let x=0;x<=m.width;x+=64)g.lineBetween(x,0,x,m.height);
      for(let y=0;y<=m.height;y+=32)g.lineBetween(0,y,m.width,y);
    }
    if(this.showCollision){
      const c=this.currentMap().collision;
      for(let x=0;x<c.width;x++)for(let y=0;y<c.height;y++){
        if((x+y)%2)continue;
        const [sx,sy]=referenceCellToScreen([x,y]);
        g.lineStyle(1,rawCell(c,[x,y])===1?0x8edca4:0xf08472,.4);
        g.strokePoints([{x:sx,y:sy-16},{x:sx+32,y:sy},{x:sx,y:sy+16},{x:sx-32,y:sy}],true);
      }
    }
    // Intentionally no route polyline: manual validation showed it is a debug
    // artifact that should not appear during normal movement.
    if(this.showBounds){
      const b=this.animation().frame_bounds[frameIndex(this.animation(),this.direction,this.cursor)];
      g.lineStyle(1,0xe3c288,.9);
      g.strokeRect(this.anchor.x+b.left,this.anchor.y+b.top,b.right-b.left,b.bottom-b.top);
      g.lineStyle(2,0x9ce8c4);
      g.lineBetween(this.anchor.x-7,this.anchor.y,this.anchor.x+7,this.anchor.y);
      g.lineBetween(this.anchor.x,this.anchor.y-7,this.anchor.x,this.anchor.y+7);
    }
    this.enemyLabels.forEach(t=>t.setVisible(false));
    if(this.inBattleView){
      this.state.enemies.forEach((e,j)=>{
        if(e.hp<=0)return;
        if(!this.enemyVisualActors.has(e.id)){
          g.fillStyle(e.id===this.selectedEnemy?0xa06b45:0x685440,1);
          g.fillRect(e.x-13,e.y-38,26,36);
          g.fillCircle(e.x,e.y-45,12);
          g.lineStyle(3,0xd3b387,1);
          g.lineBetween(e.x-23,e.y-24,e.x+23,e.y-24);
          g.lineBetween(e.x,e.y-35,e.x,e.y+4);
        }
        g.fillStyle(0x2b3332);
        g.fillRect(e.x-24,e.y-66,48,5);
        g.fillStyle(0xe39168);
        g.fillRect(e.x-24,e.y-66,48*e.hp/e.maxHp,5);
        this.enemyLabels[j]?.setText(`${e.role==='melee'?'近战':'远程'} ${Math.ceil(e.hp)}`).setPosition(e.x,e.y-70).setVisible(true);
      });
    }
    if(this.inBattleView&&this.effectUntil>0){
      g.lineStyle(3,0xe5cb8c,this.effectUntil/P.effectDurationMs);
      g.strokeCircle(this.anchor.x,this.anchor.y-20,20+(P.effectDurationMs-this.effectUntil)/20);
    }
  }
}
