import {PROVISIONAL as P} from '../config.ts';
import type {BattleState,Enemy} from '../battle.ts';

export const M7_ENCOUNTER_GROUP_TRIGGER_RADIUS_PX=P.rangedRadiusPx;

export function activeEnemyEncounterGroup(
  state:BattleState,
  playerX?:number,
  playerY?:number,
):number|null{
  const living=state.enemies.filter(enemy=>enemy.hp>0);
  if(!living.length)return null;

  if(!Number.isFinite(playerX)||!Number.isFinite(playerY)){
    return living.reduce((group,enemy)=>Math.min(group,enemy.encounterGroup),living[0]!.encounterGroup);
  }

  const nearestByGroup=new Map<number,number>();
  for(const enemy of living){
    const distance=Math.hypot(enemy.x-(playerX as number),enemy.y-(playerY as number));
    const previous=nearestByGroup.get(enemy.encounterGroup);
    if(previous===undefined||distance<previous)nearestByGroup.set(enemy.encounterGroup,distance);
  }

  let active:number|null=null;
  let distance=Number.POSITIVE_INFINITY;
  for(const [group,candidateDistance] of nearestByGroup){
    if(candidateDistance<distance||(candidateDistance===distance&&(active===null||group<active))){
      active=group;
      distance=candidateDistance;
    }
  }
  return distance<=M7_ENCOUNTER_GROUP_TRIGGER_RADIUS_PX?active:null;
}

export function enemyInActiveEncounterGroup(
  state:BattleState,
  enemy:Enemy,
  playerX:number,
  playerY:number,
):boolean{
  return enemy.hp>0&&enemy.encounterGroup===activeEnemyEncounterGroup(state,playerX,playerY);
}


export const M7_BATTLE_POINTER_RADIUS_PX=30;

export function enemyVisibleInBattle(enemy:Enemy):boolean{
  return enemy.hp>0;
}

export type BattlePointerAction=Readonly<{
  enemy:Enemy;
  kind:'basic-attack'|'skill-target';
}>;

export function resolveBattlePointerAction(
  state:BattleState,
  pointerX:number,
  pointerY:number,
  targetingSkill:boolean,
  radius=M7_BATTLE_POINTER_RADIUS_PX,
):BattlePointerAction|null{
  if(!Number.isFinite(pointerX)||!Number.isFinite(pointerY)||!Number.isFinite(radius)||radius<=0)return null;
  let match:Enemy|null=null;
  let matchDistance=Number.POSITIVE_INFINITY;
  for(const enemy of state.enemies){
    if(!enemyVisibleInBattle(enemy))continue;
    const distance=Math.hypot(enemy.x-pointerX,enemy.y-pointerY);
    if(distance<=radius&&distance<matchDistance){
      match=enemy;
      matchDistance=distance;
    }
  }
  return match?Object.freeze({enemy:match,kind:targetingSkill?'skill-target':'basic-attack'}):null;
}
