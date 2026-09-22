import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';

const runtime=(page:Page)=>page.evaluate(()=>window.lapisM4!.snapshot());
const scene=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());

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
async function developerPreset(page:Page,profession:'swordsman'|'wizard',level:number,unlockAll=false){
  await openMenu(page);
  const toggle=page.locator('[data-action="dev-toggle"]');
  if(!(await toggle.isChecked()))await toggle.check();
  await page.locator('[data-dev-profession]').selectOption(profession);
  await page.locator('[data-dev-level-input]').fill(String(level));
  if(unlockAll)await page.locator('[data-dev-unlock-all]').check();
  else await page.locator('[data-dev-unlock-all]').uncheck();
  await page.locator('[data-action="dev-preset-apply"]').click();
  await expect.poll(async()=>(await runtime(page)).progression.level).toBe(level);
}
async function startTraining(page:Page,id:number){
  await openMenu(page);
  await page.locator(`[data-training-battle-id="${id}"] [data-action="training-start"]`).click();
  await expect.poll(async()=>(await runtime(page)).m7Training.activeBattleId).toBe(id);
  await expect.poll(async()=>(await scene(page)).inBattleView).toBe(true);
}
async function selectTarget(page:Page,id?:string){
  const state=await scene(page);
  const target=id?state.enemies.find(row=>row.id===id&&row.hp>0):state.enemies.find(row=>row.hp>0);
  if(!target)throw new Error('Missing live target '+String(id));
  const canvas=page.locator('canvas');
  const box=await canvas.boundingBox();
  if(!box)throw new Error('Missing canvas');
  await page.mouse.click(
    box.x+(target.x-state.camera.x)*state.camera.zoom,
    box.y+(target.y-state.camera.y)*state.camera.zoom,
  );
  await expect.poll(async()=>(await scene(page)).target).toBe(target.id);
  return target.id;
}
async function clickSkill(page:Page,label:string){
  const button=page.locator('[data-action="skill"]:visible').filter({hasText:label}).first();
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.click();
}
async function waitReady(page:Page){
  await expect.poll(async()=>{
    const state=await scene(page);
    return state.phase!=='active'||state.actionReady;
  },{timeout:15000,intervals:[80]}).toBe(true);
}
async function retreat(page:Page){
  const request=page.locator('[data-action="battle-exit-request"]:visible').first();
  await expect(request).toBeVisible();
  await request.click();
  await expect(page.locator('[data-ui="battle-exit-confirm"]')).toBeVisible();
  await page.locator('[data-action="battle-exit-confirm"]:visible').click();
  await expect.poll(async()=>(await scene(page)).inBattleView).toBe(false);
}

test('S34 training battles #1 and #15 launch concrete fixed S30 rosters',async({page})=>{
  await ready(page);
  await startTraining(page,1);
  let state=await scene(page);
  expect(state.enemies).toHaveLength(2);
  expect(state.enemies[0]?.id).toBe('m7-green-sword-trainee-l2');
  expect(state.enemies.map(row=>row.maxHp)).toEqual([90,90]);
  await retreat(page);

  await startTraining(page,15);
  state=await scene(page);
  expect(state.enemies).toHaveLength(20);
  expect(new Set(state.enemies.map(row=>row.id)).size).toBe(20);
  expect(state.enemies.map(row=>row.traits)).toEqual(expect.arrayContaining([
    expect.arrayContaining(['boss']),
    expect.arrayContaining(['elite']),
  ]));
  expect(state.enemies.filter(row=>row.visible)).toHaveLength(20);
  const groupSizes=[0,1,2,3].map(group=>state.enemies.filter(row=>row.encounterGroup===group).length);
  expect(groupSizes).toEqual([5,5,5,5]);
});

test('S34 battle deck keeps ordinary attack exposed and preserves skill scroll while combat HUD refreshes',async({page})=>{
  await ready(page);
  await developerPreset(page,'wizard',56,true);
  await startTraining(page,14);

  const attack=page.locator('[data-action="attack"]:visible').first();
  await expect(attack).toBeVisible();
  const hitTarget=await attack.evaluate(button=>{
    const box=button.getBoundingClientRect();
    const node=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2) as HTMLElement|null;
    return node?.closest<HTMLElement>('[data-action]')?.dataset.action??null;
  });
  expect(hitTarget).toBe('attack');
  await waitReady(page);
  await expect(attack).toBeEnabled();
  await attack.click();

  const skills=page.locator('.skill-deck:visible').first();
  await expect(skills).toBeVisible();
  const before=await skills.evaluate(node=>{
    node.scrollLeft=node.scrollWidth;
    return {left:node.scrollLeft,max:node.scrollWidth-node.clientWidth};
  });
  expect(before.max).toBeGreaterThan(40);
  expect(before.left).toBeGreaterThan(40);
  await page.waitForTimeout(1200);
  const after=await skills.evaluate(node=>node.scrollLeft);
  expect(after).toBeGreaterThanOrEqual(before.left-2);
});

test('S34 swordsman Lv36 Sacrifice is a real periodic non-lethal battle buff',async({page})=>{
  test.setTimeout(45000);
  await ready(page);
  await developerPreset(page,'swordsman',36,false);
  await startTraining(page,1);
  await waitReady(page);
  await clickSkill(page,'舍身');
  await expect.poll(async()=>(await scene(page)).m7Status.player.swordsman.some(row=>row.sourceSkillKey==='1501')).toBe(true);
  const afterCast=(await scene(page)).hp;
  await page.waitForTimeout(10_300);
  const afterTick=await scene(page);
  expect(afterTick.hp).toBeLessThan(afterCast);
  expect(afterTick.hp).toBeGreaterThanOrEqual(1);
  expect(afterTick.m7Status.player.swordsman.some(row=>row.sourceSkillKey==='1501')).toBe(true);
});

test('S34 wizard Lv6 Poison applies INT-scaled DOT that ticks without target action',async({page})=>{
  test.setTimeout(30000);
  await ready(page);
  await developerPreset(page,'wizard',6,false);
  await startTraining(page,3);
  const targetId=await selectTarget(page);
  const before=(await scene(page)).enemies.find(row=>row.id===targetId)!.hp;
  await clickSkill(page,'毒雾');
  await expect.poll(async()=>{
    const target=(await scene(page)).enemies.find(row=>row.id===targetId);
    return Boolean(target?.m7Status.wizard.poison);
  }).toBe(true);
  await page.waitForTimeout(5_300);
  const after=(await scene(page)).enemies.find(row=>row.id===targetId)!.hp;
  expect(after).toBeLessThan(before);
});

test('S34 wizard Lv26 Ashes blocks the S30 healer production self-heal',async({page})=>{
  await ready(page);
  await developerPreset(page,'wizard',26,false);
  await startTraining(page,8);
  const healerId=await selectTarget(page,'m7-green-armored-renewer-l26');
  await clickSkill(page,'灰烬');
  await expect.poll(async()=>{
    const healer=(await scene(page)).enemies.find(row=>row.id===healerId);
    return healer?.m7Status.wizard.healingBlockedMs??0;
  }).toBeGreaterThan(0);

  const beforeFixture=(await scene(page)).enemies.find(row=>row.id===healerId)!;
  const lowHp=Math.floor(beforeFixture.maxHp/2);
  await page.evaluate(({id,hp})=>window.lapisM4!.acceptanceSetEnemyHp!(id,hp),{id:healerId,hp:lowHp});
  const mpBefore=(await scene(page)).enemies.find(row=>row.id===healerId)!.mp;
  await page.evaluate(id=>window.lapisM4!.acceptancePrimeEnemyAction!(id),healerId);
  await expect.poll(async()=>(await scene(page)).enemies.find(row=>row.id===healerId)!.mp,{timeout:5000}).toBeLessThan(mpBefore);
  expect((await scene(page)).enemies.find(row=>row.id===healerId)!.hp).toBe(lowHp);
});

test('S34 wizard Lv36 petrify prevents action and ordinary attack targeting',async({page})=>{
  test.setTimeout(30000);
  await ready(page);
  await developerPreset(page,'wizard',36,true);
  await startTraining(page,10);
  const targetId=await selectTarget(page);
  await clickSkill(page,'诅咒之眼');
  await expect.poll(async()=>{
    const target=(await scene(page)).enemies.find(row=>row.id===targetId);
    return target?.m7Status.wizard.petrifiedMs??0;
  }).toBeGreaterThan(0);
  const before=(await scene(page)).enemies.find(row=>row.id===targetId)!.hp;
  await waitReady(page);
  const attack=page.locator('[data-action="attack"]:visible').first();
  await expect(attack).toBeEnabled();
  await page.evaluate(()=>document.querySelector<HTMLButtonElement>('[data-action="attack"]')?.click());
  await expect(page.locator('#m4-runtime-notice')).toContainText('石化');
  expect((await scene(page)).enemies.find(row=>row.id===targetId)!.hp).toBe(before);
});

test('S34 normal M7 SaveV2 restores stage, seven-stage skill state and HP/MP',async({page})=>{
  await ready(page);
  await page.evaluate(()=>window.lapisM4!.acceptanceGrantLevel!(16));
  for(const expected of [110,120]){
    await openMenu(page);
    const promote=page.locator('[data-action="m6-promote"]:visible').first();
    await expect(promote).toBeEnabled();
    await promote.click();
    await expect.poll(async()=>(await runtime(page)).m6.stageId).toBe(expected);
  }
  const beforeScene=await scene(page);
  const save=JSON.parse(await page.evaluate(()=>window.lapisM4!.exportJson()));
  expect(save.character).toBe('120');
  expect(save.progression.level).toBe(16);
  expect(save.m6.stage.stageId).toBe(120);
  expect(save.m7.family).toBe('swordsman');
  expect(save.m7.skills.swordsman.skillLevels['1101']).toBeGreaterThanOrEqual(1);
  expect(save.m7.skills.swordsman.skillLevels['1201']).toBeGreaterThanOrEqual(1);
  expect(save.m7.skills.swordsman.skillLevels['1301']).toBeGreaterThanOrEqual(1);
  expect(save.m7.vitals).toEqual({hp:beforeScene.hp,mp:beforeScene.mp});

  await page.evaluate(raw=>window.lapisM4!.restore(raw),save);
  expect((await runtime(page)).m6.stageId).toBe(120);
  const after=JSON.parse(await page.evaluate(()=>window.lapisM4!.exportJson()));
  expect(after.m7.skills).toEqual(save.m7.skills);
  expect(after.m7.vitals).toEqual(save.m7.vitals);
});

test.describe('S34 mobile seven-skill touch contract',()=>{
  test.use({viewport:{width:412,height:915},hasTouch:true});

  test('wizard Stage 7 exposes seven touch skills plus Recovery and confirmed exit',async({page})=>{
    await ready(page);
    await developerPreset(page,'wizard',56,true);
    await startTraining(page,14);

    const skills=page.locator('[data-action="skill"]:visible');
    await expect(skills).toHaveCount(7);
    await expect(skills.filter({hasText:'失明'})).toHaveCount(1);
    await expect(skills.filter({hasText:'诅咒之剑'})).toHaveCount(1);
    for(const action of ['recovery-hp','recovery-mp','battle-exit-request']){
      const button=page.locator(`[data-action="${action}"]:visible`).first();
      await expect(button).toBeVisible();
      const box=await button.boundingBox();
      expect(box?.height??0).toBeGreaterThanOrEqual(44);
    }
    const lastSkill=skills.nth(6);
    const box=await lastSkill.boundingBox();
    expect(box?.height??0).toBeGreaterThanOrEqual(44);
    await page.locator('[data-action="battle-exit-request"]:visible').tap();
    await expect(page.locator('[data-ui="battle-exit-confirm"]')).toBeVisible();
    await page.locator('[data-action="battle-exit-confirm"]:visible').tap();
    await expect.poll(async()=>(await scene(page)).inBattleView).toBe(false);
  });
});


test('S34 private-original pack uses distinct fixed-client story battle zones',async({page})=>{
  await ready(page);
  const r=await runtime(page);
  test.skip(!r.playableRecovery,'Private fixed-hash Web pack is required for original story battle scene validation.');

  await startTraining(page,1);
  const first=await scene(page);
  expect(first.battleZoneId).toBe(1);
  expect(first.mapId).toBe(1);
  await retreat(page);

  await startTraining(page,15);
  const last=await scene(page);
  expect(last.battleZoneId).toBe(91);
  expect(last.mapId).toBe(91);
  expect(last.mapName).not.toBe(first.mapName);
  expect(last.enemies).toHaveLength(20);
  expect(last.enemies.some(row=>row.traits.includes('boss'))).toBe(true);
  expect(last.enemies.some(row=>row.traits.includes('elite'))).toBe(true);
});
