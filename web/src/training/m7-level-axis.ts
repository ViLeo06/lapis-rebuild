export type M7Profession='swordsman'|'wizard';

export type M7Stage=1|2|3|4|5|6|7;

export type M7StageRange=Readonly<{
  stage:M7Stage;
  minimumLevel:number;
  maximumLevel:number;
  swordsmanStageId:number;
  wizardStageId:number;
}>;

export const M7_STAGE_RANGES:readonly M7StageRange[]=Object.freeze([
  Object.freeze({stage:1,minimumLevel:1,maximumLevel:5,swordsmanStageId:100,wizardStageId:109}),
  Object.freeze({stage:2,minimumLevel:6,maximumLevel:15,swordsmanStageId:110,wizardStageId:119}),
  Object.freeze({stage:3,minimumLevel:16,maximumLevel:25,swordsmanStageId:120,wizardStageId:129}),
  Object.freeze({stage:4,minimumLevel:26,maximumLevel:35,swordsmanStageId:130,wizardStageId:139}),
  Object.freeze({stage:5,minimumLevel:36,maximumLevel:45,swordsmanStageId:140,wizardStageId:149}),
  Object.freeze({stage:6,minimumLevel:46,maximumLevel:55,swordsmanStageId:150,wizardStageId:159}),
  Object.freeze({stage:7,minimumLevel:56,maximumLevel:65,swordsmanStageId:160,wizardStageId:169}),
]);

export const M7_PROMOTION_LEVELS=Object.freeze([6,16,26,36,46,56] as const);
export const M7_DEVELOPER_PRESET_LEVELS=Object.freeze([1,6,16,26,36,46,56,65] as const);

export function resolveM7Stage(level:number):M7StageRange{
  if(!Number.isInteger(level)||level<1||level>65)throw new Error('M7 level must be an integer from 1 to 65');
  const range=M7_STAGE_RANGES.find(row=>level>=row.minimumLevel&&level<=row.maximumLevel);
  if(!range)throw new Error('M7 level is outside the seven-stage axis');
  return range;
}

export function resolveM7StageId(profession:M7Profession,level:number):number{
  const range=resolveM7Stage(level);
  return profession==='swordsman'?range.swordsmanStageId:range.wizardStageId;
}
