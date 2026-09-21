import policyData from '../../../../manifests/m7-wizard-seven-stage-skills.json' with {type:'json'};
import type {M6EvidenceLevel} from '../../progression/m6-evidence.ts';

export type M7EvidenceLevel=M6EvidenceLevel;

export const M7_WIZARD_SKILL_KEYS=Object.freeze([
  'dark-veil','poison-mist','nature-force','ashes','curse-eye','blindness','cursed-sword',
] as const);
export type M7WizardSkillKey=(typeof M7_WIZARD_SKILL_KEYS)[number];
export type M7WizardSkillLevel=1|2|3|4|5|6;
export type M7WizardStage=1|2|3|4|5|6|7;
export type M7WizardStageClassId=109|119|129|139|149|159|169;
export type M7WizardSkillTarget='enemy'|'enemy-area'|'self';

export type M7WizardStageRange=Readonly<{
  stage:M7WizardStage;
  classId:M7WizardStageClassId;
  minLevel:number;
  maxLevel:number;
}>;

export type M7WizardSkillParams=Readonly<Record<string,number|boolean>> & Readonly<{
  level:M7WizardSkillLevel;
  mpCost:number;
  readinessCost:number;
  durationMs:number;
}>;

export type M7WizardSkillDefinition=Readonly<{
  key:M7WizardSkillKey;
  authoredSkillId:number|null;
  displayName:string;
  unlockStage:M7WizardStage;
  unlockLevel:number;
  target:M7WizardSkillTarget;
  authoredLv1:Readonly<Record<string,unknown>>|null;
  evidence:Readonly<Record<string,M7EvidenceLevel>>;
  levels:readonly M7WizardSkillParams[];
}>;

export type M7WizardSkillBook=Readonly<{
  schema:1;
  mode:'normal'|'developer';
  levels:Readonly<Record<M7WizardSkillKey,number>>;
  unspentPoints:number;
  provenance:'RECONSTRUCTION_POLICY';
}>;

type RawPolicy=typeof policyData;
const raw=policyData as RawPolicy;

function integer(value:unknown,name:string,min=0,max=Number.MAX_SAFE_INTEGER):number{
  if(!Number.isInteger(value)||(value as number)<min||(value as number)>max)throw new Error('Invalid '+name);
  return value as number;
}
function skillKey(value:string):M7WizardSkillKey{
  if(!(M7_WIZARD_SKILL_KEYS as readonly string[]).includes(value))throw new Error('Unknown M7 wizard skill key '+value);
  return value as M7WizardSkillKey;
}

export const M7_WIZARD_STAGE_RANGES:readonly M7WizardStageRange[]=Object.freeze(raw.levelAxis.map(row=>Object.freeze({
  stage:integer(row.stage,'wizard stage',1,7) as M7WizardStage,
  classId:integer(row.classId,'wizard class id',109,169) as M7WizardStageClassId,
  minLevel:integer(row.minLevel,'minimum level',1,65),
  maxLevel:integer(row.maxLevel,'maximum level',1,65),
})));

if(M7_WIZARD_STAGE_RANGES.length!==7)throw new Error('M7 wizard policy requires seven stage ranges');
const expectedStarts=[1,6,16,26,36,46,56];
const expectedEnds=[5,15,25,35,45,55,65];
const expectedClasses=[109,119,129,139,149,159,169];
for(let i=0;i<7;i+=1){
  const row=M7_WIZARD_STAGE_RANGES[i]!;
  if(row.stage!==i+1||row.minLevel!==expectedStarts[i]||row.maxLevel!==expectedEnds[i]||row.classId!==expectedClasses[i]){
    throw new Error('Invalid M7 wizard stage axis at index '+i);
  }
}

export const M7_WIZARD_SKILLS:readonly M7WizardSkillDefinition[]=Object.freeze(raw.skills.map(entry=>{
  const key=skillKey(entry.key);
  if(entry.levels.length!==6)throw new Error('M7 wizard skill '+key+' must contain six levels');
  const levels=entry.levels.map((params,index)=>{
    const value=params as Record<string,unknown>;
    if(value.level!==index+1)throw new Error('Invalid level row for '+key);
    if(value.readinessCost!==raw.sharedRuntimePolicy.magicReadinessCost)throw new Error('Readiness drift for '+key);
    return Object.freeze({...value}) as M7WizardSkillParams;
  });
  return Object.freeze({
    key,
    authoredSkillId:entry.authoredSkillId,
    displayName:entry.displayName,
    unlockStage:integer(entry.unlockStage,'unlock stage',1,7) as M7WizardStage,
    unlockLevel:integer(entry.unlockLevel,'unlock level',1,65),
    target:entry.target as M7WizardSkillTarget,
    authoredLv1:entry.authoredLv1?Object.freeze({...entry.authoredLv1}):null,
    evidence:Object.freeze({...entry.evidence}) as unknown as Readonly<Record<string,M7EvidenceLevel>>,
    levels:Object.freeze(levels),
  });
}));

if(M7_WIZARD_SKILLS.length!==7||new Set(M7_WIZARD_SKILLS.map(skill=>skill.key)).size!==7){
  throw new Error('M7 wizard catalog must contain seven unique skills');
}
for(const key of M7_WIZARD_SKILL_KEYS){
  if(!M7_WIZARD_SKILLS.some(skill=>skill.key===key))throw new Error('Missing '+key);
}
const SKILL_BY_KEY=new Map<M7WizardSkillKey,M7WizardSkillDefinition>(M7_WIZARD_SKILLS.map(skill=>[skill.key,skill]));
const SKILL_BY_AUTHORED_ID=new Map<number,M7WizardSkillDefinition>(
  M7_WIZARD_SKILLS.filter(skill=>skill.authoredSkillId!==null).map(skill=>[skill.authoredSkillId!,skill]),
);

export const M7_WIZARD_SKILL_POINT_POLICY=Object.freeze({
  id:raw.skillPointPolicy.id,
  pointsAtLevel1:integer(raw.skillPointPolicy.pointsAtLevel1,'points at level 1',0,100),
  pointsPerAdditionalPlayerLevel:integer(raw.skillPointPolicy.pointsPerAdditionalPlayerLevel,'points per level',0,100),
  maxSkillLevel:integer(raw.skillPointPolicy.maxSkillLevel,'max skill level',1,6) as 6,
  provenance:raw.skillPointPolicy.provenance as 'RECONSTRUCTION_POLICY',
});

export const M7_WIZARD_RUNTIME_POLICY=Object.freeze({
  magicReadinessCost:integer(raw.sharedRuntimePolicy.magicReadinessCost,'magic readiness cost',1,20),
  poisonTickIntervalMs:integer(raw.sharedRuntimePolicy.poisonTickIntervalMs,'poison tick interval',1,60000),
  petrifyDotContinues:Boolean(raw.sharedRuntimePolicy.petrifyDotContinues),
  provenance:raw.sharedRuntimePolicy.provenance as 'RECONSTRUCTION_POLICY',
});

export function m7WizardStageForLevel(level:number):M7WizardStageRange{
  integer(level,'player level',1,65);
  const result=M7_WIZARD_STAGE_RANGES.find(row=>level>=row.minLevel&&level<=row.maxLevel);
  if(!result)throw new Error('No M7 wizard stage for level '+level);
  return result;
}
export function m7WizardSkillByKey(key:M7WizardSkillKey):M7WizardSkillDefinition{
  const found=SKILL_BY_KEY.get(skillKey(key));
  if(!found)throw new Error('Unknown M7 wizard skill '+key);
  return found;
}
export function m7WizardSkillByAuthoredId(skillId:number):M7WizardSkillDefinition|null{
  integer(skillId,'authored skill id',1);
  return SKILL_BY_AUTHORED_ID.get(skillId)??null;
}
export function m7WizardSkillLevel(key:M7WizardSkillKey,level:number):M7WizardSkillParams{
  integer(level,'skill level',1,6);
  return m7WizardSkillByKey(key).levels[level-1]!;
}
export function m7WizardAllowedSkillKeys(playerLevel:number):readonly M7WizardSkillKey[]{
  const stage=m7WizardStageForLevel(playerLevel).stage;
  return Object.freeze(M7_WIZARD_SKILLS.filter(skill=>skill.unlockStage<=stage).map(skill=>skill.key));
}
export function m7WizardTotalSkillPoints(playerLevel:number):number{
  integer(playerLevel,'player level',1,65);
  return M7_WIZARD_SKILL_POINT_POLICY.pointsAtLevel1+
    (playerLevel-1)*M7_WIZARD_SKILL_POINT_POLICY.pointsPerAdditionalPlayerLevel;
}
function emptyLevels():Record<M7WizardSkillKey,number>{
  return Object.fromEntries(M7_WIZARD_SKILL_KEYS.map(key=>[key,0])) as Record<M7WizardSkillKey,number>;
}
export function createM7WizardSkillBook(playerLevel:number):M7WizardSkillBook{
  return Object.freeze({
    schema:1 as const,
    mode:'normal' as const,
    levels:Object.freeze(emptyLevels()),
    unspentPoints:m7WizardTotalSkillPoints(playerLevel),
    provenance:'RECONSTRUCTION_POLICY' as const,
  });
}
export function developerM7WizardSkillBook(playerLevel:number):M7WizardSkillBook{
  m7WizardStageForLevel(playerLevel);
  return Object.freeze({
    schema:1 as const,
    mode:'developer' as const,
    levels:Object.freeze(Object.fromEntries(M7_WIZARD_SKILL_KEYS.map(key=>[key,6])) as Record<M7WizardSkillKey,number>),
    unspentPoints:0,
    provenance:'RECONSTRUCTION_POLICY' as const,
  });
}
export function validateM7WizardSkillBook(rawBook:unknown,playerLevel:number,allowDeveloper=false):M7WizardSkillBook{
  m7WizardStageForLevel(playerLevel);
  if(!rawBook||typeof rawBook!=='object'||Array.isArray(rawBook))throw new Error('Invalid M7 wizard skill book');
  const input=rawBook as Partial<M7WizardSkillBook>;
  if(input.schema!==1||input.provenance!=='RECONSTRUCTION_POLICY'||!['normal','developer'].includes(String(input.mode))){
    throw new Error('Unsupported M7 wizard skill book');
  }
  if(input.mode==='developer'&&!allowDeveloper)throw new Error('Developer wizard skill book cannot enter normal persistence');
  if(!input.levels||typeof input.levels!=='object'||Array.isArray(input.levels))throw new Error('Invalid wizard skill levels');
  const keys=Object.keys(input.levels);
  if(keys.length!==M7_WIZARD_SKILL_KEYS.length||
    keys.some(key=>!(M7_WIZARD_SKILL_KEYS as readonly string[]).includes(key))){
    throw new Error('Wizard skill level keys do not match catalog');
  }
  const levels=emptyLevels();
  let spent=0;
  const allowed=new Set(m7WizardAllowedSkillKeys(playerLevel));
  for(const key of M7_WIZARD_SKILL_KEYS){
    const value=integer((input.levels as Record<string,unknown>)[key],key+' skill level',0,6);
    if(input.mode==='normal'&&value>0&&!allowed.has(key))throw new Error('Skill '+key+' is not unlocked at player level '+playerLevel);
    levels[key]=value;
    spent+=value;
  }
  const unspentPoints=integer(input.unspentPoints,'unspent skill points',0,100000);
  if(input.mode==='normal'&&spent+unspentPoints!==m7WizardTotalSkillPoints(playerLevel)){
    throw new Error('Wizard skill point budget mismatch');
  }
  if(input.mode==='developer'&&(spent!==42||unspentPoints!==0)){
    throw new Error('Developer override must expose all seven skills at Lv6');
  }
  return Object.freeze({
    schema:1 as const,
    mode:input.mode!,
    levels:Object.freeze(levels),
    unspentPoints,
    provenance:'RECONSTRUCTION_POLICY' as const,
  });
}
export function upgradeM7WizardSkill(
  book:M7WizardSkillBook,
  playerLevel:number,
  key:M7WizardSkillKey,
):M7WizardSkillBook{
  const current=validateM7WizardSkillBook(book,playerLevel,false);
  if(!m7WizardAllowedSkillKeys(playerLevel).includes(key))throw new Error('Skill '+key+' is not unlocked');
  if(current.levels[key]>=6)throw new Error('Skill '+key+' is already Lv6');
  if(current.unspentPoints<1)throw new Error('No wizard skill points available');
  return validateM7WizardSkillBook({
    ...current,
    levels:{...current.levels,[key]:current.levels[key]+1},
    unspentPoints:current.unspentPoints-1,
  },playerLevel,false);
}
export function reconcileM7WizardSkillBookForLevel(
  book:M7WizardSkillBook,
  oldLevel:number,
  newLevel:number,
):M7WizardSkillBook{
  if(newLevel<oldLevel)throw new Error('M7 wizard level reconciliation cannot go backwards');
  const current=validateM7WizardSkillBook(book,oldLevel,false);
  m7WizardStageForLevel(newLevel);
  const gained=m7WizardTotalSkillPoints(newLevel)-m7WizardTotalSkillPoints(oldLevel);
  return validateM7WizardSkillBook({...current,unspentPoints:current.unspentPoints+gained},newLevel,false);
}
