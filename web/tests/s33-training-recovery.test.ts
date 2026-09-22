import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/battle.ts';
import {applyInfiniteTrainingRecovery,InfiniteTrainingRecoveryPolicy} from '../src/training/m7-recovery.ts';

function readyState(){
  const state=initialState();
  state.phase='active';
  state.maxHp=500;state.hp=100;
  state.maxMp=500;state.mp=50;
  state.action=state.actionMax;
  state.cooldown=0;
  return state;
}

test('S34 recovery wait is two seconds shorter than the prior five-second policy',()=>{
  assert.equal(InfiniteTrainingRecoveryPolicy.readinessCost,6);
  assert.equal(InfiniteTrainingRecoveryPolicy.estimatedWaitMs,3000);
});

test('HP Recovery restores up to 200 and consumes centralized readiness cost',()=>{
  const state=readyState();
  state.shield=321;state.manaBuff=654;
  const result=applyInfiniteTrainingRecovery(state,'hp');
  assert.equal(result.ok,true);
  assert.equal(result.restored,200);
  assert.equal(state.hp,300);
  assert.equal(state.action,state.actionMax-InfiniteTrainingRecoveryPolicy.readinessCost);
  assert.equal(state.shield,321);
  assert.equal(state.manaBuff,654);
});

test('MP Recovery caps at max without touching HP',()=>{
  const state=readyState();
  state.mp=420;
  const hp=state.hp;
  const result=applyInfiniteTrainingRecovery(state,'mp');
  assert.equal(result.ok,true);
  assert.equal(result.restored,80);
  assert.equal(state.mp,500);
  assert.equal(state.hp,hp);
});

test('full HP or MP rejects recovery without spending readiness',()=>{
  for(const kind of ['hp','mp'] as const){
    const state=readyState();
    if(kind==='hp')state.hp=state.maxHp;else state.mp=state.maxMp;
    const action=state.action;
    const result=applyInfiniteTrainingRecovery(state,kind);
    assert.equal(result.ok,false);
    assert.equal(result.reason,'already-full');
    assert.equal(state.action,action);
  }
});

test('recovery is blocked until readiness is full',()=>{
  const state=readyState();
  state.action=state.actionMax-1;
  const result=applyInfiniteTrainingRecovery(state,'hp');
  assert.equal(result.ok,false);
  assert.equal(result.reason,'not-ready');
  assert.equal(state.hp,100);
});
