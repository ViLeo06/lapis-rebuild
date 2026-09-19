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
    const map=rect('.map-plate');
    const player=rect('.player-plate');
    const quest=rect('.quest-tracker');
    const left=rect('.field-bottom-left');
    const right=rect('.field-bottom-right');
    return{
      player,quest,left,right,map,
      viewport:{width:innerWidth,height:innerHeight},
      scroll:{client:document.documentElement.clientWidth,width:document.documentElement.scrollWidth},
      background:getComputedStyle(document.querySelector<HTMLElement>('.quest-tracker')!).backgroundImage,
    };
  });
}

for(const viewport of [{width:1366,height:768},{width:1920,height:1080}]){
  test(`S21 static HUD anchors at ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    await show(page,base);
    const g=await geometry(page);
    expect(g.player.width).toBeLessThanOrEqual(330);
    expect(g.player.height).toBeLessThanOrEqual(64);
    expect(g.quest.viewportWidth).toBeUndefined();
    expect(g.viewport.width-g.quest.right).toBeLessThanOrEqual(10);
    expect(g.viewport.height-g.left.bottom).toBeLessThanOrEqual(10);
    expect(g.viewport.height-g.right.bottom).toBeLessThanOrEqual(10);
    expect(g.map.width).toBeLessThanOrEqual(140);
    expect(g.left.right).toBeLessThan(g.right.x);
    expect(g.scroll.width).toBeLessThanOrEqual(g.scroll.client);
    expect(g.background).toContain('rgba');
    await page.screenshot({path:`test-results/s21-static-${viewport.width}x${viewport.height}.png`,fullPage:true});
  });
}

test('S21 diagnostics remain opt-in and can be closed',async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await show(page,{...base,menu:{...base.menu,devEnabled:true},diagnostics:{...base.diagnostics,open:true}});
  const panel=page.locator('#developer-diagnostics');
  await expect(panel).toHaveAttribute('open','');
  await panel.locator('summary').click();
  await expect(panel).not.toHaveAttribute('open','');
});

for(const viewport of [{width:1366,height:768},{width:1920,height:1080}]){
  test(`S21 integrated M5 HUD remains anchored at ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.goto('/?m4=1');
    await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
    await expect(page.locator('#m4-hud-root [data-ui="field-hud"]')).toBeVisible();
    await expect(page.locator('#m4-debug-root #developer-diagnostics')).toHaveCount(0);
    const g=await geometry(page);
    expect(g.player.width).toBeLessThanOrEqual(330);
    expect(g.player.height).toBeLessThanOrEqual(64);
    expect(g.viewport.width-g.quest.right).toBeLessThanOrEqual(10);
    expect(g.viewport.height-g.left.bottom).toBeLessThanOrEqual(10);
    expect(g.viewport.height-g.right.bottom).toBeLessThanOrEqual(10);
    expect(g.map.width).toBeLessThanOrEqual(140);
    expect(g.left.right).toBeLessThan(g.right.x);
    expect(g.scroll.width).toBeLessThanOrEqual(g.scroll.client);
    await page.screenshot({path:`test-results/s21-runtime-${viewport.width}x${viewport.height}.png`,fullPage:true});
  });
}
