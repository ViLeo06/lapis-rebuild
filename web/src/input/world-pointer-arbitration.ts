export type WorldPointerKind='npc'|'encounter';

export type WorldPointerPoint={x:number;y:number};
export type WorldPointerBounds={left:number;top:number;right:number;bottom:number};
export type WorldPointerTarget={
  id:string;
  kind:WorldPointerKind;
  visible:boolean;
  bounds:WorldPointerBounds;
  depth:number;
};

const area=(bounds:WorldPointerBounds)=>Math.max(0,bounds.right-bounds.left)*Math.max(0,bounds.bottom-bounds.top);

export function unionPointerBounds(a:WorldPointerBounds,b:WorldPointerBounds):WorldPointerBounds{
  return{
    left:Math.min(a.left,b.left),
    top:Math.min(a.top,b.top),
    right:Math.max(a.right,b.right),
    bottom:Math.max(a.bottom,b.bottom),
  };
}

export function inflatePointerBounds(
  bounds:WorldPointerBounds,
  padding=6,
  minimumWidth=32,
  minimumHeight=48,
):WorldPointerBounds{
  const centerX=(bounds.left+bounds.right)/2,centerY=(bounds.top+bounds.bottom)/2;
  const width=Math.max(minimumWidth,Math.max(0,bounds.right-bounds.left)+padding*2);
  const height=Math.max(minimumHeight,Math.max(0,bounds.bottom-bounds.top)+padding*2);
  return{left:centerX-width/2,top:centerY-height/2,right:centerX+width/2,bottom:centerY+height/2};
}

export function containsPointer(bounds:WorldPointerBounds,point:WorldPointerPoint):boolean{
  return point.x>=bounds.left&&point.x<=bounds.right&&point.y>=bounds.top&&point.y<=bounds.bottom;
}

export function pickWorldPointerTarget(
  point:WorldPointerPoint,
  targets:readonly WorldPointerTarget[],
  kind:WorldPointerKind='npc',
):WorldPointerTarget|null{
  const matches=targets.filter(target=>target.visible&&target.kind===kind&&containsPointer(target.bounds,point));
  matches.sort((a,b)=>b.depth-a.depth||area(a.bounds)-area(b.bounds)||a.id.localeCompare(b.id));
  return matches[0]??null;
}
