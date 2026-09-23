import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  S34_FIVE_FIX_INPUT,
  S34_POISON_GEOMETRY,
  validateS34FiveFixObserved,
} from '../src/s34-five-fix-acceptance-contract.ts';
import type {S34FiveFixObserved} from '../src/s34-five-fix-acceptance-contract.ts';

function validFixture():S34FiveFixObserved{
  return {
    input:{
      basicAttack:S34_FIVE_FIX_INPUT.basicAttack,
      hpRecovery:S34_FIVE_FIX_INPUT.hpRecovery,
      mpRecovery:S34_FIVE_FIX_INPUT.mpRecovery,
      rest:S34_FIVE_FIX_INPUT.rest,
      skillAlpha:[...S34_FIVE_FIX_INPUT.skillAlpha],
      skillNumeric:[...S34_FIVE_FIX_INPUT.skillNumeric],
      cancel:S34_FIVE_FIX_INPUT.cancel,
      rangeOverlay:S34_FIVE_FIX_INPUT.rangeOverlay,
    },
    poison:S34_POISON_GEOMETRY.map(row=>({...row,emptyCenterAllowed:true,multipleTargetsAllowed:true})),
    encounter:{livingEnemyCount:20,visibleLivingEnemyCount:20,largestInteractiveClusterSize:5,onlyNearbyActiveGroupActs:true,laterGroupActivatesAfterWalking:true,laterGroupStayedVisible:true},
    camera:{worldWidth:2400,worldHeight:1600,viewportWidth:1440,viewportHeight:900,fitAllShrinkUsed:false,desktopEdgePan:true,mobileFollowOrPan:true,clampedToWorld:true,delayedSmoothTracking:true},
    minimap:{playerMarker:true,livingEnemyMarkerCount:20,viewportRect:true,navigationChangedCamera:true,navigationChangedPlayerPosition:false},
    battleExit:{requestAvailable:true,confirmationShown:true,returnedToScene:true,escapeCancelledTargetingWithoutExit:true},
  };
}

test('S34 five-fix matrix accepts the full approved contract',()=>{
  const result=validateS34FiveFixObserved(validFixture());
  assert.equal(result.ok,true,result.errors.join('\n'));
  assert.deepEqual(result.errors,[]);
});

test('S34 five-fix matrix locks poison Lv1-Lv6 distance and area cells',()=>{
  const fixture=validFixture();
  const poison=fixture.poison.map(row=>row.level===3?{...row,castDistanceCells:4,areaCells:9}:row);
  const result=validateS34FiveFixObserved({...fixture,poison});
  assert.equal(result.ok,false);
  assert.ok(result.errors.includes('poison-distance: Lv3 expected 5'));
  assert.ok(result.errors.includes('poison-area: Lv3 expected 13'));
});

test('S34 five-fix matrix rejects hidden later enemies and oversized interactive groups',()=>{
  const fixture=validFixture();
  const result=validateS34FiveFixObserved({...fixture,encounter:{...fixture.encounter,visibleLivingEnemyCount:5,largestInteractiveClusterSize:6,laterGroupStayedVisible:false}});
  assert.equal(result.ok,false);
  assert.ok(result.errors.includes('encounter-visibility: all living enemies must stay visible'));
  assert.ok(result.errors.includes('encounter-cluster-size: maximum interactive cluster must be <=5'));
  assert.ok(result.errors.includes('encounter-later-visible: later group disappeared'));
});

test('S34 five-fix matrix rejects fit-all camera and minimap player teleport',()=>{
  const fixture=validFixture();
  const result=validateS34FiveFixObserved({
    ...fixture,
    camera:{...fixture.camera,fitAllShrinkUsed:true,clampedToWorld:false},
    minimap:{...fixture.minimap,navigationChangedPlayerPosition:true},
  });
  assert.equal(result.ok,false);
  assert.ok(result.errors.includes('camera-fit-all: fit-all shrink is forbidden'));
  assert.ok(result.errors.includes('camera-world-clamp: missing'));
  assert.ok(result.errors.includes('minimap-navigation: player position changed'));
});

test('S34 five-fix matrix locks modern input mapping and exit regression',()=>{
  const fixture=validFixture();
  const result=validateS34FiveFixObserved({
    ...fixture,
    input:{...fixture.input,hpRecovery:'H',rest:'R',skillAlpha:['Z','X','C','V']},
    battleExit:{...fixture.battleExit,escapeCancelledTargetingWithoutExit:false},
  });
  assert.equal(result.ok,false);
  assert.ok(result.errors.includes('input-hp-recovery: expected S'));
  assert.ok(result.errors.includes('input-rest: expected F'));
  assert.ok(result.errors.includes('input-skill-alpha: expected Q/W/E/R'));
  assert.ok(result.errors.includes('battle-exit-escape-regression: targeting cancel exited battle'));
});
