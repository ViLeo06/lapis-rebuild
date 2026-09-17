export type GameMode='field'|'battle';
export type BattlePhase='safe'|'active'|'won'|'lost';

export interface PlayerHudState { name:string; className:string; portraitLabel:string; level?:number; hp:number; hpMax:number; mp:number; mpMax:number; gold:number; }
export interface FieldHudState { mapId:number; mapName:string; questTitle?:string; questDetail?:string; interactionPrompt?:string; }
export interface BattleSkillView { id:string|number; name:string; mpCost:number; disabled?:boolean; hotkey?:string; }
export interface BattleHudState { phase:BattlePhase; readiness:number; readinessMax:number; ready:boolean; busy?:boolean; paused?:boolean; targetName?:string; targetHp?:number; targetHpMax?:number; statusText?:string; canAttack:boolean; canRest:boolean; canReturn:boolean; skills:BattleSkillView[]; }
export interface MenuState { open:boolean; canSave:boolean; canLoad:boolean; devEnabled:boolean; }
export interface DiagnosticsState { open:boolean; mapSelector?:string; rawTiming?:string; actionSlot?:string; direction?:string; bounds?:string; magicRes?:string; provenance?:string; }
export interface GameShellState { mode:GameMode; player:PlayerHudState; field:FieldHudState; battle?:BattleHudState; menu:MenuState; diagnostics:DiagnosticsState; notice?:string; }
