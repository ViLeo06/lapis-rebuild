import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {writeFileSync} from 'node:fs';

const snap=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());
async function ready(page:Page){
  await page.goto('/');
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready);
  await page.selectOption('#map','0');
}
async function clickWorld(page:Page,x:number,y:number){
  const canvas=page.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const b=await canvas.boundingBox();
  if(!b)throw Error('Missing canvas');
  const camera=(await snap(page)).camera;
  await page.mouse.click(b.x+(x-camera.x)*camera.zoom,b.y+(y-camera.y)*camera.zoom);
}

test('S7 manual-style real-resource acceptance path',async({page})=>{
  test.setTimeout(120000);
  const checkpoints:Record<string,unknown>={};
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));

  await ready(page);
  await page.selectOption('#character','100');
  checkpoints.initial=await snap(page);
  await page.screenshot({path:'test-results/s7-01-field.png',fullPage:true});

  // Walk on the field before entering battle, like a player rather than a direct state mutation.
  const fieldBefore=await snap(page);
  await clickWorld(page,fieldBefore.anchor.x+64,fieldBefore.anchor.y);
  await expect.poll(async()=>(await snap(page)).anchor.x,{timeout:10000}).not.toBe(fieldBefore.anchor.x);
  await expect.poll(async()=>(await snap(page)).routeLength,{timeout:10000}).toBe(0);
  checkpoints.fieldMoved=await snap(page);
  await page.screenshot({path:'test-results/s7-02-field-moved.png',fullPage:true});

  // Use a legal swordsman loadout and enter the reconstructed encounter through the UI.
  await page.selectOption('#equip-weapon','3');
  await page.selectOption('#equip-armor','25');
  await page.click('#battle');
  await expect.poll(async()=>(await snap(page)).inBattleView).toBe(true);
  const entered=await snap(page);
  expect(entered.character).toBe('100');
  expect(entered.battleEntry?.provenance).toBe('RECONSTRUCTION_POLICY');
  expect(entered.damagePolicy.provenance).toBe('RECONSTRUCTION_POLICY');
  checkpoints.battleEntered=entered;
  await page.screenshot({path:'test-results/s7-03-battle-entered.png',fullPage:true});

  let capturedMove=false;
  let capturedAttack=false;
  for(let n=0;n<24;n++){
    await expect.poll(async()=>{const s=await snap(page);return s.phase!=='active'||s.actionReady;},{timeout:10000,intervals:[50]}).toBe(true);
    const s=await snap(page);
    if(s.phase==='won')break;
    expect(s.phase,`Battle ended unexpectedly: ${JSON.stringify({hp:s.hp,enemies:s.enemies})}`).toBe('active');
    const target=s.enemies.find(e=>e.hp>0)!;

    // Freeze only while deliberately selecting the live moving target.
    if(s.target!==target.id){
      await page.click('#battle-pause');
      const frozen=await snap(page);
      const liveTarget=frozen.enemies.find(e=>e.id===target.id&&e.hp>0)!;
      await clickWorld(page,liveTarget.x,liveTarget.y);
      await expect.poll(async()=>(await snap(page)).target,{intervals:[50]}).toBe(target.id);
      await page.click('#battle-pause');
    }

    const current=await snap(page);
    const liveTarget=current.enemies.find(e=>e.id===target.id&&e.hp>0)!;
    const distance=Math.max(Math.abs(liveTarget.cell[0]-current.battleCell[0]),Math.abs(liveTarget.cell[1]-current.battleCell[1]));
    if(distance<=1){
      await page.locator('#attack').click({timeout:3000});
      if(!capturedAttack){
        await page.waitForTimeout(120);
        checkpoints.firstAttack=await snap(page);
        await page.screenshot({path:'test-results/s7-05-first-attack.png',fullPage:true});
        capturedAttack=true;
      }
      continue;
    }

    const options=[...current.reachable].sort((a,b)=>
      Math.max(Math.abs(a[0]-liveTarget.cell[0]),Math.abs(a[1]-liveTarget.cell[1]))-
      Math.max(Math.abs(b[0]-liveTarget.cell[0]),Math.abs(b[1]-liveTarget.cell[1]))
    );
    expect(options.length).toBeGreaterThan(0);
    const from=[...current.battleCell];
    const c=options[0];
    await clickWorld(page,(c[0]+1)*32,(c[1]+1)*16);
    await expect.poll(async()=>JSON.stringify((await snap(page)).battleCell),{timeout:10000}).not.toBe(JSON.stringify(from));
    if(!capturedMove){
      checkpoints.firstMove=await snap(page);
      await page.screenshot({path:'test-results/s7-04-first-move.png',fullPage:true});
      capturedMove=true;
    }
  }

  await expect.poll(async()=>(await snap(page)).phase,{timeout:10000}).toBe('won');
  checkpoints.victory=await snap(page);
  expect(capturedMove).toBe(true);
  expect(capturedAttack).toBe(true);
  await page.screenshot({path:'test-results/s7-06-victory.png',fullPage:true});

  await page.click('#return');
  const returned=await snap(page);
  expect(returned.inBattleView).toBe(false);
  expect(returned.gold).toBe(10);
  checkpoints.returned=returned;
  await page.screenshot({path:'test-results/s7-07-returned.png',fullPage:true});

  // Switch to the second user-priority class and exercise its visible battle skill.
  await page.selectOption('#character','109');
  await page.click('#battle');
  await expect(page.locator('#skill-19301')).toBeVisible();
  const wizardBefore=await snap(page);
  await page.click('#skill-19301');
  const wizardAfter=await snap(page);
  expect(wizardAfter.mp).toBeLessThan(wizardBefore.mp);
  expect(wizardAfter.character).toBe('109');
  checkpoints.wizardSkill=wizardAfter;
  await page.screenshot({path:'test-results/s7-08-wizard-skill.png',fullPage:true});

  await page.click('#battle-pause');
  await page.click('#return');
  checkpoints.final=await snap(page);
  await page.screenshot({path:'test-results/s7-09-final-field.png',fullPage:true});

  expect(errors).toEqual([]);
  writeFileSync('test-results/s7-manual-acceptance.json',JSON.stringify(checkpoints,null,2));
});
