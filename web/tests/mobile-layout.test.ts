import test from 'node:test';
import assert from 'node:assert/strict';
import {applyMobileLayoutSnapshot,computeMobileLayoutSnapshot} from '../src/view/mobile-layout.ts';

for(const profile of [
  {name:'desktop',input:{layoutWidth:1366,layoutHeight:768},orientation:'landscape',layout:'wide'},
  {name:'android portrait',input:{layoutWidth:412,layoutHeight:915,visualWidth:412,visualHeight:780},orientation:'portrait',layout:'compact'},
  {name:'narrow phone',input:{layoutWidth:320,layoutHeight:568,visualWidth:320,visualHeight:500},orientation:'portrait',layout:'narrow'},
  {name:'phone landscape',input:{layoutWidth:844,layoutHeight:390,visualWidth:844,visualHeight:342},orientation:'landscape',layout:'compact'},
] as const){
  test(`mobile layout snapshot: ${profile.name}`,()=>{
    const snapshot=computeMobileLayoutSnapshot(profile.input);
    assert.equal(snapshot.orientation,profile.orientation);
    assert.equal(snapshot.layout,profile.layout);
    assert.equal(snapshot.width,profile.input.visualWidth??profile.input.layoutWidth);
    assert.equal(snapshot.height,profile.input.visualHeight??profile.input.layoutHeight);
  });
}

test('visual viewport values override layout viewport and preserve offsets',()=>{
  const snapshot=computeMobileLayoutSnapshot({layoutWidth:390,layoutHeight:844,visualWidth:390,visualHeight:612,offsetLeft:3.5,offsetTop:47.25,devicePixelRatio:3});
  assert.equal(snapshot.height,612);
  assert.equal(snapshot.offsetLeft,3.5);
  assert.equal(snapshot.offsetTop,47.25);
  assert.equal(snapshot.devicePixelRatio,3);
});

test('apply snapshot exposes CSS viewport variables and orientation state',()=>{
  const values=new Map<string,string>();
  const root={style:{setProperty:(name:string,value:string)=>values.set(name,value)},dataset:{} as Record<string,string|undefined>};
  const snapshot=computeMobileLayoutSnapshot({layoutWidth:844,layoutHeight:390,visualWidth:820,visualHeight:360,offsetLeft:12,offsetTop:8});
  applyMobileLayoutSnapshot(root,snapshot);
  assert.equal(values.get('--lapis-viewport-width'),'820px');
  assert.equal(values.get('--lapis-viewport-height'),'360px');
  assert.equal(values.get('--lapis-viewport-offset-left'),'12px');
  assert.equal(values.get('--lapis-viewport-offset-top'),'8px');
  assert.equal(root.dataset.lapisOrientation,'landscape');
  assert.equal(root.dataset.lapisLayout,'compact');
});
