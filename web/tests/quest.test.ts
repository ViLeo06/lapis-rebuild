import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialQuestState,advanceGuide,validateQuestState,guideStageLabel} from '../src/quest.ts';
import {validateSave} from '../src/save.ts';

test('guide quest progresses 0000 -> 0001 -> 0000 -> complete',()=>{
  let q=initialQuestState();
  const a=advanceGuide(q,0);assert.equal(a.state.guide,'city_visit');assert.equal(a.transitionMapId,1);assert.equal(a.advanced,true);
  const b=advanceGuide(a.state,1);assert.equal(b.state.guide,'return_training');assert.equal(b.transitionMapId,0);
  const c=advanceGuide(b.state,0);assert.equal(c.state.guide,'complete');assert.equal(c.transitionMapId,null);
  const d=advanceGuide(c.state,0);assert.equal(d.state.guide,'complete');assert.equal(d.advanced,false);
});

test('wrong map does not mutate quest state',()=>{
  const q=initialQuestState(),r=advanceGuide(q,1);assert.deepEqual(r.state,q);assert.equal(r.transitionMapId,null);assert.equal(r.advanced,false);
});

test('quest validation rejects unknown stages',()=>{
  assert.throws(()=>validateQuestState({guide:'hacked'}));assert.deepEqual(validateQuestState(undefined),initialQuestState());assert.equal(guideStageLabel('complete'),'已完成');
});

test('old save migrates missing quest state without changing version',()=>{
  const raw={version:1,pack:'p',character:'100',mapId:0,x:32,y:32,gold:0,savedAt:'2026-09-15T00:00:00Z'};
  const save=validateSave(raw,'p',['100'],100,100);assert.deepEqual(save.quest,initialQuestState());assert.equal(save.version,1);assert.equal('quest' in raw,false);
});

test('invalid saved quest is rejected',()=>{
  const raw={version:1,pack:'p',character:'100',mapId:0,x:32,y:32,gold:0,savedAt:'2026-09-15T00:00:00Z',quest:{guide:'invalid'}};
  assert.throws(()=>validateSave(raw,'p',['100'],100,100));
});
