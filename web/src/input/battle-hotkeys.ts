export type BattleHotkeyCommand=
  |{kind:'attack'}
  |{kind:'recovery';resource:'hp'|'mp'}
  |{kind:'rest'}
  |{kind:'skill';slot:number}
  |{kind:'toggle-range'}
  |{kind:'cancel'};

const QWER_SKILL_SLOTS=Object.freeze({q:0,w:1,e:2,r:3} as const);
const QWER_LABELS=Object.freeze(['Q','W','E','R'] as const);

export function resolveBattleHotkey(key:string,inBattle:boolean):BattleHotkeyCommand|null{
  if(!inBattle)return null;
  const normalized=key.length===1?key.toLowerCase():key;
  if(normalized==='a')return{kind:'attack'};
  if(normalized==='s')return{kind:'recovery',resource:'hp'};
  if(normalized==='d')return{kind:'recovery',resource:'mp'};
  if(normalized==='f')return{kind:'rest'};
  if(normalized in QWER_SKILL_SLOTS)return{kind:'skill',slot:QWER_SKILL_SLOTS[normalized as keyof typeof QWER_SKILL_SLOTS]};
  if(/^[1-6]$/.test(normalized))return{kind:'skill',slot:Number(normalized)-1};
  if(normalized===' '||normalized==='Space'||normalized==='Spacebar')return{kind:'toggle-range'};
  if(normalized==='Escape')return{kind:'cancel'};
  return null;
}

export function battleSkillHotkeyLabel(index:number):string|undefined{
  if(!Number.isInteger(index)||index<0)return undefined;
  if(index<QWER_LABELS.length)return`${QWER_LABELS[index]} / ${index+1}`;
  if(index<6)return String(index+1);
  return undefined;
}
