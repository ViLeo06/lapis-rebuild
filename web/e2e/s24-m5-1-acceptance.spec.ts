import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const scene=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());
const runtime=(page:Page)=>page.evaluate(()=>window.lapisM4!.snapshot());

async function ready(page:Page,url='/?m4=1'){
  await page.goto(url);
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
  await page.waitForFunction(()=>document.body.classList.contains('m4-active'));
}

async function assertDiagnosticsOff(page:Page){
  await expect(page.locator('[data-ui="debug-panel"]')).toHaveCount(0);
  expect(await page.evaluate(()=>document.body.classList.contains('m4-dev-enabled'))).toBe(false);
}

async function clickAction(page:Page,action:string){
  const button=page.locator(`[data-action="${action}"]`).first();
  await expect(button).toBeVisible();
  const point=await page.evaluate(value=>{
    const nodes=[...document.querySelectorAll<HTMLElement>(`[data-action="${value}"]`)];
    const node=nodes.find(candidate=>{
      const rect=candidate.getBoundingClientRect(),style=getComputedStyle(candidate);
      return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden';
    });
    if(!node)throw new Error(`Missing visible action ${value}`);
    const rect=node.getBoundingClientRect();
    return{x:rect.left+rect.width/2,y:rect.top+rect.height/2};
  },action);
  await page.mouse.click(point.x,point.y);
}

async function clickWorldCell(page:Page,cell:readonly[number,number]){
  const canvas=page.locator('canvas');
  const box=await canvas.boundingBox();
  if(!box)throw new Error('Missing canvas');
  const state=await scene(page);
  const worldX=(cell[0]+1)*32,worldY=(cell[1]+1)*16;
  await page.mouse.click(
    box.x+(worldX-state.camera.x)*state.camera.zoom,
    box.y+(worldY-state.camera.y)*state.camera.zoom,
  );
}

async function guidePointerPoint(page:Page){
  const state=await scene(page);
  const canvas=page.locator('canvas');
  const box=await canvas.boundingBox();
  if(!box)throw new Error('Missing canvas');

  // Prefer S22's live rendered hitbox when available. The fallback exists only
  // so the preflight can run on the plan baseline before S22 is integrated.
  const pointerTarget=state.worldPointerTargets?.find(row=>row.id==='training-guide'&&row.visible);
  let worldX:number,worldY:number;
  if(pointerTarget){
    worldX=(pointerTarget.bounds.left+pointerTarget.bounds.right)/2;
    worldY=(pointerTarget.bounds.top+pointerTarget.bounds.bottom)/2;
  }else{
    const guide=state.worldVisuals.find(row=>row.id==='training-guide'&&row.visible);
    if(!guide)throw new Error('Visible training guide visual is missing');
    worldX=(guide.cell[0]+1)*32;
    worldY=(guide.cell[1]+1)*16-24;
  }
  return {
    x:box.x+(worldX-state.camera.x)*state.camera.zoom,
    y:box.y+(worldY-state.camera.y)*state.camera.zoom,
  };
}

async function hoverGuide(page:Page){
  const point=await guidePointerPoint(page);
  await page.mouse.move(point.x,point.y);
  return page.locator('canvas').evaluate(node=>getComputedStyle(node).cursor);
}

async function clickGuide(page:Page){
  const before=await scene(page);
  const point=await guidePointerPoint(page);
  await page.mouse.click(point.x,point.y);
  return {before,after:await scene(page)};
}

async function tapGuide(page:Page){
  const before=await scene(page);
  const point=await guidePointerPoint(page);
  await page.touchscreen.tap(point.x,point.y);
  return {before,after:await scene(page)};
}

async function tapWorldCell(page:Page,cell:readonly[number,number]){
  const canvas=page.locator('canvas');
  const box=await canvas.boundingBox();
  if(!box)throw new Error('Missing canvas');
  const state=await scene(page);
  const worldX=(cell[0]+1)*32,worldY=(cell[1]+1)*16;
  await page.touchscreen.tap(
    box.x+(worldX-state.camera.x)*state.camera.zoom,
    box.y+(worldY-state.camera.y)*state.camera.zoom,
  );
}

async function touchTravelToWorldCell(page:Page,cell:readonly[number,number]){
  const canvas=page.locator('canvas');
  const worldX=(cell[0]+1)*32,worldY=(cell[1]+1)*16;
  for(let attempt=0;attempt<8;attempt++){
    const box=await canvas.boundingBox();
    if(!box)throw new Error('Missing canvas');
    const before=await scene(page);
    if(before.inBattleView)return;
    const screenX=(worldX-before.camera.x)*before.camera.zoom;
    const screenY=(worldY-before.camera.y)*before.camera.zoom;
    // A phone user cannot tap an off-screen destination. Advance toward it
    // through a HUD-safe visible point, let camera-follow catch up, then tap
    // the actual encounter cell once it enters the viewport.
    const safeLeft=Math.min(64,box.width*.2),safeRight=Math.max(safeLeft+1,box.width-64);
    const safeTop=Math.min(140,box.height*.3),safeBottom=Math.max(safeTop+1,box.height-130);
    const tapX=Math.min(safeRight,Math.max(safeLeft,screenX));
    const tapY=Math.min(safeBottom,Math.max(safeTop,screenY));
    await page.touchscreen.tap(box.x+tapX,box.y+tapY);
    await expect.poll(async()=>{
      const next=await scene(page);
      return next.inBattleView||next.routeLength>0
        ||Math.abs(next.anchor.x-before.anchor.x)>1
        ||Math.abs(next.anchor.y-before.anchor.y)>1;
    },{timeout:5000,intervals:[50,100]}).toBe(true);
    await expect.poll(async()=>{
      const next=await scene(page);
      return next.inBattleView||next.routeLength===0;
    },{timeout:20000,intervals:[80]}).toBe(true);
    if((await scene(page)).inBattleView)return;
  }
  throw new Error(`Touch travel did not reach world cell ${cell[0]},${cell[1]}`);
}

async function tapEnemy(page:Page,id:string){
  const state=await scene(page);
  const enemy=state.enemies.find(row=>row.id===id&&row.hp>0);
  if(!enemy)throw new Error(`Missing enemy ${id}`);
  const canvas=page.locator('canvas');
  const box=await canvas.boundingBox();
  if(!box)throw new Error('Missing canvas');
  await page.touchscreen.tap(
    box.x+(enemy.x-state.camera.x)*state.camera.zoom,
    box.y+(enemy.y-state.camera.y)*state.camera.zoom,
  );
  await expect.poll(async()=>(await scene(page)).target,{timeout:5000}).toBe(id);
}


async function equipSwordsman(page:Page){
  await clickAction(page,'menu');
  await clickAction(page,'inventory');
  await expect(page.locator('#equip-weapon')).toBeVisible();
  await page.locator('#equip-weapon').selectOption('3');
  await page.locator('#equip-armor').selectOption('25');
  await clickAction(page,'inventory');
  await clickAction(page,'menu-close');
  await assertDiagnosticsOff(page);
  await expect.poll(async()=>{
    const state=await scene(page);
    return `${state.inventory.weapon}/${state.inventory.armor}`;
  }).toBe('3/25');
}

async function selectTarget(page:Page,id:string){
  const state=await scene(page);
  const enemy=state.enemies.find(row=>row.id===id&&row.hp>0);
  if(!enemy)throw new Error(`Missing enemy ${id}`);
  const canvas=page.locator('canvas');
  const box=await canvas.boundingBox();
  if(!box)throw new Error('Missing canvas');
  await page.mouse.click(
    box.x+(enemy.x-state.camera.x)*state.camera.zoom,
    box.y+(enemy.y-state.camera.y)*state.camera.zoom,
  );
  await expect.poll(async()=>(await scene(page)).target,{timeout:5000}).toBe(id);
}

type RectLike={left:number;top:number;right:number;bottom:number;width:number;height:number};

function overlap(a:RectLike,b:RectLike){
  return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))
    *Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
}

test('S24 preflight: required desktop viewports stay inside the player shell with diagnostics off',async({page})=>{
  mkdirSync('test-results',{recursive:true});
  const geometries:Record<string,unknown>={};

  for(const size of [{width:1366,height:768},{width:1920,height:1080}]){
    await page.setViewportSize(size);
    await ready(page);
    await assertDiagnosticsOff(page);
    await expect(page.locator('[data-ui="field-hud"]')).toBeVisible();

    const geometry=await page.evaluate(()=>{
      const rect=(selector:string)=>{
        const node=document.querySelector<HTMLElement>(selector);
        if(!node)throw new Error(`Missing ${selector}`);
        const r=node.getBoundingClientRect();
        return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
      };
      return {
        viewport:{width:innerWidth,height:innerHeight},
        scrollWidth:document.documentElement.scrollWidth,
        top:rect('.top-command-strip'),
        player:rect('.player-plate'),
        map:rect('.small-map-plate'),
        quest:rect('.quest-tracker'),
        deck:rect('.field-bottom-center'),
        quick:rect('.field-bottom-right'),
        quickSlots:[...document.querySelectorAll<HTMLButtonElement>('.legacy-quick-slot')].map(node=>({disabled:node.disabled,text:node.textContent??''})),
      };
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(size.width);

    const regions=[geometry.top,geometry.player,geometry.map,geometry.quest,geometry.deck,geometry.quick] as RectLike[];
    for(const region of regions){
      expect(region.left).toBeGreaterThanOrEqual(-1);
      expect(region.top).toBeGreaterThanOrEqual(-1);
      expect(region.right).toBeLessThanOrEqual(size.width+1);
      expect(region.bottom).toBeLessThanOrEqual(size.height+1);
    }

    // S20 evidence gate: edge chrome relationships, not free-form RPG cards.
    expect(geometry.top.top).toBeLessThanOrEqual(1);
    expect(geometry.top.height).toBeGreaterThanOrEqual(28);
    expect(geometry.top.height).toBeLessThanOrEqual(36);
    expect(geometry.top.width).toBeGreaterThanOrEqual(size.width-1);

    expect(geometry.player.left).toBeLessThanOrEqual(10);
    expect(size.height-geometry.player.bottom).toBeLessThanOrEqual(10);
    expect(geometry.player.width).toBeLessThanOrEqual(300);
    expect(geometry.player.height).toBeLessThanOrEqual(70);

    expect(geometry.map.left).toBeLessThanOrEqual(10);
    expect(geometry.map.top).toBeGreaterThanOrEqual(geometry.top.bottom);
    expect(geometry.map.width).toBeLessThanOrEqual(160);

    expect(size.width-geometry.quest.right).toBeLessThanOrEqual(10);
    expect(geometry.quest.top).toBeGreaterThanOrEqual(geometry.top.bottom);

    expect(size.height-geometry.deck.bottom).toBeLessThanOrEqual(10);
    expect(geometry.deck.height).toBeLessThanOrEqual(138);
    expect(size.height-geometry.quick.bottom).toBeLessThanOrEqual(10);
    expect(size.width-geometry.quick.right).toBeLessThanOrEqual(10);
    expect(overlap(geometry.player,geometry.deck)).toBe(0);
    expect(overlap(geometry.deck,geometry.quick)).toBe(0);

    expect(geometry.quickSlots).toHaveLength(8);
    expect(geometry.quickSlots.every(slot=>slot.disabled)).toBe(true);
    for(const key of ['A','S','D','F','Z','X','C','V'])expect(geometry.quickSlots.some(slot=>slot.text.includes(key))).toBe(true);

    geometries[`${size.width}x${size.height}`]=geometry;
    await page.screenshot({path:`test-results/s24-preflight-${size.width}x${size.height}.png`,fullPage:true});
  }

  writeFileSync('test-results/s24-hud-geometry.json',JSON.stringify(geometries,null,2));
});

test('S24 preflight: standalone player shell opens offline without diagnostics or network',async({page})=>{
  test.skip(!process.env.LAPIS_OFFLINE_PREVIEW,'No standalone HTML supplied');
  const external:string[]=[];
  page.on('request',request=>{if(/^https?:/.test(request.url()))external.push(request.url());});
  const url=pathToFileURL(process.env.LAPIS_OFFLINE_PREVIEW!);
  url.searchParams.set('m4','1');
  await page.goto(url.href);
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
  await page.waitForFunction(()=>document.body.classList.contains('m4-active'));
  await assertDiagnosticsOff(page);
  await expect(page.locator('[data-ui="field-hud"]')).toBeVisible();
  expect(external).toEqual([]);
});

test('S24 synthetic glue: keyboard interaction opens explicit dialogue before quest mutation',async({page})=>{
  await ready(page);
  await assertDiagnosticsOff(page);

  const before=await runtime(page);
  expect(before.quest.stage).toBe('not_started');

  await page.keyboard.press('e');
  const dialogue=page.locator('[data-ui="npc-dialogue"]');
  await expect(dialogue).toBeVisible();
  await expect(dialogue).toHaveAttribute('data-input-source','keyboard');
  const dialogueGeometry=await dialogue.evaluate(node=>{
    const rect=node.getBoundingClientRect();
    const portrait=node.querySelector<HTMLElement>('.npc-dialogue-portrait')?.getBoundingClientRect();
    return {left:rect.left,right:rect.right,bottom:rect.bottom,height:rect.height,viewportWidth:innerWidth,viewportHeight:innerHeight,portraitWidth:portrait?.width??0};
  });
  expect(dialogueGeometry.left).toBeLessThanOrEqual(10);
  expect(dialogueGeometry.viewportWidth-dialogueGeometry.right).toBeLessThanOrEqual(10);
  expect(dialogueGeometry.viewportHeight-dialogueGeometry.bottom).toBeLessThanOrEqual(10);
  expect(dialogueGeometry.right-dialogueGeometry.left).toBeGreaterThanOrEqual(dialogueGeometry.viewportWidth*.8);
  expect(dialogueGeometry.height).toBeGreaterThanOrEqual(dialogueGeometry.viewportHeight*.18);
  expect(dialogueGeometry.portraitWidth).toBeGreaterThan(90);
  await expect.poll(async()=>(await runtime(page)).quest.stage).toBe('not_started');

  const accept=dialogue.locator('[data-dialogue-choice="accept-quest"]');
  await expect(accept).toBeVisible();
  await accept.click();
  await expect.poll(async()=>(await runtime(page)).quest.stage).toBe('accepted');
  await expect(dialogue).toHaveCount(0);

  // The synthetic compatibility world warps to its training objective only
  // after the explicit Accept choice. At that point E belongs to the objective
  // interaction, not to a second guide-dialogue assertion.
  await expect.poll(async()=>(await runtime(page)).quest.stage).toBe('accepted');
  await assertDiagnosticsOff(page);
});

test.describe('S24 mobile touch contract',()=>{
  test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});

  test('S24 mobile touch: NPC interaction and skill activation need no keyboard',async({page})=>{
    test.setTimeout(180000);
    const pageErrors:string[]=[];
    page.on('pageerror',error=>pageErrors.push(error.message));

    await ready(page);
    const startRuntime=await runtime(page);
    test.skip(!startRuntime.playableRecovery,'Private fixed-hash M5 resources are required.');
    await assertDiagnosticsOff(page);

    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const menuBox=await page.locator('[data-action="menu"]').boundingBox();
    expect(menuBox?.height??0).toBeGreaterThanOrEqual(44);
    await page.screenshot({path:'test-results/s24-mobile-touch-field-390x844.png',fullPage:true});

    const before=await scene(page);
    const offeredTap=await tapGuide(page);
    expect(offeredTap.after.routeLength).toBe(0);
    expect(offeredTap.after.anchor.x).toBeCloseTo(before.anchor.x,2);
    expect(offeredTap.after.anchor.y).toBeCloseTo(before.anchor.y,2);

    const dialogue=page.locator('[data-ui="npc-dialogue"]');
    await expect(dialogue).toBeVisible();
    await expect(dialogue).toHaveAttribute('data-input-source','pointer');
    await expect.poll(async()=>(await runtime(page)).quest.stage).toBe('not_started');

    const decline=dialogue.locator('[data-dialogue-choice="decline-quest"]');
    await expect(decline).toBeVisible();
    expect((await decline.boundingBox())?.height??0).toBeGreaterThanOrEqual(44);
    await decline.tap();
    await expect(dialogue).toHaveCount(0);
    await expect.poll(async()=>(await runtime(page)).quest.stage).toBe('not_started');

    const interact=page.locator('[data-action="interact"]');
    await expect(interact).toBeVisible();
    expect((await interact.boundingBox())?.height??0).toBeGreaterThanOrEqual(44);
    await interact.tap();
    await expect(dialogue).toBeVisible();
    await expect(dialogue).toHaveAttribute('data-input-source','pointer');
    await dialogue.locator('[data-dialogue-choice="accept-quest"]').tap();
    await expect.poll(async()=>(await runtime(page)).quest.stage,{timeout:5000}).toBe('accepted');

    const plan=(await runtime(page)).worldPlan!;
    await tapWorldCell(page,plan.doorCell as [number,number]);
    await expect.poll(async()=>(await scene(page)).mapId,{timeout:30000,intervals:[100]}).toBe(7);
    await expect.poll(async()=>(await runtime(page)).quest.stage).toBe('objective');

    await touchTravelToWorldCell(page,plan.encounterCell as [number,number]);
    await expect.poll(async()=>(await scene(page)).inBattleView,{timeout:30000,intervals:[100]}).toBe(true);
    await expect.poll(async()=>{
      const state=await scene(page);
      return state.phase!=='active'||state.actionReady;
    },{timeout:12000,intervals:[80]}).toBe(true);

    const battle=await scene(page);
    expect(battle.phase).toBe('active');
    const touchTarget=battle.enemies.find(row=>row.id==='dummy-ranged'&&row.hp>0)??battle.enemies.find(row=>row.hp>0);
    if(!touchTarget)throw new Error('No live enemy available for touch targeting');
    await tapEnemy(page,touchTarget.id);

    const skill=page.locator('[data-action="skill"][data-skill-id="1301"]');
    await expect(skill).toBeVisible();
    await expect(skill).toBeEnabled();
    expect((await skill.boundingBox())?.height??0).toBeGreaterThanOrEqual(44);
    const beforeSkill=await scene(page);
    await skill.tap();
    await expect.poll(async()=>(await scene(page)).mp,{timeout:5000}).toBeLessThan(beforeSkill.mp);
    expect((await scene(page)).action).toBeLessThan(beforeSkill.action);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({path:'test-results/s24-mobile-touch-battle-390x844.png',fullPage:true});

    // Active-battle retreat is accepted as a real touch flow: request -> cancel -> request -> confirm.
    const exitButton=page.locator('[data-action="battle-exit-request"]');
    await expect(exitButton).toBeVisible();
    expect((await exitButton.boundingBox())?.height??0).toBeGreaterThanOrEqual(44);
    await exitButton.tap();
    const exitConfirm=page.locator('[data-ui="battle-exit-confirm"]');
    await expect(exitConfirm).toBeVisible();
    await expect.poll(async()=>(await scene(page)).battlePaused).toBe(true);

    await exitConfirm.locator('[data-action="battle-exit-cancel"]').tap();
    await expect(exitConfirm).toHaveCount(0);
    await expect.poll(async()=>(await scene(page)).battlePaused).toBe(false);
    expect((await scene(page)).inBattleView).toBe(true);

    await exitButton.tap();
    await expect(exitConfirm).toBeVisible();
    await exitConfirm.locator('[data-action="battle-exit-confirm"]').tap();
    await expect.poll(async()=>(await scene(page)).inBattleView,{timeout:5000}).toBe(false);
    expect((await scene(page)).mapId).toBe(7);
    expect((await runtime(page)).quest.stage).toBe('objective');
    await page.waitForTimeout(750);
    expect((await scene(page)).inBattleView).toBe(false);

    await assertDiagnosticsOff(page);
    expect(pageErrors).toEqual([]);
  });
});

test('S24 final gate: real pointer NPC -> quest -> spatial battle -> pointer turn-in, no diagnostics',async({page})=>{
  test.setTimeout(240000);
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));

  await page.setViewportSize({width:1366,height:768});
  await ready(page);
  const startRuntime=await runtime(page);
  test.skip(!startRuntime.playableRecovery,'Private fixed-hash M5 resources are required.');

  await assertDiagnosticsOff(page);
  const cursor=await hoverGuide(page);
  expect(cursor).toBe('pointer');

  const start=await scene(page);
  expect(start.mapId).toBe(1);
  expect(start.worldVisuals.some(row=>row.id==='training-guide'&&row.visible)).toBe(true);
  expect(startRuntime.quest.stage).toBe('not_started');

  // Real keyboard events for zoom/fullscreen; no direct scene method calls.
  const initialZoom=start.camera.zoom;
  await page.keyboard.press('+');
  await expect.poll(async()=>(await scene(page)).camera.zoom).toBeGreaterThan(initialZoom);
  await page.keyboard.press('0');
  await expect.poll(async()=>(await scene(page)).camera.zoom).toBe(1);
  const viewport=(await scene(page)).viewport;
  if(viewport?.fullscreenSupported){
    await page.keyboard.press('f');
    await expect.poll(async()=>Boolean((await scene(page)).viewport?.fullscreenActive),{timeout:5000}).toBe(true);
    await page.keyboard.press('f');
    await expect.poll(async()=>Boolean((await scene(page)).viewport?.fullscreenActive),{timeout:5000}).toBe(false);
  }

  await equipSwordsman(page);

  // P0 gate: a real browser pointer click on the visible NPC must be consumed
  // as interaction and must not fall through to field movement. S23 requires
  // activation and quest mutation to be separate: opening the dialogue must
  // leave the quest at not_started until the user explicitly accepts.
  const offeredClick=await clickGuide(page);
  expect(offeredClick.after.routeLength).toBe(0);
  expect(offeredClick.after.anchor.x).toBeCloseTo(offeredClick.before.anchor.x,2);
  expect(offeredClick.after.anchor.y).toBeCloseTo(offeredClick.before.anchor.y,2);
  await expect.poll(async()=>(await runtime(page)).quest.stage,{timeout:5000}).toBe('not_started');

  const dialogue=page.locator('[data-ui="npc-dialogue"]');
  await expect(dialogue).toBeVisible();
  await expect(dialogue).toHaveAttribute('data-input-source','pointer');
  await expect(dialogue).toContainText(/训练引导员|训练/);
  const acceptChoice=dialogue.locator('[data-dialogue-choice="accept-quest"]');
  await expect(acceptChoice).toBeVisible();
  await acceptChoice.click();
  await expect.poll(async()=>(await runtime(page)).quest.stage,{timeout:5000}).toBe('accepted');

  const plan=(await runtime(page)).worldPlan!;
  await clickWorldCell(page,plan.doorCell as [number,number]);
  await expect.poll(async()=>(await scene(page)).mapId,{timeout:30000,intervals:[100]}).toBe(7);
  await expect.poll(async()=>(await runtime(page)).quest.stage).toBe('objective');
  expect((await scene(page)).worldVisuals.some(row=>row.resourceId===4524&&row.visible)).toBe(true);
  expect((await scene(page)).worldVisuals.some(row=>row.resourceId===4544&&row.visible)).toBe(true);

  await clickWorldCell(page,plan.encounterCell as [number,number]);
  await expect.poll(async()=>(await scene(page)).inBattleView,{timeout:30000,intervals:[100]}).toBe(true);
  const entered=await scene(page);
  expect(entered.battleZoneId).toBe(0);
  expect(entered.damagePolicy.id).toBe('m5-reconstruction-combat-balance-v2');
  expect(entered.damagePolicy.provenance).toBe('RECONSTRUCTION_POLICY');
  expect(entered.enemies.map(row=>row.visualResourceId)).toEqual([4524,4544]);

  let moved=false,attacked=false;
  for(let turn=0;turn<40;turn++){
    await expect.poll(async()=>{
      const state=await scene(page);
      return state.phase!=='active'||state.actionReady;
    },{timeout:12000,intervals:[80]}).toBe(true);
    const state=await scene(page);
    if(state.phase==='won')break;
    expect(state.phase,`Unexpected defeat: ${JSON.stringify({hp:state.hp,enemies:state.enemies})}`).toBe('active');
    const target=state.enemies.find(row=>row.hp>0);
    if(!target)break;
    if(state.target!==target.id)await selectTarget(page,target.id);
    const current=await scene(page);
    const live=current.enemies.find(row=>row.id===target.id&&row.hp>0)!;
    const distance=Math.max(Math.abs(live.cell[0]-current.battleCell[0]),Math.abs(live.cell[1]-current.battleCell[1]));
    if(distance<=1){
      await clickAction(page,'attack');
      attacked=true;
      continue;
    }
    const options=[...current.reachable].sort((a,b)=>
      Math.max(Math.abs(a[0]-live.cell[0]),Math.abs(a[1]-live.cell[1]))
      -Math.max(Math.abs(b[0]-live.cell[0]),Math.abs(b[1]-live.cell[1]))
    );
    expect(options.length).toBeGreaterThan(0);
    const before=JSON.stringify(current.battleCell);
    await clickWorldCell(page,options[0]);
    await expect.poll(async()=>JSON.stringify((await scene(page)).battleCell),{timeout:10000}).not.toBe(before);
    moved=true;
  }

  await expect.poll(async()=>(await scene(page)).phase,{timeout:12000}).toBe('won');
  expect(moved).toBe(true);
  expect(attacked).toBe(true);

  await clickAction(page,'return');
  await expect.poll(async()=>(await scene(page)).inBattleView).toBe(false);
  await expect.poll(async()=>(await scene(page)).mapId).toBe(1);
  await expect.poll(async()=>(await runtime(page)).quest.stage).toBe('ready_to_turn_in');

  const turnInClick=await clickGuide(page);
  expect(turnInClick.after.routeLength).toBe(0);
  await expect.poll(async()=>(await runtime(page)).quest.stage,{timeout:5000}).toBe('ready_to_turn_in');
  await expect(dialogue).toBeVisible();
  await expect(dialogue).toHaveAttribute('data-input-source','pointer');
  const turnInChoice=dialogue.locator('[data-dialogue-choice="turn-in-quest"]');
  await expect(turnInChoice).toBeVisible();
  await turnInChoice.click();
  await expect.poll(async()=>(await runtime(page)).quest.stage,{timeout:5000}).toBe('complete');
  const done=await runtime(page);
  expect(done.gold).toBe(15);
  expect(done.progression.exp).toBe(300);
  expect(done.progression.level).toBe(3);
  const save=JSON.parse(await page.evaluate(()=>window.lapisM4!.exportJson()));
  expect(save.version).toBe(2);
  expect(save.quest.stage).toBe('complete');
  await assertDiagnosticsOff(page);
  expect(pageErrors).toEqual([]);

  await page.screenshot({path:'test-results/s24-final-player-input-1366x768.png',fullPage:true});

  // The same completed player shell must remain bounded at the second required
  // desktop viewport. This is a resize gate, not a separate state shortcut.
  await page.setViewportSize({width:1920,height:1080});
  await expect.poll(async()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1920);
  await assertDiagnosticsOff(page);
  await page.screenshot({path:'test-results/s24-final-player-input-1920x1080.png',fullPage:true});
});
