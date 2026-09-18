import type {CameraState,Point,Rect,Size} from './viewport-state.ts';
import {clamp,finitePositive,normalizeRect,normalizeSize} from './viewport-state.ts';

export type CameraFollowOptions = Readonly<{
  lerp:number;
  deadZoneRatioX:number;
  deadZoneRatioY:number;
}>;

export const DEFAULT_CAMERA_FOLLOW_OPTIONS:CameraFollowOptions={
  lerp:0.18,
  deadZoneRatioX:0.22,
  deadZoneRatioY:0.18,
};

function ratio(value:number,label:string):number{
  if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError(`${label} must be in [0, 1)`);
  return value;
}

export function clampScroll(scroll:Point,viewport:Size,world:Rect,zoom:number):Point{
  const v=normalizeSize(viewport),w=normalizeRect(world),z=finitePositive(zoom,'camera zoom');
  const visibleW=v.width/z,visibleH=v.height/z;
  const maxX=w.x+w.width-visibleW,maxY=w.y+w.height-visibleH;
  const x=maxX<w.x?w.x+(w.width-visibleW)/2:clamp(scroll.x,w.x,maxX);
  const y=maxY<w.y?w.y+(w.height-visibleH)/2:clamp(scroll.y,w.y,maxY);
  return{x,y};
}

export function cameraCenter(camera:CameraState,viewport:Size):Point{
  const v=normalizeSize(viewport),z=finitePositive(camera.zoom,'camera zoom');
  return{x:camera.scrollX+v.width/(2*z),y:camera.scrollY+v.height/(2*z)};
}

export function scrollForCenter(center:Point,viewport:Size,world:Rect,zoom:number):Point{
  const v=normalizeSize(viewport),z=finitePositive(zoom,'camera zoom');
  return clampScroll({x:center.x-v.width/(2*z),y:center.y-v.height/(2*z)},v,world,z);
}

export class CameraFollowPolicy{
  readonly options:CameraFollowOptions;

  constructor(options:Partial<CameraFollowOptions>={}){
    const lerp=options.lerp??DEFAULT_CAMERA_FOLLOW_OPTIONS.lerp;
    if(!Number.isFinite(lerp)||lerp<=0||lerp>1)throw new RangeError('lerp must be in (0, 1]');
    this.options={
      lerp,
      deadZoneRatioX:ratio(options.deadZoneRatioX??DEFAULT_CAMERA_FOLLOW_OPTIONS.deadZoneRatioX,'deadZoneRatioX'),
      deadZoneRatioY:ratio(options.deadZoneRatioY??DEFAULT_CAMERA_FOLLOW_OPTIONS.deadZoneRatioY,'deadZoneRatioY'),
    };
  }

  desiredScroll(camera:CameraState,target:Point,viewport:Size,world:Rect):Point{
    const v=normalizeSize(viewport),z=finitePositive(camera.zoom,'camera zoom');
    const visibleW=v.width/z,visibleH=v.height/z;
    const deadW=visibleW*this.options.deadZoneRatioX,deadH=visibleH*this.options.deadZoneRatioY;
    const center=cameraCenter(camera,v);
    let nextCenterX=center.x,nextCenterY=center.y;
    const dx=target.x-center.x,dy=target.y-center.y;
    if(dx>deadW)nextCenterX=target.x-deadW;
    else if(dx<-deadW)nextCenterX=target.x+deadW;
    if(dy>deadH)nextCenterY=target.y-deadH;
    else if(dy<-deadH)nextCenterY=target.y+deadH;
    return scrollForCenter({x:nextCenterX,y:nextCenterY},v,world,z);
  }

  step(camera:CameraState,target:Point,viewport:Size,world:Rect,deltaMs=16.6667):Point{
    const desired=this.desiredScroll(camera,target,viewport,world);
    const frameScale=Math.max(0,deltaMs)/16.6667;
    const alpha=1-Math.pow(1-this.options.lerp,frameScale);
    const next={
      x:camera.scrollX+(desired.x-camera.scrollX)*alpha,
      y:camera.scrollY+(desired.y-camera.scrollY)*alpha,
    };
    return clampScroll(next,viewport,world,camera.zoom);
  }
}
