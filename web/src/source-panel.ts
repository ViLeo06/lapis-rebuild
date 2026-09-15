import type {LoadedPack,QuestContent,NpcRecord} from './model.ts';

const option=(label:string,value:string)=>new Option(label,value);

export function installSourcePanel(pack:LoadedPack){
  const aside=document.querySelector('aside');if(!aside)return;
  const panel=document.createElement('div');panel.className='panel';panel.id='source-content-panel';
  const title=document.createElement('h2');title.textContent='04 原版内容证据';panel.append(title);
  const content=pack.content;
  if(!content){const p=document.createElement('p');p.className='hint';p.id='source-evidence';p.textContent='当前资源包没有 Quest/NPC 内容。';panel.append(p);aside.append(panel);return;}
  const source=content;
  const meta=document.createElement('p');meta.className='hint';meta.id='source-evidence';meta.textContent=`${source.manifest.evidence} · ${source.summary.npc.npc_count} NPC · ${source.summary.quests.length} Quest 文件`;panel.append(meta);

  const npcLabel=document.createElement('label');npcLabel.textContent='NPC 静态记录 ';const npcSelect=document.createElement('select');npcSelect.id='source-npc';npcLabel.append(npcSelect);panel.append(npcLabel);
  const npcLine=document.createElement('select');npcLine.id='source-npc-line';const npcText=document.createElement('p');npcText.id='source-npc-text';npcText.className='hint';panel.append(npcLine,npcText);

  const questLabel=document.createElement('label');questLabel.textContent='Quest 文件 ';const questSelect=document.createElement('select');questSelect.id='source-quest';questLabel.append(questSelect);panel.append(questLabel);
  const stepSelect=document.createElement('select');stepSelect.id='source-step';const questText=document.createElement('div');questText.id='source-quest-text';questText.className='hint';panel.append(stepSelect,questText);

  const note=document.createElement('p');note.className='hint';note.textContent='这是固定 2.2 资源中的静态内容证据。NPC/任务触发坐标、地图绑定和运行时分支仍需后续校准。';panel.append(note);

  const npcs=source.npcScript.npcs;
  for(const npc of npcs)npcSelect.add(option(`${npc.npc_id} / ${npc.name}`,String(npc.npc_id)));
  const questEntries=Object.entries(source.quests).sort(([a],[b])=>Number(a)-Number(b));
  for(const [id,q] of questEntries)questSelect.add(option(`${id} / ${q.source}`,id));

  const currentNpc=():NpcRecord=>npcs.find(n=>String(n.npc_id)===npcSelect.value)??npcs[0];
  function renderNpc(){const npc=currentNpc();npcLine.replaceChildren();npc.entries.forEach((e,i)=>npcLine.add(option(`${i+1} / type ${e.record_type}${e.disabled?' / disabled':''}`,String(i))));renderNpcLine();}
  function renderNpcLine(){const npc=currentNpc(),entry=npc.entries[Number(npcLine.value)||0];npcText.textContent=entry?`${entry.disabled?'[disabled] ':''}${entry.text}`:'--';}
  function currentQuest():QuestContent{return source.quests[questSelect.value]??questEntries[0][1];}
  function renderQuest(){const quest=currentQuest();stepSelect.replaceChildren();quest.steps.forEach(s=>stepSelect.add(option(`STEP${s.number}`,String(s.number))));renderStep();}
  function renderStep(){const quest=currentQuest(),step=quest.steps.find(s=>String(s.number)===stepSelect.value)??quest.steps[0];questText.replaceChildren();for(const event of step.events){if(event.kind!=='line')continue;const p=document.createElement('p');p.textContent=`${String(event.speaker)} · ${event.command}: ${event.text}`;questText.append(p);}if(!questText.childElementCount)questText.textContent='该步骤没有文本事件。';}
  npcSelect.onchange=renderNpc;npcLine.onchange=renderNpcLine;questSelect.onchange=renderQuest;stepSelect.onchange=renderStep;
  renderNpc();renderQuest();aside.append(panel);
}
