import type {CameraState,Point,Rect,Size} from './viewport-state.ts';
import {clamp,normalizeRect,normalizeSize} from './viewport-state.ts';
export type WorldMinimapLayout=Readonly<{x:number;y:number;width:number;height:number;inner:Rect}>;
export type WorldMinimapModel=Readonly<{layout:WorldMinimapLayout;player:Point;viewport:Rect}>;
function options(viewport:Size){const v=normalizeSize(viewport);if(v.width<=560)return{margin:5,top:58,width:112,height:84,padding:6,header:24};if(v.width<=900)return{margin:6,top:36,width:140,height:100,padding:6,header:24};return{margin:8,top:38,width:160,height:112,padding:6,header:24};}
export function worldMinimapLayout(viewport:Size,world:Rect):WorldMinimapLayout{
  const v=normalizeSize(viewport),w=normalizeRect(world),o=options(v),width=Math.min(o.width,Math.max(72,v.width-o.margin*2)),height=Math.min(o.height,Math.max(58,v.height-o.top-o.margin));
  const available={x:o.margin+o.padding,y:o.top+o.header,width:Math.max(1,width-o.padding*2),height:Math.max(1,height-o.header-o.padding)};
  const scale=Math.min(available.width/w.width,available.height/w.height),iw=Math.max(1,w.width*scale),ih=Math.max(1,w.height*scale);
  return{x:o.margin,y:o.top,width,height,inner:{x:available.x+(available.width-iw)/2,y:available.y+(available.height-ih)/2,width:iw,height:ih}};
}
function worldToMap(layout:WorldMinimapLayout,world:Rect,point:Point):Point{const w=normalizeRect(world);const nx=(clamp(point.x,w.x,w.x+w.width)-w.x)/w.width,ny=(clamp(point.y,w.y,w.y+w.height)-w.y)/w.height;return{x:layout.inner.x+nx*layout.inner.width,y:layout.inner.y+ny*layout.inner.height};}
export function buildWorldMinimapModel(viewport:Size,world:Rect,camera:CameraState,player:Point):WorldMinimapModel{
  const v=normalizeSize(viewport),w=normalizeRect(world),layout=worldMinimapLayout(v,w),visible={x:camera.scrollX,y:camera.scrollY,width:v.width/camera.zoom,height:v.height/camera.zoom};
  const tl=worldToMap(layout,w,{x:visible.x,y:visible.y}),br=worldToMap(layout,w,{x:visible.x+visible.width,y:visible.y+visible.height});
  return{layout,player:worldToMap(layout,w,player),viewport:{x:Math.min(tl.x,br.x),y:Math.min(tl.y,br.y),width:Math.abs(br.x-tl.x),height:Math.abs(br.y-tl.y)}};
}
