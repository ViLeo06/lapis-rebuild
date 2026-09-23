import Phaser from 'phaser';
import type {LoadedPack,Animation} from './model.ts';
import {advanceClock,frameIndex,textureKey} from './model.ts';
import {frameIntervalMs,sequenceDurationMs} from './animation-policy.ts';

export class VisualActor{
  readonly scene:Phaser.Scene;
  readonly pack:LoadedPack;
  readonly resourceId:string;
  readonly image:Phaser.GameObjects.Image;
  slot='00';
  direction=0;
  cursor=0;
  elapsed=0;
  duration=200;
  anchor={x:0,y:0};
  private transientMs=0;
  private transientReturn='00';

  constructor(scene:Phaser.Scene,pack:LoadedPack,resourceId:string,x=0,y=0,direction=0){
    this.scene=scene;this.pack=pack;this.resourceId=resourceId;
    const animation=this.animation('00');
    this.direction=Math.max(0,Math.min(7,Math.floor(direction)));
    this.duration=frameIntervalMs(animation.raw_timing);
    const index=frameIndex(animation,this.direction,0),bounds=animation.frame_bounds[index];
    this.anchor={x,y};
    this.image=scene.add.image(x+bounds.left,y+bounds.top,textureKey(resourceId,'00',index)).setOrigin(0);
  }

  has(slot:string):boolean{return !!this.pack.animations[this.resourceId]?.[slot]}
  animation(slot=this.slot):Animation{
    const value=this.pack.animations[this.resourceId]?.[slot];
    if(!value)throw new Error(`Missing B${this.resourceId}_${slot} visual animation`);
    return value;
  }

  setAnchor(x:number,y:number):this{this.anchor={x,y};return this}
  setDirection(direction:number):this{
    if(Number.isInteger(direction)&&direction>=0&&direction<8&&direction!==this.direction){this.direction=direction;this.cursor=0;this.elapsed=0;}
    return this;
  }
  setVisible(visible:boolean):this{this.image.setVisible(visible);return this}
  setAlpha(alpha:number):this{this.image.setAlpha(alpha);return this}

  setAction(slot:string):this{
    if(!this.has(slot))return this;
    this.slot=slot;this.cursor=0;this.elapsed=0;this.transientMs=0;
    this.duration=frameIntervalMs(this.animation().raw_timing);
    return this;
  }

  playTransient(slot:string,returnSlot='00'):this{
    if(!this.has(slot))return this;
    this.slot=slot;this.cursor=0;this.elapsed=0;this.transientReturn=this.has(returnSlot)?returnSlot:'00';
    const animation=this.animation();
    this.duration=frameIntervalMs(animation.raw_timing);
    this.transientMs=sequenceDurationMs(animation.raw_timing,animation.frames_per_direction);
    return this;
  }

  update(deltaMs:number):void{
    if(!this.image.visible)return;
    const dt=Math.max(0,Math.min(250,deltaMs));
    if(this.transientMs>0){
      this.transientMs=Math.max(0,this.transientMs-dt);
      if(this.transientMs<=0)this.setAction(this.transientReturn);
    }
    const animation=this.animation();
    const next=advanceClock(this.cursor,this.elapsed,dt,this.duration,animation.frames_per_direction);
    this.cursor=next.cursor;this.elapsed=next.elapsed;
    const index=frameIndex(animation,this.direction,this.cursor),bounds=animation.frame_bounds[index];
    this.image.setTexture(textureKey(this.resourceId,this.slot,index)).setPosition(this.anchor.x+bounds.left,this.anchor.y+bounds.top);
  }

  destroy():void{this.image.destroy()}
}
