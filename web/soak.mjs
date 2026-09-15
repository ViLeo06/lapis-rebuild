// A real wall-clock browser soak, not a simulated-time test.
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
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('page crashed'));
page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
let started=0;
try{
 await page.goto(pathToFileURL(preview).href);
 await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready);
 const maps=await page.locator('#map option').evaluateAll(opts=>opts.map(o=>o.value));
 const effects=await page.locator('#effect option').evaluateAll(opts=>opts.map(o=>o.value));
 if(maps.length<2)throw new Error('Soak requires at least two maps');
 if(effects.length<1)throw new Error('Soak requires at least one effect');
 started=performance.now();
 let cycle=0;
 while(performance.now()-started<durationMs){
  const cid=cycle%2?'109':'100';
  await page.selectOption('#character',cid);
  await page.selectOption('#action',['00','01','02','03','05'][cycle%5]);
  await page.selectOption('#direction',String(cycle%8));
  await page.selectOption('#map',maps[cycle%maps.length]);
  await page.selectOption('#effect',effects[cycle%effects.length]);
  await page.click('#effect-play');
  await page.check('#anchors');
  await page.locator('#grid').setChecked(cycle%2===0);
  await page.locator('#collision').setChecked(cycle%3===0);
  const snap=await page.evaluate(()=>window.lapisDiagnostics.snapshot());
  if(!snap.playing)await page.click('#play');
  const duration=Math.min(30000,durationMs-(performance.now()-started));
  if(duration>0)await page.waitForTimeout(duration);
  const after=await page.evaluate(()=>window.lapisDiagnostics.snapshot());
  if(!after.ready||!Number.isFinite(after.anchor.x)||after.frame<0||after.cursor>=after.length)throw new Error('Invalid live state');
  if(!maps.includes(String(after.mapId)))throw new Error('Invalid map state');
  if(!after.effect||!effects.includes(String(after.effect.id))||after.effect.frame<0||after.effect.frame>=after.effect.length)throw new Error('Invalid effect state');
  if(errors.length||external.length)throw new Error('Browser error or external request');
  samples.push({elapsedMs:Math.round(performance.now()-started),mapId:after.mapId,character:after.character,slot:after.slot,direction:after.direction,frame:after.frame,effectId:after.effect.id,effectFrame:after.effect.frame,fps:after.fps});
  console.log(JSON.stringify(samples.at(-1)));cycle++;
 }
 await page.screenshot({path:'test-results/soak/end.png',fullPage:true});
 const elapsedMs=Math.round(performance.now()-started);
 if(elapsedMs<durationMs)throw new Error('Wall-clock interval incomplete');
 await writeFile('test-results/soak/report.json',JSON.stringify({status:'passed',scope:'30-minute real-time browser diagnostic soak across character animation, two maps, collision overlays and FOCUS SPR-order playback; not combat or broad-browser certification',elapsedMs,samples,errors,external},null,2));
}catch(e){
 await writeFile('test-results/soak/report.json',JSON.stringify({status:'failed',elapsedMs:started?Math.round(performance.now()-started):0,error:String(e),samples,errors,external},null,2));throw e;
}finally{await browser.close();}
