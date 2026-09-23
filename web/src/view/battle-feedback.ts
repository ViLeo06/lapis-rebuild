import type {Point} from './viewport-state.ts';
export type BattleFeedbackEnemy=Readonly<{id:string;x:number;y:number}>;
export function resolveBattleFeedbackAnchor(target:'player'|string,player:Point,enemies:readonly BattleFeedbackEnemy[]):Point|null{if(target==='player')return{x:player.x,y:player.y-72};const enemy=enemies.find(row=>row.id===target);return enemy?{x:enemy.x,y:enemy.y-78}:null;}
