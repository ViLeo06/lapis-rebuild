import {test} from 'node:test';
import assert from 'node:assert/strict';
import {directionFor} from '../src/coordinates.ts';

test('movement vectors map to observed B100/B109 ANI direction rows',()=>{
  assert.equal(directionFor(0,1),0);   // south
  assert.equal(directionFor(-1,1),1);  // south-west
  assert.equal(directionFor(-1,0),2);  // west
  assert.equal(directionFor(-1,-1),3); // north-west
  assert.equal(directionFor(0,-1),4);  // north
  assert.equal(directionFor(1,-1),5);  // north-east
  assert.equal(directionFor(1,0),6);   // east
  assert.equal(directionFor(1,1),7);   // south-east
});
