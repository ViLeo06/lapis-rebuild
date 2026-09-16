import type {LoadedPack,QuestContent,NpcRecord,TutorialTalk,HelpBlock} from './model.ts';

const option=(label:string,value:string)=>new Option(label,value);

export function installSourcePanel(pack:LoadedPack){
  const aside=document.querySelector('aside');if(!aside)return;
  const panel=document.createElement('div');panel.className='panel';panel.id='source-content-panel';
  const title=document.createElement('h2');title.textContent='04 原版内容证据';panel.append(title);
  const content=pack.content;
  if(!content){const p=document.createElement('p');p.className='quiet';p.id='source-evidence';p.textContent='当前资源包没有 Quest/NPC 内容。';panel.append(p);aside.append(panel);return;}
  const source=content;
  const extended=source.tutorial&&source.helpScript&&source.tutorialHelpSummary;
  const meta=document.createElement('p');meta.className='quiet';meta.id='source-evidence';meta.textContent=`${source.manifest.evidence} · ${source.summary.npc.npc_count} NPC · ${source.summary.quests.length} Quest 文件${extended?` · ${source.tutorial!.summary.talk_count} TALK · ${source.helpScript!.summary.help_count} HELP`:''}`;panel.append(meta);

  const npcLabel=document.createElement('label');npcLabel.textContent='NPC 静态记录 ';const npcSelect=document.createElement('select');npcSelect.id='source-npc';npcLabel.append(npcSelect);panel.append(npcLabel);
  const npcLine=document.createElement('select');npcLine.id='source-npc-line';const npcText=document.createElement('p');npcText.id='source-npc-text';npcText.className='quiet';panel.append(npcLine,npcText);

  const questLabel=document.createElement('label');questLabel.textContent='Quest 文件 ';const questSelect=document.createElement('select');questSelect.id='source-quest';questLabel.append(questSelect);panel.append(questLabel);
  const stepSelect=document.createElement('select');stepSelect.id='source-step';const questText=document.createElement('div');questText.id='source-quest-text';questText.className='quiet';panel.append(stepSelect,questText);

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
  renderNpc();renderQuest();

  if(extended){
    const tutorial=source.tutorial!;
    const tutorialLabel=document.createElement('label');tutorialLabel.textContent='Tutorial TALK ';const talkSelect=document.createElement('select');talkSelect.id='source-tutorial-talk';tutorialLabel.append(talkSelect);panel.append(tutorialLabel);
    const tutorialText=document.createElement('div');tutorialText.id='source-tutorial-text';tutorialText.className='quiet';panel.append(tutorialText);
    for(const talk of tutorial.talks)talkSelect.add(option(`TALK${talk.talk_id}${talk.transition?` / ${talk.transition.kind}`:''}`,String(talk.talk_id)));
    const currentTalk=():TutorialTalk=>tutorial.talks.find(t=>String(t.talk_id)===talkSelect.value)??tutorial.talks[0];
    function renderTalk(){const talk=currentTalk();tutorialText.replaceChildren();for(const event of talk.events){const p=document.createElement('p');if(event.kind==='speaker')p.textContent=`NAME ${event.speaker}`;else if(event.kind==='control')p.textContent=`${event.command}${event.value?` ${event.value.join(',')}`:''}`;else p.textContent=event.text;tutorialText.append(p);}if(talk.transition){const p=document.createElement('p');p.textContent=`→ ${talk.transition.kind}${talk.transition.target!==undefined?` ${talk.transition.target}`:''}`;tutorialText.append(p);}}
    talkSelect.onchange=renderTalk;renderTalk();

    const help=source.helpScript!;
    const helpLabel=document.createElement('label');helpLabel.textContent='HelpScript HELP ';const helpSelect=document.createElement('select');helpSelect.id='source-help';helpLabel.append(helpSelect);panel.append(helpLabel);
    const helpStep=document.createElement('select');helpStep.id='source-help-step';const helpRecords=document.createElement('p');helpRecords.id='source-help-records';helpRecords.className='quiet';panel.append(helpStep,helpRecords);
    for(const block of help.helps)helpSelect.add(option(`HELP${block.help_id}`,String(block.help_id)));
    const currentHelp=():HelpBlock=>help.helps.find(h=>String(h.help_id)===helpSelect.value)??help.helps[0];
    function renderHelp(){const block=currentHelp();helpStep.replaceChildren();for(const step of block.steps)helpStep.add(option(`STEP${step.number}`,String(step.number)));renderHelpStep();}
    function renderHelpStep(){const block=currentHelp(),step=block.steps.find(s=>String(s.number)===helpStep.value)??block.steps[0];helpRecords.textContent=step.records.map(r=>r.join(' ')).join(' | ')||'该步骤没有四整数记录。';}
    helpSelect.onchange=renderHelp;helpStep.onchange=renderHelpStep;renderHelp();
  }

  const note=document.createElement('p');note.className='quiet';note.textContent='这是固定 2.2 资源中的静态内容证据。NPC/任务触发坐标、Tutorial 跳转、HelpScript 四整数记录的运行时语义仍需后续校准。';panel.append(note);
  aside.append(panel);
}
