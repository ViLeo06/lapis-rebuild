import { PROVISIONAL as P } from './config.ts';

export type Skill = {
  skill_id: number;
  name: string;
  mp_cost: number;
  explanation: string;
  magic_pattern_id: number;
  magic_pattern?: { magic_resources?: { magic_resource_id:number; role?:string; start_tick?:number }[] };
};

export type Enemy = {
  id: string;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  role: 'melee'|'ranged';
  blind: number;
  poison: number;
};

export type BattleState = {
  phase: 'safe'|'active'|'won'|'lost';
  hp:number;
  mp:number;
  maxHp:number;
  maxMp:number;
  reward:number;
  shield:number;
  manaBuff:number;
  cooldown:number;
  action:number;
  actionMax:number;
  enemyClock:number;
  enemies:Enemy[];
};

export function initialState(): BattleState {
  return {
    phase:'safe',
    hp:P.initialHp,
    mp:P.initialMp,
    maxHp:P.initialHp,
    maxMp:P.initialMp,
    reward:0,
    shield:0,
    manaBuff:0,
    cooldown:0,
    action:0,
    actionMax:P.battleActionMax,
    enemyClock:0,
    enemies:[],
  };
}

export function beginBattle(x:number,y:number): BattleState {
  const s=initialState();
  s.phase='active';
  // The separate battle screen starts with one immediately available action.
  // Exact recharge timing remains UNVERIFIED until runtime evidence is captured.
  s.action=s.actionMax;
  s.enemies=[
    {id:'dummy-melee',hp:P.enemyHp,maxHp:P.enemyHp,x:x+65,y,role:'melee',blind:0,poison:0},
    {id:'dummy-ranged',hp:P.enemyHp,maxHp:P.enemyHp,x:x+155,y:y-30,role:'ranged',blind:0,poison:0},
  ];
  return s;
}

export function actionReady(s:BattleState): boolean {
  return s.phase==='active' && s.action>=s.actionMax && s.cooldown<=0;
}

export function consumeAction(s:BattleState): boolean {
  if(!actionReady(s))return false;
  s.action=0;
  s.cooldown=P.attackCooldownMs;
  return true;
}

function finish(s: BattleState) {
  if(s.hp<=0)s.phase='lost';
  else if(s.phase==='active'&&s.enemies.every(e=>e.hp<=0)){
    s.phase='won';
    s.reward+=P.reward;
  }
}

export function useAttack(
  s:BattleState,
  targetId:string,
  x:number,
  y:number,
  skill:Skill|null,
  bonus=0,
): {ok:boolean;message:string} {
  if(s.phase!=='active')return {ok:false,message:'请先进入战斗画面'};
  if(!actionReady(s))return {ok:false,message:'行动槽尚未蓄满'};
  const cost=skill?.mp_cost??0;
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isInteger(cost)||cost<0||!Number.isFinite(bonus)||bonus<0||bonus>100)return {ok:false,message:'Invalid action parameters'};
  if(skill && ![1101,1201,1301,19101,19201,19301].includes(skill.skill_id))return {ok:false,message:'Unsupported training skill'};
  if(s.mp<cost)return {ok:false,message:'MP 不足'};
  const sid=skill?.skill_id;
  const buff=sid===1301||sid===19301;
  const e=s.enemies.find(e=>e.id===targetId&&e.hp>0);
  if(!buff&&!e)return {ok:false,message:'请选择存活目标'};
  const range=sid&&sid>=19000?P.rangedRadiusPx:P.meleeRadiusPx;
  if(!buff&&e&&Math.hypot(e.x-x,e.y-y)>range)return {ok:false,message:'目标超出临时射程'};

  s.mp-=cost;
  consumeAction(s);
  if(sid===1301)s.shield=P.shieldDurationMs;
  else if(sid===19301)s.manaBuff=P.manaBuffDurationMs;
  else if(e){
    if(sid===19101)e.blind=P.blindDurationMs;
    else if(sid===19201){
      e.poison=P.poisonDurationMs;
      e.hp=Math.max(0,e.hp-P.poisonInitialDamage);
    }else{
      const damage=sid===1101?P.heavyDamage:sid===1201?P.doubleDamage:P.attackDamage;
      e.hp=Math.max(0,e.hp-damage-bonus);
      if(s.manaBuff>0)s.mp=Math.min(s.maxMp,s.mp+P.manaReturn);
    }
  }
  finish(s);
  return {ok:true,message:`${skill?.name??'普通攻击'} / UNVERIFIED`};
}

export function updateBattle(s:BattleState,delta:number,x:number,y:number,defense=0):void {
  if(s.phase!=='active')return;
  const dt=Math.min(250,Math.max(0,delta));
  s.cooldown=Math.max(0,s.cooldown-dt);
  s.action=Math.min(s.actionMax,s.action+s.actionMax*dt/P.battleActionFillMs);
  s.shield=Math.max(0,s.shield-dt);
  s.manaBuff=Math.max(0,s.manaBuff-dt);
  s.enemyClock+=dt;
  for(const e of s.enemies){
    e.blind=Math.max(0,e.blind-dt);
    if(e.poison>0&&e.hp>0){
      const dose=Math.min(e.poison,dt);
      e.hp=Math.max(0,e.hp-dose*P.poisonDamagePerMs);
      e.poison-=dose;
    }
  }
  if(s.enemyClock>=P.enemyIntervalMs){
    s.enemyClock%=P.enemyIntervalMs;
    for(const e of s.enemies){
      if(e.hp<=0)continue;
      const range=e.role==='melee'?P.meleeRadiusPx:P.rangedRadiusPx;
      if(Math.hypot(e.x-x,e.y-y)<=range){
        let damage=Math.max(1,P.enemyDamage-defense);
        if(e.blind>0)damage*=P.damageReduction;
        if(s.shield>0)damage*=P.damageReduction;
        s.hp=Math.max(0,s.hp-damage);
      }
    }
  }
  finish(s);
}
