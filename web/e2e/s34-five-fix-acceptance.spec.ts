import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';

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

async function startTrainingBattle(page:Page,id:number){
  await openMenu(page);
  await page.locator(`[data-training-battle-id="${id}"] [data-action="training-start"]`).click();
  await expect.poll(async()=>(await runtime(page)).m7Training.activeBattleId).toBe(id);
  await expect.poll(async()=>(await scene(page)).inBattleView).toBe(true);
}

async function startManyEnemyBattle(page:Page){
  await startTrainingBattle(page,15);
}

async function canvasPoint(page:Page,x:number,y:number){
  const state=await scene(page);
  const viewport=state.viewport;
  if(!viewport)throw new Error('Missing viewport snapshot');
  const box=await page.locator('canvas').boundingBox();
  if(!box)throw new Error('Missing canvas');
  const logicalX=(x-state.camera.x)*state.camera.zoom;
  const logicalY=(y-state.camera.y)*state.camera.zoom;
  return {x:box.x+logicalX*(box.width/viewport.viewport.width),y:box.y+logicalY*(box.height/viewport.viewport.height)};
}

async function canvasUiPoint(page:Page,x:number,y:number){
  const state=await scene(page);
  const viewport=state.viewport;
  if(!viewport)throw new Error('Missing viewport snapshot');
  const box=await page.locator('canvas').boundingBox();
  if(!box)throw new Error('Missing canvas');
  return {x:box.x+x*(box.width/viewport.viewport.width),y:box.y+y*(box.height/viewport.viewport.height)};
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

async function pointHitsCanvas(page:Page,point:{x:number;y:number}){
  return page.evaluate(({x,y})=>document.elementFromPoint(x,y) instanceof HTMLCanvasElement,point);
}

async function safeMovementProbe(page:Page,state:any,targetCell:readonly[number,number]){
  const candidates=[...(state.reachable??[])].sort((a:any,b:any)=>
    battleGridDistance(a,targetCell)-battleGridDistance(b,targetCell)
  );
  for(const cell of candidates){
    const x=(cell[0]+1)*32,y=(cell[1]+1)*16;
    if(live(state).some((enemy:any)=>Math.hypot(enemy.x-x,enemy.y-y)<=31))continue;
    const point=await canvasPoint(page,x,y);
    if(await pointHitsCanvas(page,point))return{cell,point};
  }
  return null;
}

async function ensureEnemyCanvasExposed(page:Page,enemyId:string,input:'mouse'|'touch'){
  let state:any=await extendedScene(page);
  let enemy=live(state).find((row:any)=>row.id===enemyId);
  if(!enemy)throw new Error('Missing live enemy for canvas exposure '+enemyId);
  let point=await canvasPoint(page,enemy.x,enemy.y);
  if(await pointHitsCanvas(page,point))return point;
  const marker=state.minimap?.enemies?.find((row:any)=>row.id===enemyId);
  if(!marker)throw new Error('Missing minimap marker for obscured enemy '+enemyId);
  const mapPoint=await canvasUiPoint(page,marker.x,marker.y);
  if(input==='touch')await page.touchscreen.tap(mapPoint.x,mapPoint.y);
  else await page.mouse.click(mapPoint.x,mapPoint.y);
  await expect.poll(async()=>{
    const current:any=await extendedScene(page);
    const row=live(current).find((candidate:any)=>candidate.id===enemyId);
    if(!row)return false;
    const candidate=await canvasPoint(page,row.x,row.y);
    return pointHitsCanvas(page,candidate);
  },{timeout:5000,intervals:[50,100,200]}).toBe(true);
  state=await extendedScene(page);
  enemy=live(state).find((row:any)=>row.id===enemyId);
  if(!enemy)throw new Error('Enemy disappeared while exposing canvas point');
  point=await canvasPoint(page,enemy.x,enemy.y);
  return point;
}

function battleGridDistance(a:readonly[number,number],b:readonly[number,number]){
  const dx=Math.abs(a[0]-b[0]),dy=Math.abs(a[1]-b[1]);
  return dx%2===dy%2?Math.max(dx,dy):Number.POSITIVE_INFINITY;
}

async function moveIntoBasicAttackRange(page:Page,targetId:string,input:'mouse'|'touch'){
  for(let attempt=0;attempt<10;attempt++){
    let state:any=await extendedScene(page);
    if(state.phase!=='active')throw new Error('Battle ended before direct-attack acceptance');
    await setPlayerVitals(page,state.maxHp,state.mp);
    state=await extendedScene(page);
    const target=live(state).find((row:any)=>row.id===targetId);
    if(!target)throw new Error('Target died before direct-attack acceptance');
    const distance=battleGridDistance(target.cell,state.battleCell);
    if(distance<=1){
      if(!state.actionReady)await advanceBattleTime(page,10000);
      await waitBattleInputReady(page);
      const readyState:any=await extendedScene(page);
      await setPlayerVitals(page,readyState.maxHp,readyState.mp);
      await waitBattleInputReady(page);
      return;
    }
    if(!state.actionReady)await advanceBattleTime(page,10000);
    state=await extendedScene(page);
    const currentTarget=live(state).find((row:any)=>row.id===targetId);
    if(!currentTarget)throw new Error('Target died while approaching direct-attack range');
    const probe=await safeMovementProbe(page,state,currentTarget.cell);
    if(!probe)throw new Error('No exposed empty reachable cell while approaching direct-attack target');
    const before=JSON.stringify(state.battleCell);
    if(input==='touch')await page.touchscreen.tap(probe.point.x,probe.point.y);
    else await page.mouse.click(probe.point.x,probe.point.y);
    await expect.poll(async()=>JSON.stringify((await scene(page)).battleCell),{timeout:10000}).not.toBe(before);
    await expect.poll(async()=>(await scene(page)).routeLength,{timeout:10000}).toBe(0);
    await waitBattleInputReady(page);
    const afterMove:any=await extendedScene(page);
    if(afterMove.phase!=='active')throw new Error('Battle ended during direct-attack approach');
    await setPlayerVitals(page,afterMove.maxHp,afterMove.mp);
    await waitBattleInputReady(page);
  }
  throw new Error('Could not reach direct-attack range');
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

async function waitBattleInputReady(page:Page){
  await expect.poll(async()=>{
    const state:any=await extendedScene(page);
    return state.phase==='active'&&state.actionReady&&!state.busy&&state.routeLength===0;
  },{timeout:10000,intervals:[50,100,200]}).toBe(true);
}

function live(state:any){return state.enemies.filter((row:any)=>row.hp>0);}
function poisoned(state:any){return live(state).filter((row:any)=>Boolean(row.m7Status?.wizard?.poison));}
function activeGroup(state:any):number|null{
  const activeMarker=state.minimap?.enemies?.find((row:any)=>row.active);
  if(!activeMarker)return null;
  return live(state).find((row:any)=>row.id===activeMarker.id)?.encounterGroup??null;
}

async function emptyPoisonCenter(state:any){
  const living=live(state);
  const group=activeGroup(state);
  const candidates=state.targeting?.castCells??[];
  for(const center of candidates){
    if(living.some((row:any)=>Math.hypot(row.x-center.x,row.y-center.y)<12))continue;
    const cx=Math.round(center.x/32)-1,cy=Math.round(center.y/16)-1;
    const nearby=living.filter((row:any)=>{
      if(row.encounterGroup!==group||!Array.isArray(row.cell))return false;
      const dx=Math.abs(row.cell[0]-cx),dy=Math.abs(row.cell[1]-cy);
      return ((dx-dy)&1)===0&&Math.max(dx,dy)<=3;
    });
    if(nearby.length>=2)return{x:center.x,y:center.y};
  }
  throw new Error('No empty in-range poison center containing multiple active-group enemies');
}

async function moveToDifferentEncounterGroup(page:Page,initialGroup:number){
  for(let attempt=0;attempt<8;attempt++){
    let state:any=await extendedScene(page);
    const current=activeGroup(state);
    if(current!==null&&current!==initialGroup)return;
    const later=live(state).find((row:any)=>row.encounterGroup!==initialGroup);
    if(!later)throw new Error('Missing later encounter group');
    await advanceBattleTime(page,10000);
    await waitBattleInputReady(page);
    state=await extendedScene(page);
    const probe=await safeMovementProbe(page,state,later.cell);
    if(!probe)throw new Error('No exposed empty reachable cell while approaching later encounter group');
    const before=JSON.stringify(state.battleCell);
    await page.mouse.click(probe.point.x,probe.point.y);
    await expect.poll(async()=>JSON.stringify((await scene(page)).battleCell),{timeout:10000}).not.toBe(before);
    await expect.poll(async()=>(await scene(page)).routeLength,{timeout:10000}).toBe(0);
    await waitBattleInputReady(page);
  }
  throw new Error('Could not activate a later encounter group within movement budget');
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

  test('desktop wizard flow covers input, encounter, poison, camera, minimap and confirmed exit',async({page})=>{
    await ready(page);
    await wizardPreset(page);
    await startManyEnemyBattle(page);
    await expectAllLivingVisible(page);
    let state:any=await extendedScene(page);
    expect(live(state).length).toBeGreaterThanOrEqual(20);
    expect(new Set(live(state).map((row:any)=>row.encounterGroup)).size).toBeGreaterThanOrEqual(4);
    await confirmRetreat(page);

    // Input/targeting/camera acceptance uses a lower-risk multi-group battle.
    // It still proves group switching and all-living visibility without letting
    // the Stage-7 boss roster kill the player while UI interactions are tested.
    await startTrainingBattle(page,6);
    await expectAllLivingVisible(page);
    state=await extendedScene(page);
    expect(live(state).length).toBe(7);
    const firstGroup=activeGroup(state);
    expect(typeof firstGroup).toBe('number');
    const firstEnemy=live(state).find((row:any)=>row.encounterGroup===firstGroup);
    expect(firstEnemy).toBeTruthy();

    await moveIntoBasicAttackRange(page,firstEnemy.id,'mouse');
    state=await extendedScene(page);
    const beforeClickAction=state.action;
    await clickEnemy(page,firstEnemy.id);
    await expect.poll(async()=>(await extendedScene(page)).action).toBeLessThan(beforeClickAction);
    expect((await extendedScene(page)).target).toBe(firstEnemy.id);
    await advanceBattleTime(page,10000);
    await moveIntoBasicAttackRange(page,firstEnemy.id,'mouse');
    await waitBattleInputReady(page);
    const beforeAAction=(await extendedScene(page)).action;
    await page.keyboard.press('A');
    await expect.poll(async()=>(await extendedScene(page)).action).toBeLessThan(beforeAAction);
    expect((await extendedScene(page)).target).toBe(firstEnemy.id);

    await moveToDifferentEncounterGroup(page,firstGroup as number);
    await expect.poll(async()=>activeGroup(await extendedScene(page))).not.toBe(firstGroup);
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

    const minimapBefore:any=await extendedScene(page);
    expect(minimapBefore.minimap?.visible).toBe(true);
    expect(minimapBefore.minimap?.enemies).toHaveLength(live(minimapBefore).length);
    expect(minimapBefore.minimap?.viewport.width??0).toBeGreaterThan(0);
    const playerBefore=(await scene(page)).battleCell;
    const cameraBeforeMap=(await scene(page)).camera;
    const inner=minimapBefore.minimap.layout.inner;
    // Pick the minimap edge opposite the current camera so the assertion
    // remains meaningful even if preceding edge-pan already reached a clamp.
    const minimapX=cameraBeforeMap.x>1?inner.x:inner.x+inner.width;
    const mapClick=await canvasUiPoint(page,minimapX,inner.y+inner.height*0.5);
    await page.mouse.click(mapClick.x,mapClick.y);
    await expect.poll(async()=>(await scene(page)).camera.x).not.toBe(cameraBeforeMap.x);
    expect((await scene(page)).battleCell).toEqual(playerBefore);

    await confirmRetreat(page);
  });
});

test.describe('S34 five-fix mobile pointer/touch acceptance',()=>{
  test.use({viewport:{width:412,height:915},hasTouch:true});

  test('touch move, direct attack, two-step poison targeting, minimap camera and confirmed exit share desktop authority',async({page})=>{
    await ready(page);
    await wizardPreset(page);
    await startManyEnemyBattle(page);
    await expectAllLivingVisible(page);
    let state:any=await extendedScene(page);
    expect(live(state).length).toBeGreaterThanOrEqual(20);
    await confirmRetreat(page);

    await startTrainingBattle(page,6);
    await expectAllLivingVisible(page);
    state=await extendedScene(page);
    const active=activeGroup(state);
    const enemy=live(state).find((row:any)=>row.encounterGroup===active);
    expect(enemy).toBeTruthy();
    await moveIntoBasicAttackRange(page,enemy.id,'touch');
    state=await extendedScene(page);
    const currentEnemy=live(state).find((row:any)=>row.id===enemy.id);
    if(!currentEnemy)throw new Error('Direct-attack target disappeared');
    await waitBattleInputReady(page);
    state=await extendedScene(page);
    const readyEnemy=live(state).find((row:any)=>row.id===enemy.id);
    if(!readyEnemy)throw new Error('Direct-attack target disappeared before touch');
    const beforeAction=state.action;
    const enemyPoint=await ensureEnemyCanvasExposed(page,readyEnemy.id,'touch');
    expect(await pointHitsCanvas(page,enemyPoint),'mobile direct-attack target must be on exposed battlefield canvas').toBe(true);
    await page.touchscreen.tap(enemyPoint.x,enemyPoint.y);
    await expect.poll(async()=>(await extendedScene(page)).action).toBeLessThan(beforeAction);
    expect((await extendedScene(page)).target).toBe(enemy.id);

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

    const minimapBefore:any=await extendedScene(page);
    expect(minimapBefore.minimap?.visible).toBe(true);
    expect(minimapBefore.minimap?.enemies).toHaveLength(live(minimapBefore).length);
    const playerBefore=(await scene(page)).battleCell;
    const cameraBefore=(await scene(page)).camera;
    const inner=minimapBefore.minimap.layout.inner;
    const mapTap=await canvasUiPoint(page,inner.x+inner.width*0.75,inner.y+inner.height*0.5);
    await page.touchscreen.tap(mapTap.x,mapTap.y);
    await expect.poll(async()=>(await scene(page)).camera.x).not.toBe(cameraBefore.x);
    expect((await scene(page)).battleCell).toEqual(playerBefore);

    await page.locator('[data-action="battle-exit-request"]:visible').tap();
    await expect(page.locator('[data-ui="battle-exit-confirm"]')).toBeVisible();
    await page.locator('[data-action="battle-exit-confirm"]:visible').tap();
    await expect.poll(async()=>(await scene(page)).inBattleView).toBe(false);
  });
});