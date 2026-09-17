import{test}from'node:test';
import assert from'node:assert/strict';
import{buildAttackTimeline,buildAuthoritativeHitFeedback}from'../src/presentation/attack-timeline.ts';
import{RECONSTRUCTION_DEATH_PRESENTATION}from'../src/presentation/death-policy.ts';
import{RECONSTRUCTION_MAGIC_EFFECT_PLACEMENT}from'../src/presentation/magic-effect-policy.ts';
import{BattleAudioRouter,magicSfxPath}from'../src/presentation/audio-router.ts';
import{BattlePresentation}from'../src/presentation/battle-presentation.ts';

test('attack timeline consumes recovered ANI cadence without pretending impact frame is recovered',()=>{
  const timeline=buildAttackTimeline({rawTiming:10,frameCount:5});
  assert.equal(timeline.frameIntervalMs,100);
  assert.equal(timeline.durationMs,500);
  assert.equal(timeline.impactFrame,2);
  assert.equal(timeline.impactProvenance,'RECONSTRUCTION_POLICY');
  assert.deepEqual(timeline.cues.map(c=>c.phase),[
    'attacker-start','impact','defender-hit-reaction','damage-display','recovery','action-end'
  ]);
  const predictedHit=timeline.cues.find(c=>c.phase==='defender-hit-reaction')!;
  assert.equal(predictedHit.actionState,3);
  assert.equal(predictedHit.actionStateProvenance,'VERIFIED');
  assert.equal(predictedHit.provenance,'RECONSTRUCTION_POLICY');
});

test('authoritative HP loss promotes _03 hit reaction but not floating damage UI',()=>{
  const hit=buildAuthoritativeHitFeedback({targetId:'enemy-1',amount:12,resultingHp:44});
  assert.equal(hit.trigger,'authoritative-hp-loss');
  assert.equal(hit.cues[0].phase,'defender-hit-reaction');
  assert.equal(hit.cues[0].provenance,'VERIFIED');
  assert.equal(hit.cues[0].actionState,3);
  assert.equal(hit.cues[1].phase,'damage-display');
  assert.equal(hit.cues[1].provenance,'RECONSTRUCTION_POLICY');
});

test('death policy never claims _05 and remains explicit reconstruction',()=>{
  const enemy=RECONSTRUCTION_DEATH_PRESENTATION.plan('enemy');
  assert.equal(enemy.provenance,'RECONSTRUCTION_POLICY');
  assert.deepEqual(enemy.cues.map(c=>c.kind),['freeze','fade','terminal-hold','remove']);
  assert.equal(enemy.cues.some(c=>c.note.includes('_05')),false);
  const player=RECONSTRUCTION_DEATH_PRESENTATION.plan('player');
  assert.equal(player.cues.at(-1)?.alpha,0.3);
  assert.equal(player.cues.some(c=>c.kind==='remove'),false);
});

test('MagicRes policy keeps FOCUS row and raw stage tick while using replaceable sequential placement',()=>{
  const plan=RECONSTRUCTION_MAGIC_EFFECT_PLACEMENT.plan([
    {resourceId:1,rawTiming:30,frameCount:3,role:'target',rawStartTick:7,focusRow:5},
    {resourceId:2,rawTiming:40,frameCount:2,role:'caster',rawStartTick:11,focusRow:1},
  ],{caster:{x:10,y:20},target:{x:30,y:40}});
  assert.equal(plan.provenance,'RECONSTRUCTION_POLICY');
  assert.equal(plan.stages[0].attachment,'target');
  assert.deepEqual(plan.stages[0].origin,{x:30,y:40});
  assert.equal(plan.stages[0].focusRow,5);
  assert.equal(plan.stages[0].focusSemantic,'raw-row-unlabelled');
  assert.equal(plan.stages[0].rawStartTick,7);
  assert.equal(plan.stages[0].rawStartTickProvenance,'UNVERIFIED');
  assert.equal(plan.stages[0].startMs,0);
  assert.equal(plan.stages[1].attachment,'caster');
  assert.equal(plan.stages[1].startMs,plan.stages[0].durationMs);
  assert.equal(plan.stages[0].anchorProvenance,'RECONSTRUCTION_POLICY');
  assert.equal(plan.stages[0].blendProvenance,'UNVERIFIED');
});

test('audio router centralizes all battle audio events and fails open evidence gaps as unresolved',()=>{
  const router=new BattleAudioRouter();
  const bgm=router.route({kind:'battle-bgm',zoneId:100,metadataTrackId:12});
  assert.equal(bgm.action,'play');
  assert.equal(bgm.path,'Sound/NDS-8012.mid');
  assert.equal(bgm.bindingProvenance,'VERIFIED');

  const unresolvedBgm=router.route({kind:'battle-bgm',zoneId:100});
  assert.equal(unresolvedBgm.action,'unresolved');
  assert.equal(unresolvedBgm.path,null);

  const hit=router.route({kind:'hit-sfx'});
  assert.equal(hit.path,'Sound/NDS-0030.wav');
  assert.equal(hit.resourceProvenance,'VERIFIED');
  assert.equal(hit.bindingProvenance,'RECONSTRUCTION_POLICY');

  const attack=router.route({kind:'attack-sfx'});
  const death=router.route({kind:'death-sfx'});
  const victory=router.route({kind:'victory'});
  assert.equal(attack.action,'unresolved');
  assert.equal(death.action,'unresolved');
  assert.equal(victory.action,'unresolved');

  const magic=router.route({kind:'magic-sfx',magicSoundId:4});
  assert.equal(magic.path,magicSfxPath(4));
  assert.equal(magic.resourceProvenance,'VERIFIED');
  assert.equal(magic.bindingProvenance,'RECONSTRUCTION_POLICY');
});

test('battle presentation exposes battle start, move, attack, hit, magic, death, victory and defeat without mutating combat rules',()=>{
  const p=new BattlePresentation();
  assert.equal(p.battleStart({zoneId:100,metadataTrackId:5}).kind,'battle-start');
  assert.equal(p.move({durationMs:240}).kind,'move');
  assert.equal(p.selection('dummy-melee').visual[0].kind,'target-selected');
  assert.equal(p.attack({rawTiming:10,frameCount:5}).kind,'attack');
  const hit=p.hit({targetId:'dummy-melee',amount:10,resultingHp:46,maxHp:56});
  assert.equal(hit.visual.some(c=>c.kind==='hp-bar-tween'),true);
  assert.equal(hit.visual.some(c=>c.kind==='camera-nudge'),true);
  assert.equal(p.magicEffect({resources:[{resourceId:1,rawTiming:30,frameCount:3}],context:{caster:{x:0,y:0},target:{x:10,y:10}}}).kind,'magic');
  assert.equal(p.deathOf('enemy','dummy-melee').kind,'death');
  assert.equal(p.terminal('won').kind,'victory');
  assert.equal(p.terminal('lost').kind,'defeat');
});
