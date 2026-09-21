import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  M7_INFINITE_TRAINING_RECOVERY_POLICY,
  M7_PROMOTION_LEVELS,
  M7_STAGE_IDS,
  M7_STAGE_RANGES,
  M7_SWORDSMAN_SKILL_IDS,
  M7_TRAINING_RECOMMENDED_LEVELS,
  M7_WIZARD_SKILL_IDS,
  isM7PromotionLevel,
  resolveM7StageId,
  resolveM7StageIndex,
} from '../src/m7-integration-contract.ts';

type Contract={
  owner:string;
  baseline:string;
  stage_axis:{promotion_levels:number[];swordsman_stage_ids:number[];wizard_stage_ids:number[]};
  skills:{swordsman:Array<number|string>;wizard:Array<number|string>;levels_per_skill:number};
  training:{battle_count:number;recommended_levels:number[];enemy_scaling:string;required_archetypes:string[]};
  recovery:{policy_id:string;provenance:string;hp_amount:number;mp_amount:number;readiness_cost_candidate:number;infinite:boolean};
  upstream_handoffs:Array<{session:string;branch:string;status:string;pr:number|null;source_sha:string|null}>;
  evidence_levels:string[];
  final_gate:{standalone_html_required:boolean;sha256_required:boolean;exact_source_commit_required:boolean;user_playtest_required_before_merge:boolean};
};
const contract=JSON.parse(readFileSync(new URL('../../manifests/m7-integration-acceptance-contract.json',import.meta.url),'utf8')) as Contract;

test('S34 M7 level axis uses the approved 1-5 then ten-level cadence',()=>{
  assert.deepEqual(M7_STAGE_RANGES.map(row=>[row.minLevel,row.maxLevel]),[[1,5],[6,15],[16,25],[26,35],[36,45],[46,55],[56,65]]);
  assert.deepEqual([...M7_PROMOTION_LEVELS],[6,16,26,36,46,56]);
  for(const level of M7_PROMOTION_LEVELS)assert.equal(isM7PromotionLevel(level),true);
  assert.equal(resolveM7StageIndex(1),0);
  assert.equal(resolveM7StageIndex(5),0);
  assert.equal(resolveM7StageIndex(6),1);
  assert.equal(resolveM7StageIndex(16),2);
  assert.equal(resolveM7StageIndex(56),6);
  assert.equal(resolveM7StageIndex(65),6);
  assert.throws(()=>resolveM7StageIndex(0));
  assert.throws(()=>resolveM7StageIndex(66));
});

test('S34 stage resolver maps both professions without changing authored stage IDs',()=>{
  assert.deepEqual([...M7_STAGE_IDS.swordsman],[100,110,120,130,140,150,160]);
  assert.deepEqual([...M7_STAGE_IDS.wizard],[109,119,129,139,149,159,169]);
  assert.equal(resolveM7StageId('swordsman',1),100);
  assert.equal(resolveM7StageId('swordsman',6),110);
  assert.equal(resolveM7StageId('swordsman',56),160);
  assert.equal(resolveM7StageId('wizard',1),109);
  assert.equal(resolveM7StageId('wizard',26),139);
  assert.equal(resolveM7StageId('wizard',65),169);
});

test('S34 contract locks seven skills with six levels for each profession',()=>{
  assert.equal(M7_SWORDSMAN_SKILL_IDS.length,7);
  assert.equal(M7_WIZARD_SKILL_IDS.length,7);
  assert.equal(new Set(M7_SWORDSMAN_SKILL_IDS).size,7);
  assert.equal(new Set(M7_WIZARD_SKILL_IDS).size,7);
  assert.equal(contract.skills.levels_per_skill,6);
  assert.deepEqual(contract.skills.swordsman,[...M7_SWORDSMAN_SKILL_IDS]);
  assert.deepEqual(contract.skills.wizard,[...M7_WIZARD_SKILL_IDS]);
});

test('S34 contract locks all 15 training battle boundaries and forbids enemy auto scaling',()=>{
  assert.equal(contract.training.battle_count,15);
  assert.deepEqual([...M7_TRAINING_RECOMMENDED_LEVELS],[2,5,6,10,15,16,25,26,35,36,45,46,55,56,65]);
  assert.deepEqual(contract.training.recommended_levels,[...M7_TRAINING_RECOMMENDED_LEVELS]);
  assert.equal(contract.training.enemy_scaling,'forbidden');
  for(const archetype of ['melee','ranged','tank','fast','magic','dot','healer','elite','boss']){
    assert.ok(contract.training.required_archetypes.includes(archetype),`missing required archetype ${archetype}`);
  }
});

test('S34 recovery remains an explicit reconstruction policy',()=>{
  assert.equal(M7_INFINITE_TRAINING_RECOVERY_POLICY.id,'M7InfiniteTrainingRecoveryPolicy');
  assert.equal(M7_INFINITE_TRAINING_RECOVERY_POLICY.provenance,'RECONSTRUCTION_POLICY');
  assert.equal(M7_INFINITE_TRAINING_RECOVERY_POLICY.hpAmount,200);
  assert.equal(M7_INFINITE_TRAINING_RECOVERY_POLICY.mpAmount,200);
  assert.equal(M7_INFINITE_TRAINING_RECOVERY_POLICY.readinessCostCandidate,10);
  assert.equal(contract.recovery.infinite,true);
});

test('S34 contract records exact upstream integration state without fabricating S32 completion',()=>{
  assert.equal(contract.owner,'S34');
  assert.equal(contract.baseline,'1d592d0e2194567c5d7d863e6a48250407dabeb3');
  assert.deepEqual(contract.upstream_handoffs.map(row=>row.session),['S30','S31','S32','S33']);
  assert.deepEqual(contract.upstream_handoffs.map(row=>row.status),['integrated','integrated','pending','integrated']);
  assert.equal(contract.upstream_handoffs[0]?.source_sha,'e26e68c9b28d98f4311490741a136723a2b064f2');
  assert.equal(contract.upstream_handoffs[1]?.source_sha,'911872bbc3b035090890c104c1e8884789b8e728');
  assert.equal(contract.upstream_handoffs[2]?.source_sha,null);
  assert.equal(contract.upstream_handoffs[3]?.source_sha,'185f52abeeecd7687d1a6c00989955dd8530f9ab');
  assert.deepEqual(contract.evidence_levels,[
    'VERIFIED','VERIFIED-STATIC-ORIGINAL','VERIFIED-HISTORICAL','RECOVERED_SECONDARY',
    'INFERRED','SERVER-BOUNDARY','RECONSTRUCTION_POLICY','UNVERIFIED',
  ]);
  assert.equal(contract.final_gate.user_playtest_required_before_merge,true);
});
