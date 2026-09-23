import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {renderFieldHud} from '../src/ui/field-hud.ts';
import {renderM7TrainingManagerDialog} from '../src/ui/m7-training-camp.ts';

const css=readFileSync(new URL('../src/ui/game-shell.css',import.meta.url),'utf8');

function shell(playerLevel=26){
  const hud=renderFieldHud(
    {name:'S39 Tester',className:'巫师',portraitLabel:'巫',level:playerLevel,hp:110,hpMax:125,mp:160,mpMax:180,gold:0},
    {mapId:1,mapName:'布日古斯_外城',interactionPrompt:'与训练管理员交谈'},
  );
  return '<!doctype html><html><head><meta charset="utf-8"><style>'+
    'html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#182019}'+css+
    '</style></head><body><main class="game-stage" style="position:relative;width:100vw;height:100vh">'+
    hud+renderM7TrainingManagerDialog(playerLevel,8)+
    '</main></body></html>';
}

test('S39 desktop field keeps direct fullscreen and renders the 15-battle manager surface',async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.setContent(shell());
  await expect(page.locator('[data-ui="field-fullscreen"]')).toBeVisible();
  await expect(page.locator('[data-ui="m7-training-manager-dialog"]')).toBeVisible();
  await expect(page.locator('[data-action="training-start"]')).toHaveCount(15);
  await expect(page.locator('[data-training-battle-id="8"]')).toContainText('Lv26');
  await expect(page.locator('[data-training-battle-id="15"]')).toContainText('Boss');
  const widths=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  await page.screenshot({path:'test-results/s39-training-manager-desktop.png'});
});

test.describe('S39 mobile touch surface',()=>{
  test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});

  test('fullscreen, interaction prompt, close, and training actions meet the mobile touch contract',async({page})=>{
    await page.setContent(shell());
    const fullscreen=page.locator('[data-ui="field-fullscreen"]');
    const prompt=page.locator('[data-action="interact"]');
    const close=page.locator('[data-action="training-manager-close"]');
    const starts=page.locator('[data-action="training-start"]');
    await expect(fullscreen).toBeVisible();
    await expect(prompt).toBeVisible();
    await expect(close).toBeVisible();
    await expect(starts).toHaveCount(15);

    for(const locator of [fullscreen,prompt,close,starts.first()]){
      const box=await locator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    const widths=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    await page.screenshot({path:'test-results/s39-training-manager-mobile.png'});
  });
});
