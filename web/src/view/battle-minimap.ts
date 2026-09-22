import type {CameraState,Point,Rect,Size} from './viewport-state.ts';
import {clamp,normalizeRect,normalizeSize} from './viewport-state.ts';

export type BattleMinimapEnemy=Readonly<{id:string;x:number;y:number;hp:number;encounterGroup:number}>;
export type BattleMinimapMarker=Readonly<{id:string;x:number;y:number;active:boolean}>;
export type BattleMinimapLayout=Readonly<{x:number;y:number;width:number;height:number;inner:Rect}>;
export type BattleMinimapModel=Readonly<{
  layout:BattleMinimapLayout;
  player:Point;
  enemies:readonly BattleMinimapMarker[];
  viewport:Rect;
}>;
export type BattleMinimapOptions=Readonly<{margin:number;maxWidth:number;maxHeight:number;padding:number;bottomInset:number}>;

export const DEFAULT_BATTLE_MINIMAP_OPTIONS:BattleMinimapOptions={
  margin:12,
  maxWidth:176,
  maxHeight:124,
  padding:6,
  bottomInset:118,
};

export function battleMinimapLayout(viewport:Size,world:Rect,options:Partial<BattleMinimapOptions>={}):BattleMinimapLayout{
  const v=normalizeSize(viewport),w=normalizeRect(world),o={...DEFAULT_BATTLE_MINIMAP_OPTIONS,...options};
  const maxWidth=Math.max(72,Math.min(o.maxWidth,v.width-o.margin*2));
  const maxHeight=Math.max(54,Math.min(o.maxHeight,v.height-o.margin*2));
  const aspect=w.width/w.height;
  let width=maxWidth,height=width/aspect;
  if(height>maxHeight){height=maxHeight;width=height*aspect;}
  width=Math.max(72,Math.min(width,maxWidth));
  height=Math.max(54,Math.min(height,maxHeight));
  const x=v.width-width-o.margin;
  const y=Math.max(o.margin,v.height-height-o.margin-o.bottomInset);
  const pad=Math.max(0,Math.min(o.padding,width/4,height/4));
  return{x,y,width,height,inner:{x:x+pad,y:y+pad,width:Math.max(1,width-pad*2),height:Math.max(1,height-pad*2)}};
}

export function minimapContains(layout:BattleMinimapLayout,point:Point){
  return point.x>=layout.x&&point.x<=layout.x+layout.width&&point.y>=layout.y&&point.y<=layout.y+layout.height;
}

export function worldToMinimap(layout:BattleMinimapLayout,world:Rect,point:Point):Point{
  const w=normalizeRect(world),i=layout.inner;
  const nx=(clamp(point.x,w.x,w.x+w.width)-w.x)/w.width;
  const ny=(clamp(point.y,w.y,w.y+w.height)-w.y)/w.height;
  return{x:i.x+nx*i.width,y:i.y+ny*i.height};
}

export function minimapToWorld(layout:BattleMinimapLayout,world:Rect,point:Point):Point{
  const w=normalizeRect(world),i=layout.inner;
  const nx=clamp((point.x-i.x)/i.width,0,1),ny=clamp((point.y-i.y)/i.height,0,1);
  return{x:w.x+nx*w.width,y:w.y+ny*w.height};
}

export function buildBattleMinimapModel(
  viewport:Size,
  world:Rect,
  camera:CameraState,
  player:Point,
  enemies:readonly BattleMinimapEnemy[],
  activeGroup:number,
  options:Partial<BattleMinimapOptions>={},
):BattleMinimapModel{
  const v=normalizeSize(viewport),w=normalizeRect(world),layout=battleMinimapLayout(v,w,options);
  const playerMarker=worldToMinimap(layout,w,player);
  const enemyMarkers=enemies.filter(enemy=>enemy.hp>0).map(enemy=>{
    const p=worldToMinimap(layout,w,enemy);
    return{id:enemy.id,x:p.x,y:p.y,active:enemy.encounterGroup===activeGroup};
  });
  const visibleWorld={x:camera.scrollX,y:camera.scrollY,width:v.width/camera.zoom,height:v.height/camera.zoom};
  const tl=worldToMinimap(layout,w,{x:visibleWorld.x,y:visibleWorld.y});
  const br=worldToMinimap(layout,w,{x:visibleWorld.x+visibleWorld.width,y:visibleWorld.y+visibleWorld.height});
  return{
    layout,
    player:playerMarker,
    enemies:enemyMarkers,
    viewport:{x:Math.min(tl.x,br.x),y:Math.min(tl.y,br.y),width:Math.abs(br.x-tl.x),height:Math.abs(br.y-tl.y)},
  };
}
