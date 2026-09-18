import type {CameraState,Point,Rect,Size,ViewportSnapshot,ZoomPolicy} from './viewport-state.ts';
import {clampZoom,normalizeRect,normalizeSize,normalizeZoomPolicy} from './viewport-state.ts';
import {CameraFollowPolicy,cameraCenter,clampScroll,scrollForCenter} from './camera-follow.ts';

export interface ViewportPort{
  viewportSize():Size;
  worldBounds():Rect;
  cameraState():CameraState;
  resize(width:number,height:number):void;
  setZoom(zoom:number):void;
  setScroll(scrollX:number,scrollY:number):void;
}

export interface FullscreenPort{
  readonly supported:boolean;
  active():boolean;
  enter():Promise<boolean>;
  exit():Promise<boolean>;
  onChange?(listener:()=>void):()=>void;
}

export type ViewportControllerOptions = Readonly<{
  zoom:Partial<ZoomPolicy>;
  follow:ConstructorParameters<typeof CameraFollowPolicy>[0];
  fitPadding:number;
}>;

export class BrowserFullscreenPort implements FullscreenPort{
  private readonly doc:Document;
  private readonly target:HTMLElement;
  constructor(doc:Document,target:HTMLElement){this.doc=doc;this.target=target;}
  get supported(){return typeof this.target.requestFullscreen==='function'&&typeof this.doc.exitFullscreen==='function';}
  active(){return this.doc.fullscreenElement===this.target;}
  async enter(){
    if(!this.supported)return false;
    if(this.active())return true;
    try{await this.target.requestFullscreen();return this.active();}catch{return false;}
  }
  async exit(){
    if(!this.supported)return false;
    if(!this.doc.fullscreenElement)return true;
    try{await this.doc.exitFullscreen();return !this.doc.fullscreenElement;}catch{return false;}
  }
  onChange(listener:()=>void){
    this.doc.addEventListener('fullscreenchange',listener);
    return()=>this.doc.removeEventListener('fullscreenchange',listener);
  }
}

export class ViewportController{
  readonly port:ViewportPort;
  readonly fullscreen?:FullscreenPort;
  readonly zoomPolicy:ZoomPolicy;
  readonly cameraFollow:CameraFollowPolicy;
  readonly fitPadding:number;

  constructor(port:ViewportPort,fullscreen?:FullscreenPort,options:Partial<ViewportControllerOptions>={}){
    this.port=port;
    this.fullscreen=fullscreen;
    this.zoomPolicy=normalizeZoomPolicy(options.zoom);
    this.cameraFollow=new CameraFollowPolicy(options.follow);
    const padding=options.fitPadding??0.96;
    if(!Number.isFinite(padding)||padding<=0||padding>1)throw new RangeError('fitPadding must be in (0, 1]');
    this.fitPadding=padding;
  }

  snapshot():ViewportSnapshot{
    return{
      viewport:normalizeSize(this.port.viewportSize()),
      world:normalizeRect(this.port.worldBounds()),
      camera:{...this.port.cameraState()},
      zoomPolicy:this.zoomPolicy,
      fullscreenSupported:this.fullscreen?.supported??false,
      fullscreenActive:this.fullscreen?.active()??false,
    };
  }

  resize(width:number,height:number){
    const v=normalizeSize({width,height});
    this.port.resize(v.width,v.height);
    this.reclamp();
  }

  zoomIn(){return this.setZoom(this.port.cameraState().zoom+this.zoomPolicy.step);}
  zoomOut(){return this.setZoom(this.port.cameraState().zoom-this.zoomPolicy.step);}
  resetZoom(){return this.setZoom(this.zoomPolicy.defaultZoom);}

  handleWheel(deltaY:number){
    if(!this.zoomPolicy.wheelEnabled||deltaY===0)return this.port.cameraState().zoom;
    return deltaY>0?this.zoomOut():this.zoomIn();
  }

  setZoom(rawZoom:number){
    const before=this.port.cameraState();
    const viewport=this.port.viewportSize();
    const world=this.port.worldBounds();
    const center=cameraCenter(before,viewport);
    const zoom=clampZoom(rawZoom,this.zoomPolicy);
    this.port.setZoom(zoom);
    const scroll=scrollForCenter(center,viewport,world,zoom);
    this.port.setScroll(scroll.x,scroll.y);
    return zoom;
  }

  fitWorld(){return this.frameRect(this.port.worldBounds(),this.fitPadding);}

  frameRect(rect:Rect,padding=this.fitPadding){
    if(!Number.isFinite(padding)||padding<=0||padding>1)throw new RangeError('padding must be in (0, 1]');
    const r=normalizeRect(rect),viewport=normalizeSize(this.port.viewportSize());
    const zoom=clampZoom(Math.min(viewport.width/r.width,viewport.height/r.height)*padding,this.zoomPolicy);
    this.port.setZoom(zoom);
    const center={x:r.x+r.width/2,y:r.y+r.height/2};
    const scroll=scrollForCenter(center,viewport,this.port.worldBounds(),zoom);
    this.port.setScroll(scroll.x,scroll.y);
    return{zoom,scroll};
  }

  follow(target:Point,deltaMs=16.6667){
    const camera=this.port.cameraState();
    const scroll=this.cameraFollow.step(camera,target,this.port.viewportSize(),this.port.worldBounds(),deltaMs);
    this.port.setScroll(scroll.x,scroll.y);
    return scroll;
  }

  centerOn(target:Point){
    const camera=this.port.cameraState();
    const scroll=scrollForCenter(target,this.port.viewportSize(),this.port.worldBounds(),camera.zoom);
    this.port.setScroll(scroll.x,scroll.y);
    return scroll;
  }

  reclamp(){
    const camera=this.port.cameraState();
    const scroll=clampScroll({x:camera.scrollX,y:camera.scrollY},this.port.viewportSize(),this.port.worldBounds(),camera.zoom);
    this.port.setScroll(scroll.x,scroll.y);
    return scroll;
  }

  async enterFullscreen(){return this.fullscreen?.enter()??false;}
  async exitFullscreen(){return this.fullscreen?.exit()??false;}
  async toggleFullscreen(){
    if(!this.fullscreen?.supported)return false;
    return this.fullscreen.active()?this.fullscreen.exit():this.fullscreen.enter();
  }
}
