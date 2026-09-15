import type { Collision } from './model.ts';
export type Cell = readonly [number, number];
// Coordinates from the 2026 compatibility code are reference evidence, not
// proof of all 2003 client behavior. Do not claim inverse identities.
export function referenceScreenToCell(x: number, y: number): Cell {
  const half = Math.floor(Math.floor(x) / 2);
  const a = Math.floor((Math.floor(y) + 16 + half) / 32);
  const b = Math.floor((Math.floor(y) + 16 - half) / 32);
  return [a-b-1, a+b-1];
}
export const referenceCellToScreen = ([x,y]: Cell): Cell => [(x+1)*32, (y+1)*16];
export function rawCell(c: Collision, [x,y]: Cell): number | null {
  return Number.isInteger(x) && Number.isInteger(y) && x>=0 && y>=0 && x<c.width && y<c.height ? c.grid[x*c.height+y] : null;
}
export const walkable = (c: Collision, cell: Cell) => rawCell(c,cell) === 1;
// Diagnostic-only projection to route anchors. Not the reference hit-test.
export function nearestAnchor(x: number,y: number): Cell { return [Math.round(x/32)-1, Math.round(y/16)-1]; }
export function closestWalkable(c: Collision, desired: Cell): Cell {
  let best: Cell | null = null, distance = Infinity;
  for(let x=0;x<c.width;x++) for(let y=0;y<c.height;y++) {
    const d=(x-desired[0])**2+(y-desired[1])**2;
    if(walkable(c,[x,y]) && d<distance) { best=[x,y];distance=d; }
  }
  if(!best) throw new Error('Map has no walkable cells'); return best;
}
// An explicit provisional BFS policy. Diagonal parity cells are common in
// this IMF, so a square-grid corner-cut rule would reject valid raw nodes.
export function findRoute(c: Collision, start: Cell, end: Cell): Cell[] | null {
  if(!walkable(c,start)||!walkable(c,end)) return null;
  const key=([x,y]:Cell)=>x*c.height+y;
  const q:Cell[]=[start], prev=new Map<number,Cell|null>([[key(start),null]]);
  for(let i=0;i<q.length;i++) {
    const p=q[i];
    if(key(p)===key(end)) { const result:Cell[]=[];let cur:Cell|null=p;while(cur){result.push(cur);cur=prev.get(key(cur))??null;}return result.reverse(); }
    for(const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
      const n:Cell=[p[0]+dx,p[1]+dy];if(walkable(c,n)&&!prev.has(key(n))){prev.set(key(n),p);q.push(n);}
    }
  }
  return null;
}
export function directionFor(dx: number, dy: number): number { return (Math.round(Math.atan2(dx,dy)/(Math.PI/4))+8)%8; }
