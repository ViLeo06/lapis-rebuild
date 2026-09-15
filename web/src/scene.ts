import Phaser from 'phaser';
import { frameIndex, textureKey, advanceClock } from './model.ts';
import type { LoadedPack, Animation } from './model.ts';
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
  anchor={x:768,y:384}; hover={x:0,y:0}; route: Cell[]=[];
  state=initialState(); selectedEnemy='dummy-melee'; gold=0;
  private sprite!: Phaser.GameObjects.Image;
  private companion!: Phaser.GameObjects.Image;
  private overlay!: Phaser.GameObjects.Graphics;
  private enemyLabels: Phaser.GameObjects.Text[]=[];
  private lastPublish=0;private timedAction=0;private effectUntil=0;
  private notice: (message:string)=>void;
  constructor(pack:LoadedPack, notice:(message:string)=>void){super('lab');this.pack=pack;this.notice=notice;this.character=Object.keys(pack.manifest.characters)[0];}
  preload(){ this.load.on('loaderror',(file:Phaser.Loader.File)=>{this.notice(`\u8d44\u6e90\u52a0\u8f7d\u5931\u8d25: ${file.key}`);this.events.emit('asset-failure',file.key);}); for(const [key,url] of Object.entries(this.pack.images))this.load.image(key,url); }
  create(){
    const missing=Object.keys(this.pack.images).filter(k=>!this.textures.exists(k));
    if(missing.length){this.notice(`\u7f3a\u5931 ${missing.length} \u5f20\u56fe\u7247\uff0c\u505c\u6b62\u521d\u59cb\u5316`);return;}
    this.add.image(0,0,'map').setOrigin(0);
    this.resetPosition();
    this.sprite=this.add.image(0,0,textureKey(this.character,'00',0)).setOrigin(0);
    const other=Object.keys(this.pack.manifest.characters).find(id=>id!==this.character)??this.character;
    const otherAnim=this.pack.animations[other]['00']; const otherIndex=frameIndex(otherAnim,0,0);const b=otherAnim.frame_bounds[otherIndex];
    this.companion=this.add.image(this.anchor.x+85+b.left,this.anchor.y+25+b.top,textureKey(other,'00',otherIndex)).setOrigin(0).setAlpha(.65);
    this.overlay=this.add.graphics();
    for(let i=0;i<2;i++)this.enemyLabels.push(this.add.text(0,0,'',{fontFamily:'sans-serif',fontSize:'13px',color:'#ffe0a0',backgroundColor:'#182120'}).setOrigin(.5,1));
    this.fit();this.scale.on('resize',()=>this.fit());
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{const world=this.cameras.main.getWorldPoint(p.x,p.y);this.hover={x:Math.round(world.x),y:Math.round(world.y)};});
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{const world=this.cameras.main.getWorldPoint(p.x,p.y);const enemy=this.state.enemies.find(e=>e.hp>0&&Math.hypot(e.x-world.x,e.y-world.y)<30);if(enemy){this.selectedEnemy=enemy.id;this.notice(`\u5df2\u9009\u4e2d ${enemy.id}`);}else this.moveTo(world.x,world.y);});
    this.input.on('wheel',(_p:unknown,_o:unknown,_x:number,dy:number)=>this.zoom(dy>0?.9:1.1));
    this.events.once('shutdown',()=>this.scale.removeAllListeners('resize'));
    this.notice('\u771f\u5b9e\u5730\u56fe\u4e0e\u89d2\u8272\u5df2\u52a0\u8f7d\u3002\u70b9\u5730\u56fe\u79fb\u52a8\uff1b\u53f3\u4fa7\u53ef\u9010\u5e27\u68c0\u67e5\u3002');
    window.dispatchEvent(new CustomEvent('lapis-ready'));
  }
  animation():Animation{return this.pack.animations[this.character][this.slot];}
  resetPosition(){const p=referenceCellToScreen(closestWalkable(this.pack.collision,[22,23]));this.anchor={x:p[0],y:p[1]};this.route=[];}
  fit(){if(!this.cameras?.main)return;const {width,height}=this.pack.manifest.map.render;this.cameras.main.setZoom(Math.min(this.scale.width/width,this.scale.height/height)*.98).centerOn(width/2,height/2);}
  zoom(mult:number){this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom*mult,.25,3));}
  setCharacter(id:string){if(!this.pack.animations[id])return;this.character=id;this.setAction('00');this.route=[];this.state=initialState();this.companion?.setVisible(false);}
  setAction(slot:string){if(!this.pack.animations[this.character][slot])return;this.slot=slot;this.cursor=0;this.elapsed=0;}
  setDirection(direction:number){if(!Number.isInteger(direction)||direction<0||direction>7)return;this.direction=direction;this.cursor=0;this.elapsed=0;}
  setFrame(index:number){this.playing=false;this.cursor=Math.max(0,Math.min(this.animation().frames_per_direction-1,Math.floor(index)));this.elapsed=0;}
  step(){this.playing=false;this.cursor=(this.cursor+1)%this.animation().frames_per_direction;this.elapsed=0;}
  moveTo(x:number,y:number){
    if(this.state.phase==='lost')return;
    const c=this.pack.collision,start=closestWalkable(c,nearestAnchor(this.anchor.x,this.anchor.y));
    const end=referenceScreenToCell(x,y);const route=findRoute(c,start,end);
    if(!route){this.notice('\u65e0\u53ef\u901a\u884c\u8def\u5f84');return;}
    this.route=route;this.setAction('01');this.playing=true;
  }
  moveKey(dx:number,dy:number){this.moveTo(this.anchor.x+dx*64,this.anchor.y+dy*32);}
  enterBattle(){this.resetPosition();this.state=beginBattle(this.anchor.x,this.anchor.y);this.selectedEnemy='dummy-melee';this.setAction('00');this.notice('\u8bad\u7ec3\u6218\u6597\uff1a\u6728\u6869\u3001\u4f24\u5bb3\u4e0e\u65f6\u5e8f\u5747\u4e3a\u4e34\u65f6\u5b9e\u73b0\uff0c\u975e\u539f\u7248\u89c4\u5219\u3002');}
  leaveBattle(){if(this.state.phase==='won')this.gold+=this.state.reward;this.state=initialState();this.route=[];this.setAction('00');this.notice('\u5df2\u8fd4\u56de\u5b89\u5168\u8bca\u65ad\u533a');}
  attack(skill:Skill|null){const result=useAttack(this.state,this.selectedEnemy,this.anchor.x,this.anchor.y,skill);this.notice(result.message);if(result.ok){this.setAction('02');this.playing=true;this.route=[];this.timedAction=600;this.effectUntil=600;}}
  makeSave():Save {if(this.route.length)throw new Error('Wait for movement to finish');if(this.state.phase==='active')throw new Error('\u6218\u6597\u4e2d\u4e0d\u80fd\u5b58\u6863');return {version:1,pack:this.pack.digest,character:this.character,x:this.anchor.x,y:this.anchor.y,gold:this.gold+(this.state.phase==='won'?this.state.reward:0),savedAt:new Date().toISOString()};}
  async save(){try{await writeSave(this.makeSave());this.notice('\u5b58\u6863\u5df2\u5199\u5165\u6d4f\u89c8\u5668 IndexedDB');}catch(e){this.notice(`\u5b58\u6863\u5931\u8d25\uff0c\u53ef\u4f7f\u7528\u5bfc\u51fa JSON\uff1a${String(e)}`);}}
  restore(raw:unknown){const m=this.pack.manifest;const s=validateSave(raw,this.pack.digest,Object.keys(m.characters),m.map.render.width,m.map.render.height);if(rawCell(this.pack.collision,nearestAnchor(s.x,s.y))!==1)throw new Error('\u5b58\u6863\u4f4d\u7f6e\u4e0d\u53ef\u901a\u884c');this.setCharacter(s.character);this.anchor={x:s.x,y:s.y};this.gold=s.gold;this.notice('\u5b58\u6863\u6062\u590d\u6210\u529f');}
  async loadSaved(){try{this.restore(await readSave());}catch(e){this.notice(`\u8bfb\u6863\u5931\u8d25\uff1a${String(e)}`);}}
  snapshot(){const a=this.animation(),i=frameIndex(a,this.direction,this.cursor);const ref=referenceScreenToCell(this.hover.x,this.hover.y),projected=nearestAnchor(this.hover.x,this.hover.y);const tileX=Math.floor(this.hover.x/64),tileY=Math.floor(this.hover.y/32);const ins=this.pack.inspector;const tile=ins&&tileX>=0&&tileY>=0&&tileX<ins.width&&tileY<ins.height?ins.cells[tileX*ins.height+tileY]:null;
    return {ready:!!this.sprite,character:this.character,slot:this.slot,direction:this.direction,cursor:this.cursor,frame:i,length:a.frames_per_direction,bounds:a.frame_bounds[i],timing:a.raw_timing,duration:this.duration,playing:this.playing,anchor:{...this.anchor},hover:{...this.hover},referenceCell:ref,projectedCell:projected,rawReference:rawCell(this.pack.collision,ref),rawAnchor:rawCell(this.pack.collision,projected),tile:tile?{x:tileX,y:tileY,resource_id:tile.resource_id,path:tile.directory_path}:null,routeLength:this.route.length,phase:this.state.phase,hp:Math.ceil(this.state.hp),mp:this.state.mp,gold:this.gold+(this.state.phase==='won'?this.state.reward:0),enemies:this.state.enemies.map(e=>({id:e.id,hp:Math.ceil(e.hp),x:e.x,y:e.y})),target:this.selectedEnemy,fps:Math.round(this.game.loop.actualFps)};
  }
  update(time:number,delta:number){if(!this.sprite)return;const dt=Math.min(delta,100);
    if(this.route.length){const target=referenceCellToScreen(this.route[0]),dx=target[0]-this.anchor.x,dy=target[1]-this.anchor.y,d=Math.hypot(dx,dy),step=P.movementPixelsPerSecond*dt/1000;if(d<=step){this.anchor={x:target[0],y:target[1]};this.route.shift();if(!this.route.length)this.setAction('00');}else{this.direction=directionFor(dx,dy);this.anchor.x+=dx/d*step;this.anchor.y+=dy/d*step;}}
    if(this.timedAction>0){this.timedAction-=dt;if(this.timedAction<=0)this.setAction('00');}
    this.effectUntil=Math.max(0,this.effectUntil-dt);
    const a=this.animation();if(this.playing){const next=advanceClock(this.cursor,this.elapsed,dt,this.duration,a.frames_per_direction);this.cursor=next.cursor;this.elapsed=next.elapsed;}
    const i=frameIndex(a,this.direction,this.cursor),b=a.frame_bounds[i];this.sprite.setTexture(textureKey(this.character,this.slot,i)).setPosition(this.anchor.x+b.left,this.anchor.y+b.top).setAlpha(this.state.phase==='lost'?.3:1);
    const before=this.state.phase;updateBattle(this.state,dt,this.anchor.x,this.anchor.y);if(before!==this.state.phase){this.route=[];this.notice(this.state.phase==='won'?'\u8bad\u7ec3\u80dc\u5229\uff0c\u7ed3\u7b97 +10\u3002\u53ef\u8fd4\u56de\u5e76\u5b58\u6863\u3002':'\u8bad\u7ec3\u5931\u8d25\uff0c\u53ef\u91cd\u65b0\u5f00\u59cb\u3002');}
    this.drawOverlay();if(time-this.lastPublish>90){window.dispatchEvent(new CustomEvent('lapis-state',{detail:this.snapshot()}));this.lastPublish=time;}
  }
  private drawOverlay(){const g=this.overlay;g.clear();const m=this.pack.manifest.map.render;
    if(this.showGrid){g.lineStyle(1,0xf0d09b,.18);for(let x=0;x<=m.width;x+=64)g.lineBetween(x,0,x,m.height);for(let y=0;y<=m.height;y+=32)g.lineBetween(0,y,m.width,y);}
    if(this.showCollision){const c=this.pack.collision;for(let x=0;x<c.width;x++)for(let y=0;y<c.height;y++){if((x+y)%2)continue;const [sx,sy]=referenceCellToScreen([x,y]);g.lineStyle(1,rawCell(c,[x,y])===1?0x8edca4:0xf08472,.4);g.strokePoints([{x:sx,y:sy-16},{x:sx+32,y:sy},{x:sx,y:sy+16},{x:sx-32,y:sy}],true);}}
    if(this.route.length){g.lineStyle(2,0xf2d28b,.9);let p:Cell=[this.anchor.x,this.anchor.y];for(const cell of this.route){const n=referenceCellToScreen(cell);g.lineBetween(p[0],p[1],n[0],n[1]);p=n;}}
    if(this.showBounds){const b=this.animation().frame_bounds[frameIndex(this.animation(),this.direction,this.cursor)];g.lineStyle(1,0xe3c288,.9);g.strokeRect(this.anchor.x+b.left,this.anchor.y+b.top,b.right-b.left,b.bottom-b.top);g.lineStyle(2,0x9ce8c4);g.lineBetween(this.anchor.x-7,this.anchor.y,this.anchor.x+7,this.anchor.y);g.lineBetween(this.anchor.x,this.anchor.y-7,this.anchor.x,this.anchor.y+7);}
    this.enemyLabels.forEach(t=>t.setVisible(false));
    this.state.enemies.forEach((e,j)=>{if(e.hp<=0)return;g.fillStyle(e.id===this.selectedEnemy?0xa06b45:0x685440,1);g.fillRect(e.x-13,e.y-38,26,36);g.fillCircle(e.x,e.y-45,12);g.lineStyle(3,0xd3b387,1);g.lineBetween(e.x-23,e.y-24,e.x+23,e.y-24);g.lineBetween(e.x,e.y-35,e.x,e.y+4);g.fillStyle(0x2b3332);g.fillRect(e.x-24,e.y-66,48,5);g.fillStyle(0xe39168);g.fillRect(e.x-24,e.y-66,48*e.hp/e.maxHp,5);this.enemyLabels[j]?.setText(`${e.role==='melee'?'\u8fd1\u6218':'\u8fdc\u7a0b'} ${Math.ceil(e.hp)}`).setPosition(e.x,e.y-70).setVisible(true);});
    if(this.effectUntil>0){g.lineStyle(3,0xe5cb8c,this.effectUntil/600);g.strokeCircle(this.anchor.x,this.anchor.y-20,20+(600-this.effectUntil)/20);}
  }
}
