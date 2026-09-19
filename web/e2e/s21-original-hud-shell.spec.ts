import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {renderGameShell} from '../src/ui/game-shell.ts';
import type {GameShellState} from '../src/ui/types.ts';

const css=readFileSync(new URL('../src/ui/game-shell.css',import.meta.url),'utf8');
const base:GameShellState={
  mode:'field',
  player:{name:'ViLeo',className:'剑士',portraitLabel:'剑',level:12,hp:112,hpMax:125,mp:64,mpMax:100,gold:1280},
  field:{mapId:1,mapName:'外城',questTitle:'训练委托',questDetail:'到训练场完成一次战斗，再回来复命。',interactionPrompt:'与训练引导员交谈'},
  menu:{open:false,canSave:true,canLoad:true,devEnabled:false},
  diagnostics:{open:false,mapSelector:'0001',rawTiming:'5 -> 200ms',actionSlot:'00',direction:'E / 6',bounds:'hidden',magicRes:'idle',provenance:'VERIFIED visual facts; reconstruction rules stay explicit.'},
  notice:'附近有可交互的 NPC',
};

async function show(page:Page,state:GameShellState){
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body style="margin:0">${renderGameShell(state)}</body></html>`);
}

async function geometry(page:Page){
  return page.evaluate(()=>{
    const rect=(selector:string)=>{
      const node=document.querySelector<HTMLElement>(selector);
      if(!node)throw new Error(`Missing ${selector}`);
      const r=node.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
    };
    const quickSlots=[...document.querySelectorAll<HTMLButtonElement>('.legacy-quick-slot')];
    return{
      top:rect('.top-command-strip'),
      map:rect('.small-map-plate'),
      player:rect('.player-plate'),
      quest:rect('.quest-tracker'),
      deck:rect('.field-bottom-center'),
      quick:rect('.field-bottom-right'),
      quickSlots:quickSlots.map(node=>({disabled:node.disabled,text:node.textContent??''})),
      viewport:{width:innerWidth,height:innerHeight},
      scroll:{client:document.documentElement.clientWidth,width:document.documentElement.scrollWidth},
      background:getComputedStyle(document.querySelector<HTMLElement>('.quest-tracker')!).backgroundImage,
    };
  });
}

function expectDesktopGeometry(g:Awaited<ReturnType<typeof geometry>>){
  expect(g.top.y).toBeGreaterThanOrEqual(0);
  expect(g.top.y).toBeLessThanOrEqual(1);
  expect(g.top.height).toBeGreaterThanOrEqual(28);
  expect(g.top.height).toBeLessThanOrEqual(36);
  expect(g.top.width).toBeGreaterThanOrEqual(g.viewport.width-1);

  expect(g.player.width).toBeLessThanOrEqual(300);
  expect(g.player.height).toBeLessThanOrEqual(70);
  expect(g.player.x).toBeLessThanOrEqual(10);
  expect(g.viewport.height-g.player.bottom).toBeLessThanOrEqual(10);

  expect(g.map.x).toBeLessThanOrEqual(10);
  expect(g.map.y).toBeGreaterThanOrEqual(g.top.bottom);
  expect(g.map.width).toBeLessThanOrEqual(160);

  const questRightGap=g.viewport.width-g.quest.right;
  expect(questRightGap).toBeGreaterThanOrEqual(0);
  expect(questRightGap).toBeLessThanOrEqual(10);
  expect(g.quest.y).toBeGreaterThanOrEqual(g.top.bottom);

  expect(g.deck.height).toBeLessThanOrEqual(138);
  expect(g.viewport.height-g.deck.bottom).toBeLessThanOrEqual(10);
  expect(g.viewport.height-g.quick.bottom).toBeLessThanOrEqual(10);
  expect(g.viewport.width-g.quick.right).toBeLessThanOrEqual(10);
  expect(g.player.right).toBeLessThan(g.deck.x);
  expect(g.deck.right).toBeLessThan(g.quick.x);

  expect(g.quickSlots).toHaveLength(8);
  expect(g.quickSlots.every(slot=>slot.disabled)).toBe(true);
  for(const key of ['A','S','D','F','Z','X','C','V'])expect(g.quickSlots.some(slot=>slot.text.includes(key))).toBe(true);
  expect(g.scroll.width).toBeLessThanOrEqual(g.scroll.client);
}

for(const viewport of [{width:1366,height:768},{width:1920,height:1080}]){
  test(`S20/S21 static HUD anchors at ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    await show(page,base);
    const g=await geometry(page);
    expectDesktopGeometry(g);
    expect(g.background).toContain('rgba');
    await page.screenshot({path:`test-results/s21-static-${viewport.width}x${viewport.height}.png`});
  });
}

test('S20/S21 diagnostics remain opt-in and can be closed',async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await show(page,{...base,menu:{...base.menu,devEnabled:true},diagnostics:{...base.diagnostics,open:true}});
  const panel=page.locator('#developer-diagnostics');
  await expect(panel).toHaveAttribute('open','');
  await panel.locator('summary').click();
  await expect(panel).not.toHaveAttribute('open','');
});

for(const viewport of [{width:1366,height:768},{width:1920,height:1080}]){
  test(`S20/S21 integrated M5 HUD remains anchored at ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.goto('/?m4=1');
    await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
    await expect(page.locator('#m4-hud-root [data-ui="field-hud"]')).toBeVisible();
    await expect(page.locator('#m4-debug-root #developer-diagnostics')).toHaveCount(0);
    await expect(page.locator('#app > header')).toBeHidden();
    await expect(page.locator('#app > footer')).toBeHidden();
    const g=await geometry(page);
    expectDesktopGeometry(g);
    await page.screenshot({path:`test-results/s21-runtime-${viewport.width}x${viewport.height}.png`});
  });
}
