import{PROVISIONAL as P}from'./config.ts';
import type{RuntimeProvenance}from'./runtime-boundaries.ts';
export type DamagePolicy={readonly id:string;readonly provenance:RuntimeProvenance;playerDamage(skillId:number|undefined,bonus:number):number;enemyDamage(defense:number,blind:boolean,shield:boolean):number};
export const TRAINING_DAMAGE_POLICY:DamagePolicy=Object.freeze({
  id:'offline-training-damage-v1',
  provenance:'RECONSTRUCTION_POLICY' as const,
  playerDamage(skillId:number|undefined,bonus:number):number{
    if(!Number.isFinite(bonus)||bonus<0)throw new Error('Invalid damage bonus');
    const base=skillId===1101?P.heavyDamage:skillId===1201?P.doubleDamage:P.attackDamage;
    return Math.max(0,base+bonus);
  },
  enemyDamage(defense:number,blind:boolean,shield:boolean):number{
    if(!Number.isFinite(defense)||defense<0)throw new Error('Invalid defense');
    let damage=Math.max(1,P.enemyDamage-defense);
    if(blind)damage*=P.damageReduction;
    if(shield)damage*=P.damageReduction;
    return damage;
  },
});
