import { PROVISIONAL as P } from './config.ts';
export type Skill = { skill_id: number; name: string; mp_cost: number; explanation: string; magic_pattern_id: number };
export type Enemy = { id: string; hp: number; maxHp: number; x: number; y: number; role: 'melee'|'ranged'; blind: number; poison: number };
export type BattleState = { phase: 'safe'|'active'|'won'|'lost'; hp:number;mp:number;maxHp:number;maxMp:number; reward:number; shield:number;manaBuff:number; cooldown:number; enemyClock:number; enemies:Enemy[] };
export function initialState(): BattleState { return {phase:'safe',hp:125,mp:100,maxHp:125,maxMp:100,reward:0,shield:0,manaBuff:0,cooldown:0,enemyClock:0,enemies:[]}; }
export function beginBattle(x:number,y:number): BattleState { const s=initialState();s.phase='active';s.enemies=[{id:'dummy-melee',hp:P.enemyHp,maxHp:P.enemyHp,x:x+65,y,role:'melee',blind:0,poison:0},{id:'dummy-ranged',hp:P.enemyHp,maxHp:P.enemyHp,x:x+155,y:y-30,role:'ranged',blind:0,poison:0}];return s; }
function finish(s: BattleState) { if(s.hp<=0)s.phase='lost';else if(s.phase==='active'&&s.enemies.every(e=>e.hp<=0)){s.phase='won';s.reward+=10;} }
export function useAttack(s:BattleState, targetId:string, x:number,y:number, skill:Skill|null): {ok:boolean;message:string} {
  if(s.phase!=='active')return {ok:false,message:'\u8bf7\u5148\u8fdb\u5165\u8bad\u7ec3\u6218\u6597'};
  if(s.cooldown>0)return {ok:false,message:'\u52a8\u4f5c\u51b7\u5374\u4e2d'};
  const cost=skill?.mp_cost??0;
  if(s.mp<cost)return {ok:false,message:'MP \u4e0d\u8db3'};
  const sid=skill?.skill_id;
  const buff=sid===1301||sid===19301;
  const e=s.enemies.find(e=>e.id===targetId&&e.hp>0);
  if(!buff&&!e)return {ok:false,message:'\u8bf7\u9009\u62e9\u5b58\u6d3b\u76ee\u6807'};
  const range=sid&&sid>=19000?P.rangedRadiusPx:P.meleeRadiusPx;
  if(!buff&&e&&Math.hypot(e.x-x,e.y-y)>range)return {ok:false,message:'\u76ee\u6807\u8d85\u51fa\u4e34\u65f6\u5c04\u7a0b'};
  s.mp-=cost;s.cooldown=P.attackCooldownMs;
  if(sid===1301)s.shield=6000;
  else if(sid===19301)s.manaBuff=6000;
  else if(e){
    if(sid===19101)e.blind=5000;
    else if(sid===19201){e.poison=5000;e.hp=Math.max(0,e.hp-12);}
    else { const damage=sid===1101?34:sid===1201?36:P.attackDamage;e.hp=Math.max(0,e.hp-damage);if(s.manaBuff>0)s.mp=Math.min(s.maxMp,s.mp+6); }
  }
  finish(s);return {ok:true,message:`${skill?.name??'\u666e\u901a\u653b\u51fb'} / UNVERIFIED`};
}
export function updateBattle(s:BattleState,delta:number,x:number,y:number):void {
  if(s.phase!=='active')return;
  const dt=Math.min(250,Math.max(0,delta));s.cooldown=Math.max(0,s.cooldown-dt);s.shield=Math.max(0,s.shield-dt);s.manaBuff=Math.max(0,s.manaBuff-dt);s.enemyClock+=dt;
  for(const e of s.enemies){e.blind=Math.max(0,e.blind-dt);if(e.poison>0&&e.hp>0){const dose=Math.min(e.poison,dt);e.hp=Math.max(0,e.hp-dose*.005);e.poison-=dose;}}
  if(s.enemyClock>=P.enemyIntervalMs){s.enemyClock%=P.enemyIntervalMs;for(const e of s.enemies){if(e.hp<=0)continue;const range=e.role==='melee'?P.meleeRadiusPx:P.rangedRadiusPx;if(Math.hypot(e.x-x,e.y-y)<=range){let damage=P.enemyDamage;if(e.blind>0)damage*=.5;if(s.shield>0)damage*=.5;s.hp=Math.max(0,s.hp-damage);}}}
  finish(s);
}
