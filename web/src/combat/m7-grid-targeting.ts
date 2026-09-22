import type {Cell} from '../coordinates.ts';
import {referenceCellToScreen} from '../coordinates.ts';
import {pixelCell,tileDistance} from '../tactics.ts';

export type M7GridCell=Cell;

export type M7GridTarget=Readonly<{
  id:string;
  x:number;
  y:number;
  hp:number;
  encounterGroup:number;
}>;

export const M7_ORIGINAL_GRID_AREA_AUTHORITY=Object.freeze({
  id:'M7OriginalBattleGridAreaAuthority',
  source:'fixed-hash mainland 2.2 Magictbl.atr plus recovered battle-grid geometry',
  magictblSha256:'d885bbd1bddffd3d4bf05b2b4e36232c62d94fc78209d46861b01986779ef0d9',
  provenance:'VERIFIED-STATIC-ORIGINAL' as const,
  areaCodes:Object.freeze({
    1:Object.freeze({radius:1,cells:5}),
    2:Object.freeze({radius:2,cells:13}),
    3:Object.freeze({radius:3,cells:25}),
    4:Object.freeze({radius:4,cells:41}),
  }),
});

export type M7PoisonSkillLevel=1|2|3|4|5|6;
export type M7PoisonGridGeometry=Readonly<{
  level:M7PoisonSkillLevel;
  castDistance:number;
  areaCode:1|2|3;
  areaCells:5|13|25;
  provenance:'VERIFIED-STATIC-ORIGINAL';
}>;

export const M7_POISON_ORIGINAL_GRID_GEOMETRY:readonly M7PoisonGridGeometry[]=Object.freeze([
  Object.freeze({level:1,castDistance:4,areaCode:1,areaCells:5,provenance:'VERIFIED-STATIC-ORIGINAL' as const}),
  Object.freeze({level:2,castDistance:4,areaCode:1,areaCells:5,provenance:'VERIFIED-STATIC-ORIGINAL' as const}),
  Object.freeze({level:3,castDistance:5,areaCode:2,areaCells:13,provenance:'VERIFIED-STATIC-ORIGINAL' as const}),
  Object.freeze({level:4,castDistance:5,areaCode:2,areaCells:13,provenance:'VERIFIED-STATIC-ORIGINAL' as const}),
  Object.freeze({level:5,castDistance:6,areaCode:2,areaCells:13,provenance:'VERIFIED-STATIC-ORIGINAL' as const}),
  Object.freeze({level:6,castDistance:6,areaCode:3,areaCells:25,provenance:'VERIFIED-STATIC-ORIGINAL' as const}),
]);

export function m7PixelToGridCell(x:number,y:number):M7GridCell{
  return pixelCell(x,y);
}

export function m7GridCellToPixel(cell:M7GridCell):M7GridCell{
  return referenceCellToScreen(cell);
}

export function m7GridDistance(a:M7GridCell,b:M7GridCell):number{
  return tileDistance(a,b);
}

export function m7OriginalAreaRadius(areaCode:number):number{
  if(!Number.isInteger(areaCode)||areaCode<1||areaCode>4)throw new Error('Invalid original area code');
  return areaCode;
}

export function m7OriginalAreaCellCount(areaCode:number):number{
  const radius=m7OriginalAreaRadius(areaCode);
  return 1+2*radius*(radius+1);
}

export function enumerateM7DiamondArea(center:M7GridCell,areaCode:number):readonly M7GridCell[]{
  const radius=m7OriginalAreaRadius(areaCode);
  const cells:M7GridCell[]=[];
  for(let dx=-radius;dx<=radius;dx+=1){
    for(let dy=-radius;dy<=radius;dy+=1){
      const candidate:[number,number]=[center[0]+dx,center[1]+dy];
      if(tileDistance(center,candidate)<=radius)cells.push(Object.freeze(candidate));
    }
  }
  cells.sort((a,b)=>{
    const da=tileDistance(center,a);
    const db=tileDistance(center,b);
    return da-db||a[0]-b[0]||a[1]-b[1];
  });
  const expected=m7OriginalAreaCellCount(areaCode);
  if(cells.length!==expected)throw new Error(`Original grid geometry drift for Area ${areaCode}: expected ${expected}, got ${cells.length}`);
  return Object.freeze(cells);
}

export function validateM7CastCell(
  caster:M7GridCell,
  target:M7GridCell,
  maxDistance:number,
):Readonly<{ok:boolean;distance:number;maxDistance:number}>{
  if(!Number.isInteger(maxDistance)||maxDistance<0)throw new Error('Invalid cast distance');
  const distance=tileDistance(caster,target);
  return Object.freeze({ok:Number.isFinite(distance)&&distance<=maxDistance,distance,maxDistance});
}

export function m7PoisonGeometry(level:number):M7PoisonGridGeometry{
  if(!Number.isInteger(level)||level<1||level>6)throw new Error('Invalid poison skill level');
  return M7_POISON_ORIGINAL_GRID_GEOMETRY[level-1]!;
}

export function affectedM7GridTargets<T extends M7GridTarget>(
  targets:readonly T[],
  center:M7GridCell,
  areaCode:number,
  encounterGroup:number,
):readonly T[]{
  const radius=m7OriginalAreaRadius(areaCode);
  return Object.freeze(targets.filter(target=>
    target.hp>0&&
    target.encounterGroup===encounterGroup&&
    tileDistance(center,pixelCell(target.x,target.y))<=radius
  ));
}

export type M7SkillTargetingPhase='idle'|'aiming'|'confirmed'|'cancelled';

export type M7SkillTargetingState=Readonly<{
  phase:M7SkillTargetingPhase;
  skillId:string|null;
  hoveredCell:M7GridCell|null;
  previewCell:M7GridCell|null;
  confirmedCell:M7GridCell|null;
}>;

function copyCell(cell:M7GridCell|null):M7GridCell|null{
  return cell?Object.freeze([cell[0],cell[1]] as const):null;
}

function sameCell(a:M7GridCell|null,b:M7GridCell|null):boolean{
  return Boolean(a&&b&&a[0]===b[0]&&a[1]===b[1]);
}

export function createM7SkillTargetingState():M7SkillTargetingState{
  return Object.freeze({phase:'idle',skillId:null,hoveredCell:null,previewCell:null,confirmedCell:null});
}

export function beginM7SkillTargeting(skillId:string):M7SkillTargetingState{
  if(!skillId)throw new Error('Missing targeting skill id');
  return Object.freeze({phase:'aiming',skillId,hoveredCell:null,previewCell:null,confirmedCell:null});
}

export function hoverM7SkillTargeting(
  state:M7SkillTargetingState,
  cell:M7GridCell,
):M7SkillTargetingState{
  if(state.phase!=='aiming')return state;
  const next=copyCell(cell);
  return Object.freeze({...state,hoveredCell:next,previewCell:next});
}

export function tapM7SkillTargeting(
  state:M7SkillTargetingState,
  cell:M7GridCell,
):M7SkillTargetingState{
  if(state.phase!=='aiming')return state;
  const next=copyCell(cell)!;
  if(sameCell(state.previewCell,next)){
    return Object.freeze({...state,phase:'confirmed',hoveredCell:next,previewCell:next,confirmedCell:next});
  }
  return Object.freeze({...state,hoveredCell:next,previewCell:next,confirmedCell:null});
}

export function confirmM7SkillTargeting(
  state:M7SkillTargetingState,
  cell: M7GridCell|null = null,
):M7SkillTargetingState{
  if(state.phase!=='aiming')return state;
  const next=copyCell(cell??state.previewCell);
  if(!next)return state;
  return Object.freeze({...state,phase:'confirmed',hoveredCell:next,previewCell:next,confirmedCell:next});
}

export function cancelM7SkillTargeting(state:M7SkillTargetingState):M7SkillTargetingState{
  if(state.phase==='idle')return state;
  return Object.freeze({
    phase:'cancelled',
    skillId:state.skillId,
    hoveredCell:null,
    previewCell:null,
    confirmedCell:null,
  });
}

export function confirmedM7TargetCell(state:M7SkillTargetingState):M7GridCell|null{
  return state.phase==='confirmed'?copyCell(state.confirmedCell):null;
}
