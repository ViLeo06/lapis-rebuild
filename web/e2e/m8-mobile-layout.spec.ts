import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {renderGameShell} from '../src/ui/game-shell.ts';
import type {GameShellState} from '../src/ui/types.ts';

const css=readFileSync(new URL('../src/ui/game-shell.css',import.meta.url),'utf8');
const state:GameShellState={
  mode:'field',
  player:{name:'Mobile',className:'剑士',portraitLabel:'剑',level:12,hp:120,hpMax:140,mp:60,mpMax:80,gold:99},
  field:{mapId:1,mapName:'外城',questTitle:'移动端验收',questDetail:'旋转设备后继续游戏。',interactionPrompt:'与训练引导员交谈'},
  menu:{open:false,canSave:true,canLoad:true,devEnabled:false},
  diagnostics:{open:false,mapSelector:'0001',rawTiming:'-',actionSlot:'00',direction:'E',bounds:'-',magicRes:'-',provenance:'M8 layout fixture'},
};

type Insets={top:number;right:number;bottom:number;left:number};
async function show(page:Page,size:{width:number;height:number},safe:Insets){
  await page.setViewportSize(size);
  await page.setContent(`<!doctype html><html data-lapis-orientation="${size.width>=size.height?'landscape':'portrait'}" data-lapis-layout="${size.width<360?'narrow':size.width<900?'compact':'wide'}" style="--lapis-safe-top:${safe.top}px;--lapis-safe-right:${safe.right}px;--lapis-safe-bottom:${safe.bottom}px;--lapis-safe-left:${safe.left}px;--lapis-viewport-width:${size.width}px;--lapis-viewport-height:${size.height}px"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>html,body{margin:0;overflow:hidden}${css}</style></head><body>${renderGameShell(state)}</body></html>`);
}

async function rect(page:Page,selector:string){
  return page.locator(selector).evaluate(node=>{
    const r=(node as HTMLElement).getBoundingClientRect();
    return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
  });
}

for(const profile of [
  {name:'desktop',size:{width:1366,height:768},safe:{top:0,right:0,bottom:0,left:0}},
  {name:'android portrait',size:{width:412,height:915},safe:{top:24,right:0,bottom:0,left:0}},
  {name:'narrow portrait',size:{width:320,height:568},safe:{top:24,right:0,bottom:16,left:0}},
  {name:'iphone landscape safe area',size:{width:844,height:390},safe:{top:0,right:47,bottom:21,left:47}},
] as const){
  test(`M8 mobile shell remains inside usable area: ${profile.name}`,async({page})=>{
    await show(page,profile.size,profile.safe);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(profile.size.width);
    const topButton=await rect(page,'.top-command-button:not(:disabled)');
    const fullscreen=await rect(page,'[data-ui="field-fullscreen"]');
    const player=await rect(page,'.player-plate');
    const quest=await rect(page,'.quest-tracker');
    const interact=await rect(page,'[data-action="interact"]');
    expect(topButton.top).toBeGreaterThanOrEqual(profile.safe.top-1);
    expect(fullscreen.top).toBeGreaterThanOrEqual(profile.safe.top-1);
    expect(fullscreen.right).toBeLessThanOrEqual(profile.size.width-profile.safe.right+1);
    expect(player.left).toBeGreaterThanOrEqual(profile.safe.left-1);
    expect(player.bottom).toBeLessThanOrEqual(profile.size.height-profile.safe.bottom+1);
    expect(quest.right).toBeLessThanOrEqual(profile.size.width-profile.safe.right+1);
    expect(interact.left).toBeGreaterThanOrEqual(profile.safe.left-1);
    expect(interact.right).toBeLessThanOrEqual(profile.size.width-profile.safe.right+1);
    expect(interact.bottom).toBeLessThanOrEqual(profile.size.height-profile.safe.bottom+1);
  });
}

test.describe('M8 coarse-touch landscape controls',()=>{
  test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
  test('primary field controls keep a 44px touch target',async({page})=>{
    await show(page,{width:844,height:390},{top:0,right:47,bottom:21,left:47});
    for(const selector of ['.top-command-button:not(:disabled)','[data-ui="field-fullscreen"]','[data-action="interact"]']){
      const box=await page.locator(selector).first().boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test('M8 runtime observer updates orientation and visual viewport variables after resize',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.lapisOrientation)).toBe('portrait');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.lapisLayout)).toBe('compact');
  const portraitHeight=await page.evaluate(()=>window.visualViewport?.height??window.innerHeight);
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--lapis-viewport-height').trim())).toBe(`${Math.round(portraitHeight*100)/100}px`);

  await page.setViewportSize({width:844,height:390});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.lapisOrientation)).toBe('landscape');
  const landscapeHeight=await page.evaluate(()=>window.visualViewport?.height??window.innerHeight);
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--lapis-viewport-height').trim())).toBe(`${Math.round(landscapeHeight*100)/100}px`);
});
