export type M7EvidenceLevel =
  | 'VERIFIED'
  | 'VERIFIED-STATIC-ORIGINAL'
  | 'VERIFIED-HISTORICAL'
  | 'RECOVERED_SECONDARY'
  | 'INFERRED'
  | 'SERVER-BOUNDARY'
  | 'RECONSTRUCTION_POLICY'
  | 'UNVERIFIED';

export type M7EvidenceRef = Readonly<{
  level: M7EvidenceLevel;
  source: string;
  note: string;
}>;

export type PlayerMemoryRef = Readonly<{
  level: 'PLAYER_MEMORY';
  source: string;
  note: string;
}>;

export const M7_SWORDSMAN_SKILL_KEYS = Object.freeze([
  '1101',
  '1201',
  '1301',
  '1401',
  '1501',
  'battle-command',
  'stun-strike',
] as const);
export type M7SwordsmanSkillKey = (typeof M7_SWORDSMAN_SKILL_KEYS)[number];
export type M7SwordsmanStageId = 100 | 110 | 120 | 130 | 140 | 150 | 160;
export type M7SkillLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type M7SwordsmanStageBand = Readonly<{
  stageId: M7SwordsmanStageId;
  stageIndex: number;
  minLevel: number;
  maxLevel: number;
  unlockSkillKey: M7SwordsmanSkillKey;
  provenance: 'RECONSTRUCTION_POLICY';
}>;

export const M7_SWORDSMAN_STAGE_BANDS: readonly M7SwordsmanStageBand[] = Object.freeze([
  Object.freeze({stageId:100,stageIndex:1,minLevel:1,maxLevel:5,unlockSkillKey:'1101',provenance:'RECONSTRUCTION_POLICY'}),
  Object.freeze({stageId:110,stageIndex:2,minLevel:6,maxLevel:15,unlockSkillKey:'1201',provenance:'RECONSTRUCTION_POLICY'}),
  Object.freeze({stageId:120,stageIndex:3,minLevel:16,maxLevel:25,unlockSkillKey:'1301',provenance:'RECONSTRUCTION_POLICY'}),
  Object.freeze({stageId:130,stageIndex:4,minLevel:26,maxLevel:35,unlockSkillKey:'1401',provenance:'RECONSTRUCTION_POLICY'}),
  Object.freeze({stageId:140,stageIndex:5,minLevel:36,maxLevel:45,unlockSkillKey:'1501',provenance:'RECONSTRUCTION_POLICY'}),
  Object.freeze({stageId:150,stageIndex:6,minLevel:46,maxLevel:55,unlockSkillKey:'battle-command',provenance:'RECONSTRUCTION_POLICY'}),
  Object.freeze({stageId:160,stageIndex:7,minLevel:56,maxLevel:65,unlockSkillKey:'stun-strike',provenance:'RECONSTRUCTION_POLICY'}),
]);

export type M7SwordsmanSkillLevelDefinition = Readonly<{
  skillLevel: M7SkillLevel;
  mpCost: number;
  mpCostEvidence: M7EvidenceLevel;
  readinessCost: number;
  hitMultipliers: readonly number[];
  independentHitRolls: boolean;
  durationMs: number | null;
  stunChance: number | null;
  bossStunChance: number | null;
  physicalDamageReduction: number | null;
  attackBonus: number | null;
  maxHpBonus: number | null;
  incomingPhysicalDamagePenalty: number | null;
  periodicSelfDamage: Readonly<{amount:number;intervalMs:number;minimumHp:number}> | null;
  commandRangeBonus: number | null;
  readinessEfficiencyBonus: number | null;
  provenance: 'RECONSTRUCTION_POLICY';
}>;

export type M7SwordsmanSkillDefinition = Readonly<{
  skillKey: M7SwordsmanSkillKey;
  originalSkillId: number | null;
  displayName: string;
  aliases: readonly string[];
  unlockLevel: number;
  stageId: M7SwordsmanStageId;
  target: 'enemy' | 'self';
  role: string;
  levels: readonly M7SwordsmanSkillLevelDefinition[];
  evidence: Readonly<{
    identity: M7EvidenceRef;
    highLevelBehavior: M7EvidenceRef;
    numbers: M7EvidenceRef;
    playerMemory?: PlayerMemoryRef;
  }>;
}>;

const STATIC_M5_SKILLS: M7EvidenceRef = Object.freeze({
  level: 'VERIFIED-STATIC-ORIGINAL',
  source: 'fixed-hash 2.2 Set.lib levelabl.atr -> Magictbl.atr canonical S25 matrix',
  note: 'The first five swordsman stage-entry Magic references, names, MP costs and high-level descriptions are authored client data. These rows do not prove server-side arithmetic.',
});
const HISTORICAL_LATE_SKILLS: M7EvidenceRef = Object.freeze({
  level: 'VERIFIED-HISTORICAL',
  source: 'approved M7 2003 mainland-era skill archaeology summary',
  note: 'The late-stage skill identity/high-level role is historical evidence. No fixed 2.2 stage-entry numeric ID is asserted because the canonical stage rows contain zero for stages 6-7.',
});
const RECONSTRUCTION_NUMBERS: M7EvidenceRef = Object.freeze({
  level: 'RECONSTRUCTION_POLICY',
  source: 'M7 S31 approved balance contract',
  note: 'Percentages, durations, readiness costs, chances and offline effect arithmetic are replaceable M7 tuning, not retail claims.',
});
const SACRIFICE_MEMORY: PlayerMemoryRef = Object.freeze({
  level: 'PLAYER_MEMORY',
  source: 'user play memory recorded in the approved M7 S31 contract',
  note: '舍身 was remembered as losing roughly 4-5 HP about every 10 seconds, with little cost growth at higher skill levels. This is an input to reconstruction, not retail verification.',
});

function level(
  skillLevel: M7SkillLevel,
  input: Omit<M7SwordsmanSkillLevelDefinition, 'skillLevel' | 'provenance'>,
): M7SwordsmanSkillLevelDefinition {
  return Object.freeze({skillLevel, ...input, provenance:'RECONSTRUCTION_POLICY'});
}

const empty = Object.freeze({
  durationMs:null,
  stunChance:null,
  bossStunChance:null,
  physicalDamageReduction:null,
  attackBonus:null,
  maxHpBonus:null,
  incomingPhysicalDamagePenalty:null,
  periodicSelfDamage:null,
  commandRangeBonus:null,
  readinessEfficiencyBonus:null,
} as const);

const HEAVY_DAMAGE=[1.35,1.39,1.43,1.47,1.51,1.55] as const;
const HEAVY_STUN=[0.25,0.27,0.29,0.31,0.33,0.35] as const;
const DOUBLE_HIT=[0.70,0.72,0.74,0.76,0.78,0.80] as const;
const STRONG_DEF=[0.25,0.30,0.35,0.40,0.45,0.50] as const;
const BURST_ATTACK=[0.25,0.30,0.35,0.40,0.45,0.50] as const;
const BURST_HP=[0.15,0.18,0.21,0.24,0.27,0.30] as const;
const BURST_INCOMING=[0.25,0.28,0.31,0.34,0.37,0.40] as const;
const BURST_DURATION=[25000,27000,29000,31000,33000,35000] as const;
const SACRIFICE_HP=[4,4,5,5,6,6] as const;
const SACRIFICE_ATTACK=[0.15,0.18,0.22,0.26,0.30,0.35] as const;
const COMMAND_EFFICIENCY=[0.05,0.06,0.07,0.08,0.09,0.10] as const;
const STUN_STRIKE_CHANCE=[0.55,0.59,0.63,0.67,0.71,0.75] as const;
const STUN_STRIKE_BOSS=[0.20,0.22,0.24,0.26,0.28,0.30] as const;

function six(build:(index:number,skillLevel:M7SkillLevel)=>M7SwordsmanSkillLevelDefinition):readonly M7SwordsmanSkillLevelDefinition[]{
  return Object.freeze(([1,2,3,4,5,6] as const).map((skillLevel,index)=>build(index,skillLevel)));
}

export const M7_SWORDSMAN_SKILL_CATALOG: Readonly<Record<M7SwordsmanSkillKey,M7SwordsmanSkillDefinition>> = Object.freeze({
  '1101': Object.freeze({
    skillKey:'1101',originalSkillId:1101,displayName:'重击',aliases:Object.freeze(['强力一击']),unlockLevel:1,stageId:100,target:'enemy',role:'single-hit damage + probabilistic stun',
    levels:six((i,sl)=>level(sl,{...empty,mpCost:25,mpCostEvidence:'VERIFIED-STATIC-ORIGINAL',readinessCost:6,hitMultipliers:Object.freeze([HEAVY_DAMAGE[i]!] as number[]),independentHitRolls:false,stunChance:HEAVY_STUN[i]!,bossStunChance:null})),
    evidence:Object.freeze({identity:STATIC_M5_SKILLS,highLevelBehavior:STATIC_M5_SKILLS,numbers:RECONSTRUCTION_NUMBERS}),
  }),
  '1201': Object.freeze({
    skillKey:'1201',originalSkillId:1201,displayName:'连砍',aliases:Object.freeze(['连续攻击']),unlockLevel:6,stageId:110,target:'enemy',role:'two independent physical strikes',
    levels:six((i,sl)=>level(sl,{...empty,mpCost:23,mpCostEvidence:'VERIFIED-STATIC-ORIGINAL',readinessCost:7,hitMultipliers:Object.freeze([DOUBLE_HIT[i]!,DOUBLE_HIT[i]!] as number[]),independentHitRolls:true})),
    evidence:Object.freeze({identity:STATIC_M5_SKILLS,highLevelBehavior:STATIC_M5_SKILLS,numbers:RECONSTRUCTION_NUMBERS}),
  }),
  '1301': Object.freeze({
    skillKey:'1301',originalSkillId:1301,displayName:'强防',aliases:Object.freeze(['石头皮肤']),unlockLevel:16,stageId:120,target:'self',role:'physical-only mitigation buff',
    levels:six((i,sl)=>level(sl,{...empty,mpCost:20,mpCostEvidence:'VERIFIED-STATIC-ORIGINAL',readinessCost:8,hitMultipliers:Object.freeze([]),independentHitRolls:false,durationMs:30000,physicalDamageReduction:STRONG_DEF[i]!})),
    evidence:Object.freeze({identity:STATIC_M5_SKILLS,highLevelBehavior:STATIC_M5_SKILLS,numbers:RECONSTRUCTION_NUMBERS}),
  }),
  '1401': Object.freeze({
    skillKey:'1401',originalSkillId:1401,displayName:'瞬间爆发',aliases:Object.freeze(['爆发','血爆']),unlockLevel:26,stageId:130,target:'self',role:'attack + max HP buff with physical defence tradeoff',
    levels:six((i,sl)=>level(sl,{...empty,mpCost:20,mpCostEvidence:'VERIFIED-STATIC-ORIGINAL',readinessCost:8,hitMultipliers:Object.freeze([]),independentHitRolls:false,durationMs:BURST_DURATION[i]!,attackBonus:BURST_ATTACK[i]!,maxHpBonus:BURST_HP[i]!,incomingPhysicalDamagePenalty:BURST_INCOMING[i]!})),
    evidence:Object.freeze({identity:STATIC_M5_SKILLS,highLevelBehavior:STATIC_M5_SKILLS,numbers:RECONSTRUCTION_NUMBERS}),
  }),
  '1501': Object.freeze({
    skillKey:'1501',originalSkillId:1501,displayName:'舍身',aliases:Object.freeze(['献身']),unlockLevel:36,stageId:140,target:'self',role:'sustained attack buff with periodic non-lethal HP cost',
    levels:six((i,sl)=>level(sl,{...empty,mpCost:20,mpCostEvidence:'VERIFIED-STATIC-ORIGINAL',readinessCost:8,hitMultipliers:Object.freeze([]),independentHitRolls:false,durationMs:60000,attackBonus:SACRIFICE_ATTACK[i]!,periodicSelfDamage:Object.freeze({amount:SACRIFICE_HP[i]!,intervalMs:10000,minimumHp:1})})),
    evidence:Object.freeze({identity:STATIC_M5_SKILLS,highLevelBehavior:STATIC_M5_SKILLS,numbers:RECONSTRUCTION_NUMBERS,playerMemory:SACRIFICE_MEMORY}),
  }),
  'battle-command': Object.freeze({
    skillKey:'battle-command',originalSkillId:null,displayName:'战斗命令',aliases:Object.freeze(['统帅']),unlockLevel:46,stageId:150,target:'self',role:'command range + light action/readiness efficiency buff',
    levels:six((i,sl)=>level(sl,{...empty,mpCost:20,mpCostEvidence:'RECONSTRUCTION_POLICY',readinessCost:8,hitMultipliers:Object.freeze([]),independentHitRolls:false,durationMs:30000,commandRangeBonus:2,readinessEfficiencyBonus:COMMAND_EFFICIENCY[i]!})),
    evidence:Object.freeze({identity:HISTORICAL_LATE_SKILLS,highLevelBehavior:HISTORICAL_LATE_SKILLS,numbers:RECONSTRUCTION_NUMBERS}),
  }),
  'stun-strike': Object.freeze({
    skillKey:'stun-strike',originalSkillId:null,displayName:'打晕',aliases:Object.freeze(['眩晕攻击']),unlockLevel:56,stageId:160,target:'enemy',role:'low damage + high control, boss-resistant',
    levels:six((i,sl)=>level(sl,{...empty,mpCost:20,mpCostEvidence:'RECONSTRUCTION_POLICY',readinessCost:8,hitMultipliers:Object.freeze([0.75]),independentHitRolls:false,stunChance:STUN_STRIKE_CHANCE[i]!,bossStunChance:STUN_STRIKE_BOSS[i]!})),
    evidence:Object.freeze({identity:HISTORICAL_LATE_SKILLS,highLevelBehavior:HISTORICAL_LATE_SKILLS,numbers:RECONSTRUCTION_NUMBERS}),
  }),
});

export const RECONSTRUCTION_SWORDSMAN_SACRIFICE_POLICY = Object.freeze({
  id:'ReconstructionSwordsmanSacrificePolicy',
  provenance:'RECONSTRUCTION_POLICY' as const,
  durationMs:60000,
  tickIntervalMs:10000,
  hpCostBySkillLevel:Object.freeze([...SACRIFICE_HP]),
  attackBonusBySkillLevel:Object.freeze([...SACRIFICE_ATTACK]),
  minimumHp:1,
  note:'The 15/18/22/26/30/35 curve matches an observed fixed-client Magictbl parameter sequence, but S31 does not claim that client field has been proven to be an attack percentage.',
});

export const M7_SWORDSMAN_SKILL_BALANCE_POLICY = Object.freeze({
  id:'m7-s31-swordsman-seven-stage-v1',
  provenance:'RECONSTRUCTION_POLICY' as const,
  skillPointPolicy:Object.freeze({pointsPerPlayerLevel:1,unlockGrantsSkillLevelOne:true,maxSkillLevel:6}),
  statusStacking:'refresh' as const,
  exactRetailFormula:'SERVER-BOUNDARY' as const,
});

export function isM7SwordsmanSkillKey(value: unknown): value is M7SwordsmanSkillKey {
  return typeof value === 'string' && (M7_SWORDSMAN_SKILL_KEYS as readonly string[]).includes(value);
}

export function swordsmanM7StageForLevel(playerLevel:number):M7SwordsmanStageBand {
  if(!Number.isInteger(playerLevel)||playerLevel<1||playerLevel>65)throw new Error('M7 swordsman level must be 1..65');
  const band=M7_SWORDSMAN_STAGE_BANDS.find(row=>playerLevel>=row.minLevel&&playerLevel<=row.maxLevel);
  if(!band)throw new Error('Missing M7 swordsman stage band');
  return band;
}

export function m7SwordsmanSkill(skillKey:M7SwordsmanSkillKey):M7SwordsmanSkillDefinition {
  const skill=M7_SWORDSMAN_SKILL_CATALOG[skillKey];
  if(!skill)throw new Error(`Unknown M7 swordsman skill ${String(skillKey)}`);
  return skill;
}

export function m7SwordsmanSkillLevel(skillKey:M7SwordsmanSkillKey,skillLevel:number):M7SwordsmanSkillLevelDefinition {
  if(!Number.isInteger(skillLevel)||skillLevel<1||skillLevel>6)throw new Error('M7 skill level must be 1..6');
  return m7SwordsmanSkill(skillKey).levels[skillLevel-1]!;
}

export function availableM7SwordsmanSkillKeys(playerLevel:number):readonly M7SwordsmanSkillKey[] {
  swordsmanM7StageForLevel(playerLevel);
  return Object.freeze(M7_SWORDSMAN_SKILL_KEYS.filter(key=>m7SwordsmanSkill(key).unlockLevel<=playerLevel));
}

export type M7SwordsmanSkillProgressionState = Readonly<{
  schema:1;
  skillLevels: Readonly<Record<M7SwordsmanSkillKey,number>>;
  unspentSkillPoints:number;
  developerOverride:boolean;
  provenance:'RECONSTRUCTION_POLICY';
}>;

function zeroSkillLevels():Record<M7SwordsmanSkillKey,number>{
  return Object.fromEntries(M7_SWORDSMAN_SKILL_KEYS.map(key=>[key,0])) as Record<M7SwordsmanSkillKey,number>;
}

export function createM7SwordsmanSkillProgression(playerLevel:number):M7SwordsmanSkillProgressionState {
  const available=availableM7SwordsmanSkillKeys(playerLevel);
  const levels=zeroSkillLevels();
  for(const key of available)levels[key]=1;
  return validateM7SwordsmanSkillProgression({
    schema:1,
    skillLevels:levels,
    unspentSkillPoints:playerLevel*M7_SWORDSMAN_SKILL_BALANCE_POLICY.skillPointPolicy.pointsPerPlayerLevel,
    developerOverride:false,
    provenance:'RECONSTRUCTION_POLICY',
  },playerLevel);
}

export function createDeveloperM7SwordsmanSkillProgression():M7SwordsmanSkillProgressionState {
  const levels=zeroSkillLevels();
  for(const key of M7_SWORDSMAN_SKILL_KEYS)levels[key]=6;
  return Object.freeze({schema:1,skillLevels:Object.freeze(levels),unspentSkillPoints:0,developerOverride:true,provenance:'RECONSTRUCTION_POLICY'});
}

export function validateM7SwordsmanSkillProgression(raw:unknown,playerLevel:number):M7SwordsmanSkillProgressionState {
  swordsmanM7StageForLevel(playerLevel);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid M7 swordsman skill progression');
  const value=raw as Record<string,unknown>;
  const fields=new Set(['schema','skillLevels','unspentSkillPoints','developerOverride','provenance']);
  if(Object.keys(value).length!==fields.size||Object.keys(value).some(key=>!fields.has(key)))throw new Error('Unknown M7 swordsman skill progression field');
  if(value.schema!==1||value.provenance!=='RECONSTRUCTION_POLICY'||typeof value.developerOverride!=='boolean')throw new Error('Unsupported M7 swordsman skill progression');
  if(!Number.isInteger(value.unspentSkillPoints)||(value.unspentSkillPoints as number)<0||(value.unspentSkillPoints as number)>10000)throw new Error('Invalid unspent skill points');
  if(!value.skillLevels||typeof value.skillLevels!=='object'||Array.isArray(value.skillLevels))throw new Error('Invalid M7 swordsman skill levels');
  const rawLevels=value.skillLevels as Record<string,unknown>;
  if(Object.keys(rawLevels).length!==M7_SWORDSMAN_SKILL_KEYS.length||Object.keys(rawLevels).some(key=>!isM7SwordsmanSkillKey(key)))throw new Error('Invalid M7 swordsman skill level keys');
  const available=new Set(availableM7SwordsmanSkillKeys(playerLevel));
  const levels=zeroSkillLevels();
  for(const key of M7_SWORDSMAN_SKILL_KEYS){
    const skillLevel=rawLevels[key];
    if(!Number.isInteger(skillLevel)||(skillLevel as number)<0||(skillLevel as number)>6)throw new Error(`Invalid skill level for ${key}`);
    if(!value.developerOverride&&available.has(key)&&(skillLevel as number)<1)throw new Error(`Unlocked skill ${key} must retain level 1`);
    if(!value.developerOverride&&!available.has(key)&&skillLevel!==0)throw new Error(`Skill ${key} is locked at player level ${playerLevel}`);
    levels[key]=skillLevel as number;
  }
  return Object.freeze({
    schema:1,
    skillLevels:Object.freeze(levels),
    unspentSkillPoints:value.unspentSkillPoints as number,
    developerOverride:value.developerOverride,
    provenance:'RECONSTRUCTION_POLICY',
  });
}

export function investM7SwordsmanSkillPoint(
  state:M7SwordsmanSkillProgressionState,
  playerLevel:number,
  skillKey:M7SwordsmanSkillKey,
):M7SwordsmanSkillProgressionState {
  const current=validateM7SwordsmanSkillProgression(state,playerLevel);
  if(current.developerOverride)throw new Error('Developer override skill state is not point-investable');
  if(!availableM7SwordsmanSkillKeys(playerLevel).includes(skillKey))throw new Error(`Skill ${skillKey} is not unlocked`);
  if(current.unspentSkillPoints<1)throw new Error('No unspent skill points');
  const currentLevel=current.skillLevels[skillKey];
  if(currentLevel>=6)throw new Error('Skill already at level 6');
  return validateM7SwordsmanSkillProgression({
    ...current,
    skillLevels:{...current.skillLevels,[skillKey]:currentLevel+1},
    unspentSkillPoints:current.unspentSkillPoints-1,
  },playerLevel);
}

export function m7SwordsmanSkillLevelStateCount():number {
  return M7_SWORDSMAN_SKILL_KEYS.reduce((sum,key)=>sum+m7SwordsmanSkill(key).levels.length,0);
}
