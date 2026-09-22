import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';

const finalGate=process.env.S34_FIVE_FIX_FINAL==='1';
const runtime=(page:Page)=>page.evaluate(()=>window.lapisM4!.snapshot());
const scene=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());
const extendedScene=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot() as any);

async function ready(page:Page){
  await page.goto('/?m4=1');
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
  await page.waitForFunction(()=>document.body.classList.contains('m4-active'));
}

async function openMenu(page:Page){
  if(await page.locator('[data-ui="game-menu"]').isVisible().catch(()=>false))return;
  const button=page.locator('[data-action="menu"]:visible,[data-action="battle-menu"]:visible').first();
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('[data-ui="game-menu"]')).toBeVisible();
}

async function wizardPreset(page:Page){
  await openMenu(page);
  const toggle=page.locator('[data-action="dev-toggle"]');
  if(!(await toggle.isChecked()))await toggle.check();
  await page.locator('[data-dev-profession]').selectOption('wizard');
  await page.locator('[data-dev-level-input]').fill('56');
  await page.locator('[data-dev-unlock-all]').check();
  await page.locator('[data-action="dev-preset-apply"]').click();
  await expect.poll(async()=>(await runtime(page)).progression.level).toBe(56);
}

async function startManyEnemyBattle(page:Page){
  await openMenu(page);
  await page.locator('[data-training-battle-id="15"] [data-action="training-start"]').click();
  await expect.poll(async()=>(await runtime(page)).m7Training.activeBattleId).toBe(15);
  await expect.poll(async()=>(await scene(page)).inBattleView).toBe(true);
}

async function canvasPoint(page:Page,x:number,y:number){
  const state=await scene(page);
  const box=await page.locator('canvas').boundingBox();
  if(!box)throw new Error('Missing canvas');
  return {x:box.x+(x-state.camera.x)*state.camera.zoom,y:box.y+(y-state.camera.y)*state.camera.zoom};
}

async function clickEnemy(page:Page,id:string){
  const state=await scene(page);
  const enemy=state.enemies.find(row=>row.id===id&&row.hp>0);
  if(!enemy)throw new Error('Missing live enemy '+id);
  const point=await canvasPoint(page,enemy.x,enemy.y);
  await page.mouse.click(point.x,point.y);
}

async function clickWorld(page:Page,x:number,y:number){
  const point=await canvasPoint(page,x,y);
  await page.mouse.click(point.x,point.y);
}

async function hoverWorld(page:Page,x:number,y:number){
  const point=await canvasPoint(page,x,y);
  await page.mouse.move(point.x,point.y);
}

async function advanceBattleTime(page:Page,deltaMs:number){
  const ok=await page.evaluate(delta=>{
    const api=window.lapisM4 as any;
    if(typeof api?.acceptanceAdvanceBattleTimeMs!=='function')return false;
    api.acceptanceAdvanceBattleTimeMs(delta);
    return true;
  },deltaMs);
  expect(ok,'final S34 integration must expose deterministic acceptanceAdvanceBattleTimeMs; fixed sleeps are forbidden').toBe(true);
}

async function setPlayerVitals(page:Page,hp:number,mp:number){
  const ok=await page.evaluate(({hp,mp})=>{
    const api=window.lapisM4 as any;
    if(typeof api?.acceptanceSetPlayerVitals!=='function')return false;
    api.acceptanceSetPlayerVitals(hp,mp);
    return true;
  },{hp,mp});
  expect(ok,'final S34 integration must expose deterministic acceptanceSetPlayerVitals for recovery acceptance').toBe(true);
}

function live(state:any){return state.enemies.filter((row:any)=>row.hp>0);}
function poisoned(state:any){return live(state).filter((row:any)=>Boolean(row.m7Status?.wizard?.poison));}

async function emptyPoisonCenter(state:any){
  const living=live(state);
  for(const enemy of living){
    for(const dx of [-64,0,64])for(const dy of [-32,0,32]){
      const x=enemy.x+dx,y=enemy.y+dy;
      if(living.some((row:any)=>Math.hypot(row.x-x,row.y-y)<12))continue;
      const nearby=living.filter((row:any)=>Math.hypot(row.x-x,row.y-y)<=150);
      if(nearby.length>=2)return{x,y};
    }
  }
  throw new Error('No empty poison center containing multiple enemies in acceptance roster');
}

async function expectAllLivingVisible(page:Page){
  await expect.poll(async()=>{
    const state=await scene(page);const rows=state.enemies.filter(row=>row.hp>0);
    return rows.length>0&&rows.every(row=>row.visible);
  }).toBe(true);
}

async function confirmRetreat(page:Page){
  await page.locator('[data-action="battle-exit-request"]:visible').click();
  await expect(page.locator('[data-ui="battle-exit-confirm"]')).toBeVisible();
  await page.locator('[data-action="battle-exit-confirm"]:visible').click();
  await expect.poll(async()=>(await scene(page)).inBattleView).toBe(false);
}

test.describe('S34 five-fix final acceptance',()=>{
  test.skip(!finalGate,'Enable only after Workers 1-4 are merged into the S34 integration branch; a skipped run is not acceptance evidence.');

  test('desktop wizard flow covers input, encounter, poison, camera, minimap and confirmed exit',async({page})=>{
    await ready(page);
    await wizardPreset(page);
    await startManyEnemyBattle(page);
    await expectAllLivingVisible(page);

    let state:any=await extendedScene(page);
    expect(live(state).length).toBeGreaterThanOrEqual(20);
    const firstGroup=state.activeEncounterGroup;
    expect(typeof firstGroup).toBe('number');
    const firstEnemy=live(state).find((row:any)=>row.encounterGroup===firstGroup);
    expect(firstEnemy).toBeTruthy();

    const beforeClick=firstEnemy.hp;
    await clickEnemy(page,firstEnemy.id);
    await expect.poll(async()=>live(await extendedScene(page)).find((row:any)=>row.id===firstEnemy.id)?.hp??beforeClick).toBeLessThan(beforeClick);
    await advanceBattleTime(page,10000);
    const beforeA=live(await extendedScene(page)).find((row:any)=>row.id===firstEnemy.id)?.hp??0;
    await page.keyboard.press('A');
    await expect.poll(async()=>live(await extendedScene(page)).find((row:any)=>row.id===firstEnemy.id)?.hp??beforeA).toBeLessThan(beforeA);

    state=await extendedScene(page);
    const later=live(state).find((row:any)=>row.encounterGroup!==firstGroup);
    expect(later).toBeTruthy();
    await clickWorld(page,later.x-48,later.y+24);
    await expect.poll(async()=>(await extendedScene(page)).activeEncounterGroup).not.toBe(firstGroup);
    await expectAllLivingVisible(page);

    await advanceBattleTime(page,10000);
    const resourcesBeforeCancel=await extendedScene(page);
    await page.keyboard.press('W');
    await expect.poll(async()=>Boolean((await extendedScene(page)).targeting?.active)).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(async()=>Boolean((await extendedScene(page)).targeting?.active)).toBe(false);
    const resourcesAfterCancel=await extendedScene(page);
    expect(resourcesAfterCancel.mp).toBe(resourcesBeforeCancel.mp);
    expect(resourcesAfterCancel.action).toBe(resourcesBeforeCancel.action);
    expect(resourcesAfterCancel.inBattleView).toBe(true);

    await page.keyboard.press('Space');
    await expect.poll(async()=>Boolean((await extendedScene(page)).targeting?.rangeOverlayVisible)).toBe(true);
    await page.keyboard.press('2');
    const targetState=await extendedScene(page);
    const center=await emptyPoisonCenter(targetState);
    await hoverWorld(page,center.x,center.y);
    await expect.poll(async()=>{
      const current=await extendedScene(page);
      return current.targeting?.previewCenter?.x===center.x&&current.targeting?.previewCenter?.y===center.y&&current.targeting.previewCells.length>=5;
    }).toBe(true);
    await clickWorld(page,center.x,center.y);
    await expect.poll(async()=>poisoned(await extendedScene(page)).length).toBeGreaterThanOrEqual(2);
    const poisonedBefore=poisoned(await extendedScene(page)).map((row:any)=>({id:row.id,hp:row.hp}));
    await advanceBattleTime(page,5000);
    const afterTick=await extendedScene(page);
    expect(poisonedBefore.some((row:any)=>{
      const now=live(afterTick).find((enemy:any)=>enemy.id===row.id);return now&&now.hp<row.hp;
    })).toBe(true);

    await setPlayerVitals(page,Math.max(1,(afterTick.maxHp??500)-250),Math.max(0,(afterTick.maxMp??500)-250));
    const beforeHp=await extendedScene(page);
    await page.keyboard.press('S');
    await expect.poll(async()=>(await extendedScene(page)).hp).toBeGreaterThan(beforeHp.hp);
    await advanceBattleTime(page,10000);
    const beforeMp=await extendedScene(page);
    await page.keyboard.press('D');
    await expect.poll(async()=>(await extendedScene(page)).mp).toBeGreaterThan(beforeMp.mp);
    await advanceBattleTime(page,10000);
    const beforeRest=(await extendedScene(page)).action;
    await page.keyboard.press('F');
    await expect.poll(async()=>(await extendedScene(page)).action).toBeLessThan(beforeRest);

    const cameraBeforeEdge=(await scene(page)).camera;
    const canvas=page.locator('canvas');const box=await canvas.boundingBox();if(!box)throw new Error('Missing canvas');
    await page.mouse.move(box.x+box.width-2,box.y+box.height/2);
    await expect.poll(async()=>(await scene(page)).camera.x).not.toBe(cameraBeforeEdge.x);

    const map=page.locator('[data-ui="battle-minimap"]');
    await expect(map).toBeVisible();
    const mapBox=await map.boundingBox();if(!mapBox)throw new Error('Missing minimap');
    const playerBefore=(await scene(page)).battleCell;
    const cameraBeforeMap=(await scene(page)).camera;
    await page.mouse.click(mapBox.x+mapBox.width*0.8,mapBox.y+mapBox.height*0.5);
    await expect.poll(async()=>(await scene(page)).camera.x).not.toBe(cameraBeforeMap.x);
    expect((await scene(page)).battleCell).toEqual(playerBefore);

    await confirmRetreat(page);
  });
});

test.describe('S34 five-fix mobile pointer/touch acceptance',()=>{
  test.use({viewport:{width:412,height:915},hasTouch:true});
  test.skip(!finalGate,'Enable only after Workers 1-4 are merged into the S34 integration branch; a skipped run is not acceptance evidence.');

  test('touch move, direct attack, two-step poison targeting, minimap camera and confirmed exit share desktop authority',async({page})=>{
    await ready(page);
    await wizardPreset(page);
    await startManyEnemyBattle(page);
    await expectAllLivingVisible(page);

    let state:any=await extendedScene(page);
    const active=state.activeEncounterGroup;
    const enemy=live(state).find((row:any)=>row.encounterGroup===active);
    expect(enemy).toBeTruthy();
    const before=enemy.hp;
    const enemyPoint=await canvasPoint(page,enemy.x,enemy.y);
    await page.touchscreen.tap(enemyPoint.x,enemyPoint.y);
    await expect.poll(async()=>live(await extendedScene(page)).find((row:any)=>row.id===enemy.id)?.hp??before).toBeLessThan(before);

    await advanceBattleTime(page,10000);
    const poisonButton=page.locator('[data-action="skill"]:visible').filter({hasText:'毒雾'}).first();
    await poisonButton.tap();
    state=await extendedScene(page);
    const center=await emptyPoisonCenter(state);
    const centerPoint=await canvasPoint(page,center.x,center.y);
    const beforePreview=await extendedScene(page);
    await page.touchscreen.tap(centerPoint.x,centerPoint.y);
    await expect.poll(async()=>Boolean((await extendedScene(page)).targeting?.previewCells?.length)).toBe(true);
    const afterPreview=await extendedScene(page);
    expect(afterPreview.mp).toBe(beforePreview.mp);
    await page.touchscreen.tap(centerPoint.x,centerPoint.y);
    await expect.poll(async()=>poisoned(await extendedScene(page)).length).toBeGreaterThanOrEqual(2);

    const map=page.locator('[data-ui="battle-minimap"]');
    await expect(map).toBeVisible();
    const mapBox=await map.boundingBox();if(!mapBox)throw new Error('Missing minimap');
    const playerBefore=(await scene(page)).battleCell;
    const cameraBefore=(await scene(page)).camera;
    await page.touchscreen.tap(mapBox.x+mapBox.width*0.75,mapBox.y+mapBox.height*0.5);
    await expect.poll(async()=>(await scene(page)).camera.x).not.toBe(cameraBefore.x);
    expect((await scene(page)).battleCell).toEqual(playerBefore);

    await page.locator('[data-action="battle-exit-request"]:visible').tap();
    await expect(page.locator('[data-ui="battle-exit-confirm"]')).toBeVisible();
    await page.locator('[data-action="battle-exit-confirm"]:visible').tap();
    await expect.poll(async()=>(await scene(page)).inBattleView).toBe(false);
  });
});
