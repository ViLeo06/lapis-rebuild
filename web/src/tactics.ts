import type {Cell} from './coordinates.ts';
import {rawCell,referenceCellToScreen,referenceScreenToCell} from './coordinates.ts';
import type {Collision} from './model.ts';

// Reimplemented from geometry, not copied from the compatibility runtime.
// Four diagonal neighbours preserve the IMF diamond-grid parity. This is a
// provisional battle traversal policy; terrain costs / retail tie-break await
// independent native verification. Field routing remains a separate policy.
const STEPS: readonly Cell[]=[[-1,-1],[-1,1],[1,-1],[1,1]];
export const cellKey=([x,y]:Cell):string=>`${x},${y}`;
export const sameCell=(a:Cell,b:Cell):boolean=>a[0]===b[0]&&a[1]===b[1];
export const pixelCell=(x:number,y:number):Cell=>referenceScreenToCell(x,y);
export function tileDistance(a:Cell,b:Cell):number {
  if(![...a,...b].every(Number.isInteger)||Math.abs(a[0]-b[0])%2!==Math.abs(a[1]-b[1])%2)return Infinity;
  return Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]));
}
export function reachableCells(c:Collision,start:Cell,limit:number,occupied:readonly Cell[]=[]):Map<string,Cell[]> {
  if(!Number.isInteger(limit)||limit<0||limit>256)throw new Error('Invalid tactical movement budget');
  const paths=new Map<string,Cell[]>();
  if(rawCell(c,start)!==1)return paths;
  const blocked=new Set(occupied.map(cellKey));
  if(blocked.has(cellKey(start)))return paths;
  paths.set(cellKey(start),[start]);const queue:Cell[]=[start];
  for(let i=0;i<queue.length;i++){
    const p=queue[i],path=paths.get(cellKey(p))!;
    if(path.length-1>=limit)continue;
    for(const [dx,dy] of STEPS){const next:Cell=[p[0]+dx,p[1]+dy],key=cellKey(next);
      if(paths.has(key)||blocked.has(key)||rawCell(c,next)!==1)continue;
      paths.set(key,[...path,next]);queue.push(next);
    }
  }
  return paths;
}
export function tacticalRoute(c:Collision,start:Cell,end:Cell,limit:number,occupied:readonly Cell[]=[]):Cell[]|null {
  return reachableCells(c,start,limit,occupied).get(cellKey(end))??null;
}
export type BattleLayout={player:Cell;enemies:[Cell,Cell];focus:{x:number;y:number;width:number;height:number}};
export function chooseBattleLayout(c:Collision):BattleLayout {
  // Choose a connected, legal training formation, never place units by pixels.
  const candidates:Cell[]=[];
  for(let x=0;x<c.width;x++)for(let y=0;y<c.height;y++)if((x+y)%2===0&&rawCell(c,[x,y])===1)candidates.push([x,y]);
  candidates.sort((a,b)=>Math.hypot(a[0]-c.width/2,a[1]-c.height/2)-Math.hypot(b[0]-c.width/2,b[1]-c.height/2));
  for(const player of candidates){
    const options=[...reachableCells(c,player,4).values()].filter(p=>p.length>1);
    const first=options.find(p=>p.length===2);const second=options.find(p=>p.length===5);
    if(!first||!second)continue;
    const [x,y]=referenceCellToScreen(player);
    return {player,enemies:[first.at(-1)!,second.at(-1)!],focus:{x,y,width:768,height:448}};
  }
  throw new Error('Battle map has no valid connected formation');
}
export function enemyStep(c:Collision,start:Cell,target:Cell,occupied:readonly Cell[]):Cell|null {
  const options=[...reachableCells(c,start,16,occupied).values()].filter(p=>p.length>1);
  options.sort((a,b)=>tileDistance(a.at(-1)!,target)-tileDistance(b.at(-1)!,target)||(a.length-b.length));
  return options.length&&tileDistance(options[0].at(-1)!,target)<tileDistance(start,target)?options[0][1]:null;
}
