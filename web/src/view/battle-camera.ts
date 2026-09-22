import type {CameraState,Point,Rect,Size} from './viewport-state.ts';
import {finitePositive,normalizeRect,normalizeSize} from './viewport-state.ts';
import {clampScroll,scrollForCenter} from './camera-follow.ts';

export type BattleCameraPointer=Readonly<{x:number;y:number;inside:boolean;coarse:boolean}>;
export type BattleCameraSource='edge'|'player'|'none';
export type BattleCameraStep=Readonly<{scroll:Point;source:BattleCameraSource}>;
export type BattleCameraOptions=Readonly<{
  edgeMarginPx:number;
  edgePanSpeedPxPerSecond:number;
  safeInsetRatio:number;
  followLerp:number;
  manualLerp:number;
}>;

export const DEFAULT_BATTLE_CAMERA_OPTIONS:BattleCameraOptions={
  edgeMarginPx:40,
  edgePanSpeedPxPerSecond:240,
  safeInsetRatio:0.22,
  followLerp:0.08,
  manualLerp:0.14,
};

export function battleEntryZoom(viewport:Size,world:Rect):number{
  const v=normalizeSize(viewport),w=normalizeRect(world);
  return Math.max(1,v.width/w.width,v.height/w.height);
}

function alphaFor(lerp:number,deltaMs:number){
  const frameScale=Math.max(0,deltaMs)/16.6667;
  return 1-Math.pow(1-lerp,frameScale);
}

export class BattleCameraPolicy{
  readonly options:BattleCameraOptions;

  constructor(options:Partial<BattleCameraOptions>={}){
    const merged={...DEFAULT_BATTLE_CAMERA_OPTIONS,...options};
    finitePositive(merged.edgeMarginPx,'battle edge margin');
    finitePositive(merged.edgePanSpeedPxPerSecond,'battle edge pan speed');
    if(!Number.isFinite(merged.safeInsetRatio)||merged.safeInsetRatio<=0||merged.safeInsetRatio>=.5)throw new RangeError('safeInsetRatio must be in (0, .5)');
    for(const [label,value] of [['followLerp',merged.followLerp],['manualLerp',merged.manualLerp]] as const){
      if(!Number.isFinite(value)||value<=0||value>1)throw new RangeError(`${label} must be in (0, 1]`);
    }
    this.options=merged;
  }

  edgeVector(pointer:BattleCameraPointer|undefined,viewport:Size):Point{
    const v=normalizeSize(viewport);
    if(!pointer?.inside||pointer.coarse)return{x:0,y:0};
    const margin=Math.min(this.options.edgeMarginPx,v.width/2,v.height/2);
    const axis=(value:number,size:number)=>value<margin?-(margin-value)/margin:value>size-margin?(value-(size-margin))/margin:0;
    return{x:axis(pointer.x,v.width),y:axis(pointer.y,v.height)};
  }

  step(camera:CameraState,player:Point,viewport:Size,world:Rect,deltaMs:number,pointer?:BattleCameraPointer,followPlayer=true,settleToPlayer=false):BattleCameraStep{
    const v=normalizeSize(viewport),w=normalizeRect(world),zoom=finitePositive(camera.zoom,'camera zoom');
    const edge=this.edgeVector(pointer,v);
    if(edge.x!==0||edge.y!==0){
      const seconds=Math.max(0,deltaMs)/1000;
      const worldSpeed=this.options.edgePanSpeedPxPerSecond/zoom;
      return{
        scroll:clampScroll({
          x:camera.scrollX+edge.x*worldSpeed*seconds,
          y:camera.scrollY+edge.y*worldSpeed*seconds,
        },v,w,zoom),
        source:'edge',
      };
    }
    if(!followPlayer)return{scroll:clampScroll({x:camera.scrollX,y:camera.scrollY},v,w,zoom),source:'none'};
    const sx=(player.x-camera.scrollX)*zoom,sy=(player.y-camera.scrollY)*zoom;
    const insetX=Math.max(24,Math.min(v.width*this.options.safeInsetRatio,v.width/2-1));
    const insetY=Math.max(24,Math.min(v.height*this.options.safeInsetRatio,v.height/2-1));
    const outside=sx<insetX||sx>v.width-insetX||sy<insetY||sy>v.height-insetY;
    if(!outside&&!settleToPlayer)return{scroll:clampScroll({x:camera.scrollX,y:camera.scrollY},v,w,zoom),source:'none'};
    const desired=scrollForCenter(player,v,w,zoom),alpha=alphaFor(this.options.followLerp,deltaMs);
    return{
      scroll:clampScroll({
        x:camera.scrollX+(desired.x-camera.scrollX)*alpha,
        y:camera.scrollY+(desired.y-camera.scrollY)*alpha,
      },v,w,zoom),
      source:'player',
    };
  }

  targetScroll(camera:CameraState,target:Point,viewport:Size,world:Rect):Point{
    return scrollForCenter(target,normalizeSize(viewport),normalizeRect(world),finitePositive(camera.zoom,'camera zoom'));
  }

  centerStep(camera:CameraState,target:Point,viewport:Size,world:Rect,deltaMs:number):Point{
    const v=normalizeSize(viewport),w=normalizeRect(world),zoom=finitePositive(camera.zoom,'camera zoom');
    const desired=this.targetScroll(camera,target,v,w),alpha=alphaFor(this.options.manualLerp,deltaMs);
    return clampScroll({
      x:camera.scrollX+(desired.x-camera.scrollX)*alpha,
      y:camera.scrollY+(desired.y-camera.scrollY)*alpha,
    },v,w,zoom);
  }
}
