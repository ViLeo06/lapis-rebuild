import {test,expect} from '@playwright/test';
import {ViewportController,type ViewportPort} from '../src/view/viewport-controller.ts';
import {clientToWorld,worldToClient} from '../src/view/coordinate-transform.ts';
import {renderViewportHarness} from '../src/view/viewport-harness.ts';
import type {CameraState,Rect,Size} from '../src/view/viewport-state.ts';

class HarnessPort implements ViewportPort{
  viewport:Size={width:1280,height:720};world:Rect={x:0,y:0,width:2400,height:1400};camera:CameraState={scrollX:560,scrollY:340,zoom:1};
  viewportSize(){return this.viewport;}worldBounds(){return this.world;}cameraState(){return this.camera;}
  resize(width:number,height:number){this.viewport={width,height};}
  setZoom(zoom:number){this.camera={...this.camera,zoom};}
  setScroll(scrollX:number,scrollY:number){this.camera={...this.camera,scrollX,scrollY};}
}

async function shot(page:import('@playwright/test').Page,name:string,port:HarnessPort,player={x:1200,y:700},fullscreen=false){
  await page.setContent(renderViewportHarness({title:name,viewport:port.viewport,world:port.world,camera:port.camera,player,fullscreen}));
  await expect(page.locator('.stage')).toBeVisible();
  await page.screenshot({path:`test-results/${name}.png`,fullPage:true});
}

test('S15 viewport harness: normal, zoom, camera follow, resize/fullscreen framing',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const port=new HarnessPort();const controller=new ViewportController(port,undefined,{zoom:{min:.5,max:2.5,step:.25,defaultZoom:1},follow:{lerp:.3}});
  await shot(page,'s15-normal',port);
  controller.zoomIn();controller.zoomIn();expect(port.camera.zoom).toBe(1.5);await shot(page,'s15-zoom-in',port);
  controller.zoomOut();controller.zoomOut();controller.zoomOut();expect(port.camera.zoom).toBe(.75);await shot(page,'s15-zoom-out',port);
  controller.resetZoom();
  for(let i=0;i<24;i++)controller.follow({x:2050,y:1120},16.6667);
  expect(port.camera.scrollX).toBeGreaterThan(700);expect(port.camera.scrollY).toBeGreaterThan(300);
  await shot(page,'s15-camera-moved',port,{x:2050,y:1120});
  controller.resize(1600,900);controller.centerOn({x:2050,y:1120});
  expect(port.camera.scrollX).toBeLessThanOrEqual(800);expect(port.camera.scrollY).toBeLessThanOrEqual(500);
  await shot(page,'s15-fullscreen-viewport',port,{x:2050,y:1120},true);
  expect(errors).toEqual([]);
});

test('S15 coordinate mapping stays exact after zoom and CSS resize',()=>{
  const port=new HarnessPort();const controller=new ViewportController(port);controller.setZoom(2);controller.centerOn({x:1500,y:800});
  const metrics={left:120,top:80,cssWidth:960,cssHeight:540,viewportWidth:1280,viewportHeight:720};
  for(const world of [{x:1200,y:650},{x:1500,y:800},{x:1750,y:980}]){
    const client=worldToClient(world,metrics,port.camera);
    const recovered=clientToWorld(client,metrics,port.camera);
    expect(recovered.x).toBeCloseTo(world.x,8);expect(recovered.y).toBeCloseTo(world.y,8);
  }
});

test('S15 battle target world click remains stable under framing zoom',()=>{
  const port=new HarnessPort();const controller=new ViewportController(port,undefined,{zoom:{min:.5,max:2.5}});
  controller.frameRect({x:900,y:420,width:640,height:480});
  const enemy={x:1320,y:660};
  const metrics={left:17,top:29,cssWidth:1280,cssHeight:720,viewportWidth:1280,viewportHeight:720};
  const client=worldToClient(enemy,metrics,port.camera);
  const world=clientToWorld(client,metrics,port.camera);
  expect(world.x).toBeCloseTo(enemy.x,8);expect(world.y).toBeCloseTo(enemy.y,8);
});
