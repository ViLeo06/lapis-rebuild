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
async function legacyPause(page:Page){
  await page.evaluate(()=>document.querySelector<HTMLButtonElement>('#battle-pause')?.click());
}

async function selectTarget(page:Page,id?:string){
  const state=await scene(page);
  const target=id?state.enemies.find(row=>row.id===id&&row.hp>0):state.enemies.find(row=>row.hp>0);
  if(!target)throw new Error('Missing live target '+String(id));
  const selected=await page.evaluate(targetId=>{
    const api=window.lapisM4 as any;
    if(typeof api?.acceptanceSelectEnemy!=='function')return false;
    api.acceptanceSelectEnemy(targetId);
    return true;
  },target.id);
  expect(selected,'S34 skill regression tests require webdriver-only acceptanceSelectEnemy').toBe(true);
  await expect.poll(async()=>(await scene(page)).target).toBe(target.id);
  return target.id;
}
async function clickBattleCell(page:Page,cell:readonly[number,number]){
  const state=await scene(page);
  const canvas=page.locator('canvas');
  const box=await canvas.boundingBox();
  if(!box)throw new Error('Missing canvas');
  const worldX=(cell[0]+1)*32,worldY=(cell[1]+1)*16;
  await page.mouse.click(
    box.x+(worldX-state.camera.x)*state.camera.zoom,
    box.y+(worldY-state.camera.y)*state.camera.zoom,
  );
}
async function moveIntoOrdinaryAttackRange(page:Page,targetId:string){
  for(let attempt=0;attempt<10;attempt++){
    await waitReady(page);
    const state=await scene(page);
    const target=state.enemies.find(row=>row.id===targetId&&row.hp>0);
    if(!target)throw new Error('Target died before ordinary-attack hotkey acceptance');
    const distance=Math.max(Math.abs(target.cell[0]-state.battleCell[0]),Math.abs(target.cell[1]-state.battleCell[1]));
    if(distance<=1)return;
    const options=[...state.reachable].sort((a,b)=>
      Math.max(Math.abs(a[0]-target.cell[0]),Math.abs(a[1]-target.cell[1]))-
      Math.max(Math.abs(b[0]-target.cell[0]),Math.abs(b[1]-target.cell[1]))
    );
    if(!options.length)throw new Error('No reachable cell for ordinary-attack hotkey acceptance');
    const before=JSON.stringify(state.battleCell);
    await clickBattleCell(page,options[0]);
    await expect.poll(async()=>JSON.stringify((await scene(page)).battleCell),{timeout:10000}).not.toBe(before);
  }
  throw new Error('Could not reach ordinary-attack range');
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
  const groupSizes=[0,1,2,3].map(group=>state.enemies.filter(row=>row.encounterGroup===group).length);
  expect(groupSizes).toEqual([5,5,5,5]);
  expect(new Set(state.enemies.map(row=>`${row.x},${row.y}`)).size).toBe(20);
});

test('S34 battle deck keeps ordinary attack exposed and preserves skill scroll while combat HUD refreshes',async({page})=>{
  await page.setViewportSize({width:800,height:720});
  await ready(page);
  await developerPreset(page,'wizard',56,true);
  // Keep this HUD-only regression on the lowest-risk arena so enemy DPS cannot
  // terminate the battle while we inspect DOM scroll persistence.
  await startTraining(page,1);

  const attack=page.locator('[data-action="attack"]:visible').first();
  await expect(attack).toBeVisible();
  const hitTarget=await attack.evaluate(button=>{
    const box=button.getBoundingClientRect();
    const node=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2) as HTMLElement|null;
    return node?.closest<HTMLElement>('[data-action]')?.dataset.action??null;
  });
  expect(hitTarget).toBe('attack');
  await legacyPause(page);
  const skills=page.locator('.skill-deck:visible').first();
  await expect(skills).toBeVisible();
  const before=await skills.evaluate(node=>{
    node.scrollLeft=node.scrollWidth;
    return {left:node.scrollLeft,max:node.scrollWidth-node.clientWidth};
  });
  expect(before.max).toBeGreaterThan(40);
  expect(before.left).toBeGreaterThan(40);

  await legacyPause(page);
  await waitReady(page);
  await expect(attack).toBeEnabled();
  await attack.click();
  await legacyPause(page);
  await page.waitForTimeout(1200);
  const after=await skills.evaluate(node=>node.scrollLeft);
  expect(after).toBeGreaterThanOrEqual(before.left-2);
});

test('S34A A hotkey uses ordinary-attack authority without legacy WASD double trigger',async({page})=>{
  await ready(page);
  // Uppercase A avoids the intentional field WASD movement path while proving
  // the battle-only attack binding is inert outside battle.
  await page.keyboard.press('A');
  expect((await scene(page)).inBattleView).toBe(false);

  await startTraining(page,1);
  const targetId=await selectTarget(page);
  await moveIntoOrdinaryAttackRange(page,targetId);
  await waitReady(page);
  const before=await scene(page);
  const beforeCell=JSON.stringify(before.battleCell);
  expect(before.actionReady).toBe(true);

  await page.keyboard.press('a');
  await expect.poll(async()=>(await scene(page)).action,{timeout:5000}).toBeLessThan(before.action);
  const after=await scene(page);
  expect(JSON.stringify(after.battleCell)).toBe(beforeCell);
  expect(after.target).toBe(targetId);
});

test('S34A recovery/rest, QWER + 1-6, Space and Esc share battle authorities',async({page})=>{
  test.setTimeout(90_000);
  await ready(page);
  await developerPreset(page,'wizard',56,true);
  // Hotkey authority is independent of encounter difficulty; use battle #1 so
  // the player remains alive through readiness waits and Esc-confirm checks.
  await startTraining(page,1);

  const skillHotkeys=await page.locator('[data-action="skill"]:visible small').allTextContents();
  expect(skillHotkeys.slice(0,6)).toEqual(expect.arrayContaining([
    expect.stringContaining('Q / 1'),expect.stringContaining('W / 2'),
    expect.stringContaining('E / 3'),expect.stringContaining('R / 4'),
    expect.stringContaining('5'),expect.stringContaining('6'),
  ]));
  expect(skillHotkeys[6]??'').not.toContain('7 ·');

  await waitReady(page);
  await page.keyboard.press('s');
  await expect(page.locator('#m4-runtime-notice')).toContainText('HP');
  await waitReady(page);
  await page.keyboard.press('d');
  await expect(page.locator('#m4-runtime-notice')).toContainText('MP');

  await waitReady(page);
  const beforeRest=await scene(page);
  await page.keyboard.press('f');
  await expect(page.locator('#m4-runtime-notice')).toContainText('休息');
  await expect.poll(async()=>(await scene(page)).action).toBeLessThan(beforeRest.action);

  await page.evaluate(()=>{
    const target=window as Window&{__s34RangeEvents?:boolean[]};
    target.__s34RangeEvents=[];
    window.addEventListener('lapis-battle-range-overlay',event=>{
      target.__s34RangeEvents!.push(Boolean((event as CustomEvent<{visible:boolean}>).detail.visible));
    });
  });
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  expect(await page.evaluate(()=>(window as Window&{__s34RangeEvents?:boolean[]}).__s34RangeEvents)).toEqual([true,false]);

  // The HUD is intentionally regenerated as readiness changes; dispatch the
  // request on the current DOM node so actionability retries do not race that refresh.
  await page.evaluate(()=>document.querySelector<HTMLButtonElement>('[data-action="battle-exit-request"]')?.click());
  await expect(page.locator('[data-ui="battle-exit-confirm"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-ui="battle-exit-confirm"]')).toHaveCount(0);
  expect((await scene(page)).inBattleView).toBe(true);

  // E and numeric slot 3 are the same Nature Force command authority.
  await waitReady(page);
  await page.evaluate(()=>window.lapisM4!.acceptanceSetPlayerMp!(9999));
  const beforeQwer=await scene(page);
  await page.keyboard.press('e');
  await expect.poll(async()=>(await scene(page)).mp).toBeLessThan(beforeQwer.mp);
  const afterQwer=await scene(page);
  expect(afterQwer.action).toBeLessThan(beforeQwer.action);

  const blockedMp=afterQwer.mp;
  await page.keyboard.press('e');
  await page.waitForTimeout(100);
  expect((await scene(page)).mp).toBe(blockedMp);

  await waitReady(page);
  await page.evaluate(()=>window.lapisM4!.acceptanceSetPlayerMp!(9999));
  const beforeNumeric=await scene(page);
  await page.keyboard.press('3');
  await expect.poll(async()=>(await scene(page)).mp).toBeLessThan(beforeNumeric.mp);

  await waitReady(page);
  await page.evaluate(()=>window.lapisM4!.acceptanceSetPlayerMp!(0));
  const beforeNoMp=await scene(page);
  await page.keyboard.press('e');
  await page.waitForTimeout(100);
  const afterNoMp=await scene(page);
  expect(afterNoMp.mp).toBe(0);
  expect(afterNoMp.action).toBe(beforeNoMp.action);
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
  await clickSkill(page,'毒雾');
  await expect.poll(async()=>Boolean((await scene(page)).targeting?.active)).toBe(true);
  const aiming=await scene(page);
  const target=aiming.enemies.find(row=>row.hp>0&&aiming.targeting.castCells.some((cell:any)=>
    cell.x===(row.cell[0]+1)*32&&cell.y===(row.cell[1]+1)*16
  ));
  if(!target)throw new Error('Missing live poison target inside explicit cast cells');
  const before=target.hp;
  await clickBattleCell(page,target.cell);
  await expect.poll(async()=>{
    const current=(await scene(page)).enemies.find(row=>row.id===target.id);
    return Boolean(current?.m7Status.wizard.poison);
  }).toBe(true);
  const targetId=target.id;
  await page.waitForTimeout(5_300);
  const after=(await scene(page)).enemies.find(row=>row.id===targetId)!.hp;
  expect(after).toBeLessThan(before);
});

test('S34 wizard Lv26 Ashes blocks the S30 healer production self-heal',async({page})=>{
  await ready(page);
  await developerPreset(page,'wizard',26,false);
  await startTraining(page,8);
  const initial:any=await scene(page);
  const activeIds=new Set((initial.minimap?.enemies??[]).filter((row:any)=>row.active).map((row:any)=>row.id));
  const healer=initial.enemies.find((row:any)=>row.hp>0&&row.traits?.includes('healer')&&activeIds.has(row.id));
  if(!healer)throw new Error('Missing active-group healer for Ashes acceptance');
  const healerId=await selectTarget(page,healer.id);
  await clickSkill(page,'灰烬');
  await expect.poll(async()=>{
    const healer=(await scene(page)).enemies.find(row=>row.id===healerId);
    return healer?.m7Status.wizard.healingBlockedMs??0;
  }).toBeGreaterThan(0);

  const beforeFixture=(await scene(page)).enemies.find(row=>row.id===healerId)!;
  const lowHp=Math.floor(beforeFixture.maxHp/2);
  await page.evaluate(({id,hp})=>window.lapisM4!.acceptanceSetEnemyHp!(id,hp),{id:healerId,hp:lowHp});
  const mpBefore=(await scene(page)).enemies.find(row=>row.id===healerId)!.mp;
  const ranAbility=await page.evaluate(id=>{
    const api=window.lapisM4 as any;
    if(typeof api?.acceptanceRunEnemyAbility!=='function')return false;
    api.acceptanceRunEnemyAbility(id,'self-heal');
    return true;
  },healerId);
  expect(ranAbility,'Ashes acceptance requires deterministic production-AI self-heal trigger').toBe(true);
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
    await legacyPause(page);

    const skills=page.locator('[data-action="skill"]:visible');
    await expect(skills).toHaveCount(7);
    await expect(skills.filter({hasText:'失明'})).toHaveCount(1);
    await expect(skills.filter({hasText:'诅咒之剑'})).toHaveCount(1);
    for(const action of ['recovery-hp','recovery-mp','battle-exit-request']){
      const button=page.locator(`[data-action="${action}"]:visible`).first();
      await expect(button).toBeVisible();
      await expect.poll(async()=>(await button.boundingBox())?.height??0,{timeout:5000}).toBeGreaterThanOrEqual(44);
    }
    const lastSkill=skills.nth(6);
    await expect.poll(async()=>(await lastSkill.boundingBox())?.height??0,{timeout:5000}).toBeGreaterThanOrEqual(44);
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
  expect(last.enemies.filter(row=>row.visible)).toHaveLength(20);
  expect(last.enemies.some(row=>row.traits.includes('boss'))).toBe(true);
  expect(last.enemies.some(row=>row.traits.includes('elite'))).toBe(true);
});