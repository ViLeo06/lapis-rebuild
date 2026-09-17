// A real wall-clock M4 browser soak, not a simulated-time test.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';

const preview=process.env.LAPIS_OFFLINE_PREVIEW;
if(!preview)throw new Error('LAPIS_OFFLINE_PREVIEW required');
const durationMs=30*60*1000;
await mkdir('test-results/soak',{recursive:true});
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:1080}});
const errors=[],external=[],samples=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('crash',()=>errors.push('page crashed'));
page.on('request',request=>{if(/^https?:/.test(request.url()))external.push(request.url());});

async function clickAction(action){
 await page.evaluate(value=>{
  const button=document.querySelector(`[data-action="${value}"]`);
  if(!(button instanceof HTMLButtonElement))throw new Error(`Missing M4 action ${value}`);
  button.click();
 },action);
}

async function switchClass(character){
 const action=character==='100'?'class-swordsman':'class-wizard';
 await clickAction(action);
 await page.waitForFunction(id=>window.lapisDiagnostics?.snapshot().character===id,character);
}

async function equipLoadout(character){
 const gear=character==='100'?{weapon:'3',armor:'25'}:{weapon:'12',armor:'31'};
 await clickAction('inventory');
 await page.waitForFunction(()=>document.body.classList.contains('m4-inventory-open'));
 await page.waitForFunction(({weapon,armor})=>{
  const w=document.querySelector('#equip-weapon');
  const a=document.querySelector('#equip-armor');
  if(!(w instanceof HTMLSelectElement)||!(a instanceof HTMLSelectElement))return false;
  return [...w.options].some(option=>option.value===weapon)&&[...a.options].some(option=>option.value===armor);
 },gear);
 await page.selectOption('#equip-weapon',gear.weapon);
 await page.selectOption('#equip-armor',gear.armor);
 await clickAction('inventory');
 await page.waitForFunction(()=>!document.body.classList.contains('m4-inventory-open'));
 return gear;
}

async function setDiagnostics(enabled){
 await page.evaluate(value=>{
  const toggle=document.querySelector('[data-action="dev-toggle"]');
  if(!(toggle instanceof HTMLInputElement))throw new Error('Missing developer diagnostics toggle');
  toggle.checked=value;
  toggle.dispatchEvent(new Event('change',{bubbles:true}));
 },enabled);
 await page.waitForFunction(value=>document.body.classList.contains('m4-dev-enabled')===value,enabled);
}

let started=0;
try{
 const url=pathToFileURL(preview);
 url.searchParams.set('m4','1');
 await page.goto(url.href);
 await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
 await page.waitForFunction(()=>document.body.classList.contains('m4-active'));
 started=performance.now();
 let cycle=0;
 while(performance.now()-started<durationMs){
  const character=cycle%2?'109':'100';
  await switchClass(character);
  const gear=await equipLoadout(character);
  const developerMode=cycle%2===0;
  await setDiagnostics(developerMode);

  // Exercise the public M4 persistence surface repeatedly while staying on
  // the field. Combat/quest completion is covered by S14 browser acceptance.
  await page.evaluate(async()=>{await window.lapisM4.save();await window.lapisM4.load();});

  const remaining=durationMs-(performance.now()-started);
  const pause=Math.min(30000,Math.max(0,remaining));
  if(pause>0)await page.waitForTimeout(pause);

  const state=await page.evaluate(()=>({
   scene:window.lapisDiagnostics.snapshot(),
   m4:window.lapisM4.snapshot(),
   save:JSON.parse(window.lapisM4.exportJson()),
   bodyClass:document.body.className,
  }));
  if(!state.scene.ready||state.scene.inBattleView)throw new Error('Invalid M4 field state');
  if(state.scene.character!==character)throw new Error('M4 class switch did not persist');
  if(state.scene.inventory.weapon!==Number(gear.weapon)||state.scene.inventory.armor!==Number(gear.armor))throw new Error('M4 equipment did not persist');
  if(state.save.version!==2||state.save.character!==character)throw new Error('Invalid M4 SaveV2 state');
  if(state.m4.developerMode!==developerMode)throw new Error('M4 diagnostics toggle did not persist');
  if(!Number.isFinite(state.scene.anchor.x)||!Number.isFinite(state.scene.anchor.y)||state.scene.frame<0)throw new Error('Invalid live render state');
  if(errors.length||external.length)throw new Error('Browser error or external request');
  const sample={
   elapsedMs:Math.round(performance.now()-started),
   character,
   mapId:state.scene.mapId,
   frame:state.scene.frame,
   fps:state.scene.fps,
   weapon:state.scene.inventory.weapon,
   armor:state.scene.inventory.armor,
   developerMode:state.m4.developerMode,
   questStage:state.m4.quest.stage,
   saveVersion:state.save.version,
  };
  samples.push(sample);
  console.log(JSON.stringify(sample));
  cycle+=1;
 }
 await page.screenshot({path:'test-results/soak/end.png',fullPage:true});
 const elapsedMs=Math.round(performance.now()-started);
 if(elapsedMs<durationMs)throw new Error('Wall-clock interval incomplete');
 await writeFile('test-results/soak/report.json',JSON.stringify({
  status:'passed',
  scope:'30-minute real-time M4 field soak across player HUD, swordsman/wizard class switching, M4 inventory/equipment, SaveV2 save/load and opt-in diagnostics. Combat and quest completion are covered separately by S14 manual-style browser acceptance.',
  elapsedMs,
  samples,
  errors,
  external,
 },null,2));
}catch(error){
 await writeFile('test-results/soak/report.json',JSON.stringify({status:'failed',elapsedMs:started?Math.round(performance.now()-started):0,error:String(error),samples,errors,external},null,2));
 throw error;
}finally{
 await browser.close();
}
