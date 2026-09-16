import{test}from'node:test';
import assert from'node:assert/strict';
import{bgmPath,selectZoneBgm}from'../src/audio-runtime.ts';
import{TRAINING_VISUAL_POLICY}from'../src/visual-policy.ts';
import{RETAIL_ABILITY_FIELDS,RETAIL_ITEM_FIELDS,RETAIL_COMBAT_FIELD_EVIDENCE,RETAIL_DAMAGE_FORMULA_STATUS}from'../src/retail-combat-fields.ts';

test('zone BGM normal metadata and fallback paths match recovered selector',()=>{
 const authored=selectZoneBgm(100,12);assert.equal(authored.trackId,12);assert.equal(authored.path,'Sound/NDS-8012.mid');assert.equal(authored.source,'metadata');
 const fallback=selectZoneBgm(100,-1);assert.equal(fallback.trackId,5);assert.equal(fallback.path,bgmPath(5));assert.equal(fallback.source,'fallback');
});

test('special BGM zones refuse to guess without live mode',()=>{
 const unresolved=selectZoneBgm(1010,3);assert.equal(unresolved.trackId,null);assert.equal(unresolved.source,'awaiting-live-mode');
 const resolved=selectZoneBgm(1010,3,8);assert.equal(resolved.trackId,8);assert.equal(resolved.source,'special-live-mode');
 const zone2600=selectZoneBgm(2600,6);assert.equal(zone2600.trackId,6);assert.equal(zone2600.specialSidePath,true);
});

test('unrecovered visual choices remain replaceable reconstruction policy',()=>{
 assert.equal(TRAINING_VISUAL_POLICY.provenance,'RECONSTRUCTION_POLICY');
 assert.equal(TRAINING_VISUAL_POLICY.foregroundOcclusion,'disabled-until-recovered');
 assert.deepEqual(TRAINING_VISUAL_POLICY.effectOrigin({x:1,y:2},{x:7,y:8},false),{x:7,y:8});
 assert.deepEqual(TRAINING_VISUAL_POLICY.effectOrigin({x:1,y:2},{x:7,y:8},true),{x:1,y:2});
 assert.equal(TRAINING_VISUAL_POLICY.terminalPlayerAlpha('lost'),.3);
});

test('authored retail combat fields are data definitions, not a recovered formula',()=>{
 assert.equal(RETAIL_ABILITY_FIELDS.hit,18);assert.equal(RETAIL_ABILITY_FIELDS.hitReactionCry,25);assert.equal(RETAIL_ABILITY_FIELDS.defence,37);
 assert.equal(RETAIL_ITEM_FIELDS.minimumDamage,21);assert.equal(RETAIL_ITEM_FIELDS.criticalRate,33);
 assert.equal(RETAIL_COMBAT_FIELD_EVIDENCE,'VERIFIED_AUTHORED_FIELDS_FORMULA_UNKNOWN');assert.equal(RETAIL_DAMAGE_FORMULA_STATUS,'NOT_RECOVERED');
});
