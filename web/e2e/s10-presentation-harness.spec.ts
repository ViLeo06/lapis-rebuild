import{test,expect}from'@playwright/test';
import{BattlePresentation}from'../src/presentation/battle-presentation.ts';
import type{BattlePresentationBatch}from'../src/presentation/battle-presentation.ts';

const esc=(value:unknown)=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));

function renderHarness(title:string,batch:BattlePresentationBatch):string{
  const cues=batch.visual.map((cue,index)=>`<li><b>${index+1}. ${esc(cue.kind)}</b><span>${esc(cue.atMs)}ms${cue.durationMs===undefined?'':` / ${esc(cue.durationMs)}ms`}</span><small>${esc(cue.provenance)}</small><p>${esc(cue.note)}</p></li>`).join('');
  const audio=batch.audio.map(route=>`<li><b>${esc(route.event)}</b><span>${esc(route.action)} / ${esc(route.path??'unresolved')}</span><small>${esc(route.bindingProvenance)}</small></li>`).join('');
  const damage=batch.visual.find(cue=>cue.kind==='damage-number')?.amount;
  const magic=batch.visual.find(cue=>cue.kind==='magic-stage')?.resourceId;
  const terminal=batch.kind==='victory'?'VICTORY':batch.kind==='defeat'?'DEFEAT':'';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:Tahoma,Arial,sans-serif;background:#101416;color:#ddd}
    main{width:960px;height:540px;margin:0 auto;position:relative;overflow:hidden;background:linear-gradient(#243033,#182224 70%,#111719);border:1px solid #5a675f}
    header{height:42px;padding:9px 14px;border-bottom:1px solid #788174;background:#1b2425;font-size:16px;letter-spacing:.4px}
    header em{float:right;font-style:normal;color:#d1b878;font-size:11px}
    .field{position:absolute;left:18px;top:58px;width:600px;height:420px;border:1px solid #616d64;background:repeating-linear-gradient(135deg,#26382f 0 24px,#293d33 24px 48px)}
    .grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff0e 1px,transparent 1px),linear-gradient(90deg,#ffffff0e 1px,transparent 1px);background-size:32px 32px}
    .actor{position:absolute;width:52px;height:74px;border:2px solid #d0c39a;background:#7c8a79;box-shadow:0 6px 0 #0005}
    .player{left:135px;top:235px}.enemy{left:390px;top:170px;background:#806d67;border-color:#d6a394}
    .hp{position:absolute;width:120px;height:10px;border:1px solid #c7c7b8;background:#171b1b}.hp i{display:block;height:100%;background:#8ea76a}.php{left:100px;top:330px}.hpe{left:355px;top:145px}.hpe i{width:${batch.kind==='death'?'0':batch.kind==='hit'?'45':'78'}%}
    .damage{position:absolute;left:426px;top:128px;font:bold 24px Georgia,serif;color:#f0d9a3;text-shadow:1px 1px #000;opacity:${damage===undefined?0:1}}
    .effect{position:absolute;left:382px;top:142px;width:74px;height:74px;border:2px dashed #d7c187;border-radius:50%;opacity:${magic===undefined?0:.8}}
    .terminal{position:absolute;left:120px;right:120px;top:185px;text-align:center;font:bold 38px Georgia,serif;color:#e3d4a4;text-shadow:2px 2px #000;letter-spacing:4px}
    aside{position:absolute;right:18px;top:58px;width:306px;height:464px;border:1px solid #616d64;background:#161d1f;padding:10px;overflow:hidden}
    h2{font-size:13px;margin:0 0 6px;color:#d6c596}ul{margin:0 0 9px;padding:0;list-style:none}li{border-top:1px solid #394345;padding:5px 0;font-size:11px}li:first-child{border-top:0}li b{display:inline-block;min-width:122px;color:#d9ddd4}li span{color:#b8c1bb}li small{display:block;color:#b18f69;margin-top:2px}li p{margin:3px 0 0;color:#87918d;line-height:1.2}
    footer{position:absolute;left:18px;bottom:12px;font-size:10px;color:#aaa;background:#101416cc;padding:4px 7px;border:1px solid #434b48}
  </style></head><body><main data-state="${esc(batch.kind)}"><header>${esc(title)}<em>S10 synthetic presentation harness — not retail visual proof</em></header><section class="field"><div class="grid"></div><div class="actor player"></div><div class="actor enemy"></div><div class="hp php"><i style="width:86%"></i></div><div class="hp hpe"><i></i></div><div class="damage">-${esc(damage??'')}</div><div class="effect"></div><div class="terminal">${terminal}</div></section><aside><h2>Visual cues</h2><ul>${cues}</ul><h2>Audio routes</h2><ul>${audio||'<li>none</li>'}</ul></aside><footer>Unknown impact/death/MagicRes/audio bindings remain RECONSTRUCTION_POLICY or UNVERIFIED.</footer></main></body></html>`;
}

test('S10 deterministic presentation screenshots cover all requested states',async({page})=>{
  const p=new BattlePresentation();
  const cases:[string,string,BattlePresentationBatch][]=[
    ['01','battle-start',p.battleStart({zoneId:100,metadataTrackId:5})],
    ['02','move',p.move({durationMs:240})],
    ['03','attack',p.attack({rawTiming:10,frameCount:5})],
    ['04','hit',p.hit({targetId:'dummy-melee',amount:10,resultingHp:46,maxHp:56})],
    ['05','magic',p.magicEffect({resources:[{resourceId:1,rawTiming:30,frameCount:4,role:'target',rawStartTick:2,focusRow:0},{resourceId:35,rawTiming:40,frameCount:3,role:'caster',rawStartTick:5,focusRow:2}],context:{caster:{x:160,y:250},target:{x:420,y:190}}})],
    ['06','death',p.deathOf('enemy','dummy-melee')],
    ['07','victory',p.terminal('won')],
    ['08','defeat',p.terminal('lost')],
  ];
  await page.setViewportSize({width:960,height:540});
  for(const [prefix,title,batch]of cases){
    await page.setContent(renderHarness(title,batch));
    await expect(page.locator('main')).toHaveAttribute('data-state',batch.kind);
    await expect(page.locator('footer')).toContainText('RECONSTRUCTION_POLICY');
    await page.screenshot({path:`test-results/s10-${prefix}-${title}.png`,fullPage:true});
  }
});
