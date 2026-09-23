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