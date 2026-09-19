import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraFollowPolicy,clampScroll} from '../src/view/camera-follow.ts';
import {clientToWorld,worldToClient,screenToWorld,worldToScreen} from '../src/view/coordinate-transform.ts';
import {ViewportController,type FullscreenPort,type ViewportPort} from '../src/view/viewport-controller.ts';
import type {CameraState,Rect,Size} from '../src/view/viewport-state.ts';

class FakeViewport implements ViewportPort{
  viewport:Size={width:800,height:600};world:Rect={x:0,y:0,width:2000,height:1200};camera:CameraState={scrollX:200,scrollY:100,zoom:1};
  viewportSize(){return this.viewport;}worldBounds(){return this.world;}cameraState(){return this.camera;}
  resize(width:number,height:number){this.viewport={width,height};}
  setZoom(zoom:number){this.camera={...this.camera,zoom};}
  setScroll(scrollX:number,scrollY:number){this.camera={...this.camera,scrollX,scrollY};}
}
class FakeFullscreen implements FullscreenPort{
  supported=true;on=false;active(){return this.on;}async enter(){this.on=true;return true;}async exit(){this.on=false;return true;}
}

test('coordinate transforms round-trip through zoomed/scaled canvas',()=>{
  const camera={scrollX:300,scrollY:120,zoom:1.75};
  const world={x:742,y:411};
  const screen=worldToScreen(world,camera);
  assert.deepEqual(screenToWorld(screen,camera),world);
  const metrics={left:40,top:25,cssWidth:640,cssHeight:360,viewportWidth:1280,viewportHeight:720};
  const client=worldToClient(world,metrics,camera);
  const round=clientToWorld(client,metrics,camera);
  assert.ok(Math.abs(round.x-world.x)<1e-9);
  assert.ok(Math.abs(round.y-world.y)<1e-9);
});

test('camera clamp never leaves map and centers undersized worlds',()=>{
  assert.deepEqual(clampScroll({x:-999,y:999},{width:800,height:600},{x:0,y:0,width:2000,height:1200},1),{x:0,y:600});
  assert.deepEqual(clampScroll({x:0,y:0},{width:1000,height:800},{x:0,y:0,width:600,height:400},1),{x:-200,y:-200});
});

test('camera follow eases toward player center and clamps at map edges',()=>{
  const follow=new CameraFollowPolicy({lerp:0.25});
  const viewport={width:800,height:600},world={x:0,y:0,width:1600,height:900};
  const camera={scrollX:0,scrollY:0,zoom:1};
  assert.deepEqual(follow.desiredScroll(camera,{x:400,y:300},viewport,world),{x:0,y:0});

  const desired=follow.desiredScroll(camera,{x:900,y:300},viewport,world);
  assert.deepEqual(desired,{x:500,y:0});
  const moved=follow.step(camera,{x:900,y:300},viewport,world,16.6667);
  assert.ok(moved.x>0&&moved.x<desired.x);

  let settling={scrollX:moved.x,scrollY:moved.y,zoom:1};
  for(let i=0;i<80;i++){
    const next=follow.step(settling,{x:900,y:300},viewport,world,16.6667);
    settling={scrollX:next.x,scrollY:next.y,zoom:1};
  }
  assert.ok(Math.abs((settling.scrollX+viewport.width/2)-900)<0.01);

  assert.deepEqual(follow.desiredScroll({scrollX:700,scrollY:250,zoom:1},{x:1599,y:899},viewport,world),{x:800,y:300});
  assert.deepEqual(follow.desiredScroll({scrollX:20,scrollY:0,zoom:1},{x:0,y:300},viewport,world),{x:0,y:0});
});

test('controller zoom is bounded and preserves camera center',()=>{
  const port=new FakeViewport();const ctl=new ViewportController(port,undefined,{zoom:{min:0.75,max:2,step:0.25,defaultZoom:1}});
  const beforeCenter={x:port.camera.scrollX+port.viewport.width/2,y:port.camera.scrollY+port.viewport.height/2};
  ctl.zoomIn();
  const afterCenter={x:port.camera.scrollX+port.viewport.width/(2*port.camera.zoom),y:port.camera.scrollY+port.viewport.height/(2*port.camera.zoom)};
  assert.deepEqual(afterCenter,beforeCenter);
  for(let i=0;i<20;i++)ctl.zoomIn();assert.equal(port.camera.zoom,2);
  for(let i=0;i<20;i++)ctl.zoomOut();assert.equal(port.camera.zoom,.75);
  ctl.resetZoom();assert.equal(port.camera.zoom,1);
});

test('controller resize reclamps and battle framing stays inside limits',()=>{
  const port=new FakeViewport();const ctl=new ViewportController(port,undefined,{zoom:{min:.5,max:2.5}});
  port.camera={scrollX:1500,scrollY:900,zoom:1};ctl.resize(1200,900);
  assert.deepEqual({x:port.camera.scrollX,y:port.camera.scrollY},{x:800,y:300});
  const framed=ctl.frameRect({x:1000,y:500,width:320,height:240});
  assert.equal(framed.zoom,2.5);
  assert.ok(port.camera.scrollX>=0&&port.camera.scrollY>=0);
});

test('fullscreen port is graceful and toggleable',async()=>{
  const port=new FakeViewport(),fs=new FakeFullscreen(),ctl=new ViewportController(port,fs);
  assert.equal(ctl.snapshot().fullscreenActive,false);
  assert.equal(await ctl.toggleFullscreen(),true);assert.equal(fs.active(),true);
  assert.equal(await ctl.toggleFullscreen(),true);assert.equal(fs.active(),false);
  const unsupported:FullscreenPort={supported:false,active:()=>false,enter:async()=>false,exit:async()=>false};
  assert.equal(await new ViewportController(port,unsupported).toggleFullscreen(),false);
});
