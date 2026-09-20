import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';

const runtime=(page:Page)=>page.evaluate(()=>window.lapisM4!.snapshot());

async function ready(page:Page){
  await page.goto('/?m4=1');
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
  await page.waitForFunction(()=>document.body.classList.contains('m4-active'));
}

async function clickAction(page:Page,action:string){
  const button=page.locator(`[data-action="${action}"]:visible`).first();
  await expect(button).toBeVisible();
  await button.click();
}

async function promoteAt(page:Page,level:number,expectedStage:number){
  await page.evaluate(target=>window.lapisM4!.acceptanceGrantLevel!(target),level);
  await clickAction(page,'menu');
  const promote=page.locator('[data-action="m6-promote"]:visible').first();
  await expect(promote).toBeEnabled();
  await promote.click();
  await expect.poll(async()=>(await runtime(page)).m6.stageId).toBe(expectedStage);
}

test('M6 player runtime promotes swordsman 100 through 190 via production reward and promotion authorities',async({page})=>{
  await ready(page);
  expect((await runtime(page)).m6.stageId).toBe(100);
  const stages=[110,120,130,140,150,160,170,180,190];
  for(let index=0;index<stages.length;index+=1)await promoteAt(page,(index+1)*10,stages[index]!);
  const state=await runtime(page);
  expect(state.m6.stageId).toBe(190);
  expect(state.m6.promotionReceipts).toHaveLength(9);
  expect(state.m6.nextStageId).toBeNull();

  const save=JSON.parse(await page.evaluate(()=>window.lapisM4!.exportJson()));
  expect(save.character).toBe('190');
  expect(save.m6.stage.stageId).toBe(190);
  expect(save.m6.stage.promotionReceipts).toHaveLength(9);
  await page.evaluate(raw=>window.lapisM4!.restore(raw),save);
  await expect.poll(async()=>(await runtime(page)).m6.stageId).toBe(190);
});

test('M6 new wizard profile is isolated from swordsman progress and promotes 109 through 199',async({page})=>{
  await ready(page);
  await page.evaluate(target=>window.lapisM4!.acceptanceGrantLevel!(target),10);
  await clickAction(page,'menu');
  await page.locator('[data-action="m6-promote"]:visible').first().click();
  await expect.poll(async()=>(await runtime(page)).m6.stageId).toBe(110);

  await clickAction(page,'menu');
  await page.locator('[data-action="class-wizard"]:visible').first().click();
  let state=await runtime(page);
  expect(state.m6.stageId).toBe(109);
  expect(state.progression.level).toBe(1);
  expect(state.m6.promotionReceipts).toEqual([]);

  const stages=[119,129,139,149,159,169,179,189,199];
  for(let index=0;index<stages.length;index+=1)await promoteAt(page,(index+1)*10,stages[index]!);
  state=await runtime(page);
  expect(state.m6.stageId).toBe(199);
  expect(state.m6.promotionReceipts).toHaveLength(9);
  expect(state.m6.nextStageId).toBeNull();

  const save=JSON.parse(await page.evaluate(()=>window.lapisM4!.exportJson()));
  expect(save.character).toBe('199');
  expect(save.m6.family).toBe('wizard');
  expect(save.m6.stage.stageId).toBe(199);
  expect(save.m6.stage.promotionReceipts).toHaveLength(9);
});

test('M6 promotion preserves the accepted player skill contract and SaveV2 stage state',async({page})=>{
  await ready(page);
  await page.evaluate(target=>window.lapisM4!.acceptanceGrantLevel!(target),20);
  await clickAction(page,'menu');
  await page.locator('[data-action="m6-promote"]:visible').first().click();
  await expect.poll(async()=>(await runtime(page)).m6.stageId).toBe(110);
  await clickAction(page,'menu');
  await page.locator('[data-action="m6-promote"]:visible').first().click();
  await expect.poll(async()=>(await runtime(page)).m6.stageId).toBe(120);

  await page.evaluate(()=>window.lapisDiagnostics!.snapshot());
  const save=JSON.parse(await page.evaluate(()=>window.lapisM4!.exportJson()));
  expect(save.character).toBe('120');
  expect(save.m6.stage.stageId).toBe(120);
});
