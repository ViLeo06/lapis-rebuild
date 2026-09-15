import guideData from '../../data/npcs/m3-guide.json';

export type GuideStage='not_started'|'city_visit'|'return_training'|'complete';
export type QuestState={guide:GuideStage};
export type GuideResult={state:QuestState;message:string;transitionMapId:number|null;advanced:boolean};

type GuideNode={stage:GuideStage;map_id:number;message:string;next_stage:GuideStage;transition_map_id?:number};
type GuideData={schema:number;id:string;name:string;evidence:string;scope:string;nodes:GuideNode[]};
const data=guideData as GuideData;
const stages:GuideStage[]=['not_started','city_visit','return_training','complete'];

function assertData(){
  if(data.schema!==1||data.id!=='m3-guide'||data.evidence!=='UNVERIFIED'||!Array.isArray(data.nodes))throw new Error('Invalid M3 guide data');
  for(const n of data.nodes){
    if(!stages.includes(n.stage)||!stages.includes(n.next_stage)||!Number.isInteger(n.map_id)||n.map_id<0||typeof n.message!=='string'||n.message.length<1||n.message.length>300)throw new Error('Invalid M3 guide node');
    if(n.transition_map_id!==undefined&&(!Number.isInteger(n.transition_map_id)||n.transition_map_id<0))throw new Error('Invalid M3 guide transition');
  }
}
assertData();

export const GUIDE_NAME=data.name;
export const GUIDE_EVIDENCE=data.evidence;
export const initialQuestState=():QuestState=>({guide:'not_started'});

export function validateQuestState(raw:unknown):QuestState{
  if(raw===undefined)return initialQuestState();
  if(!raw||typeof raw!=='object')throw new Error('Invalid quest state');
  const guide=(raw as QuestState).guide;
  if(!stages.includes(guide))throw new Error('Invalid guide quest stage');
  return {guide};
}

export function advanceGuide(state:QuestState,mapId:number):GuideResult{
  const current=validateQuestState(state);
  if(!Number.isInteger(mapId)||mapId<0)throw new Error('Invalid guide map');
  const node=data.nodes.find(n=>n.stage===current.guide&&n.map_id===mapId);
  if(!node)return {state:{...current},message:`${GUIDE_NAME}当前没有可在此地图推进的步骤。`,transitionMapId:null,advanced:false};
  const next={guide:node.next_stage};
  return {state:next,message:node.message,transitionMapId:node.transition_map_id??null,advanced:next.guide!==current.guide};
}

export function guideStageLabel(stage:GuideStage):string{
  return ({not_started:'未开始',city_visit:'前往外城',return_training:'返回对练场',complete:'已完成'})[stage];
}
