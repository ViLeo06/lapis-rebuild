import test from 'node:test';
import assert from 'node:assert/strict';
import {integratedPromotionRuleForCharacter,M7_FRONT_SEVEN_PROMOTION_POLICY} from '../src/training/m7-promotion-policy.ts';

test('S34 front-seven promotion policy uses 6/16/26/36/46/56 for swordsman',()=>{
  const ids=[100,110,120,130,140,150];
  assert.deepEqual(ids.map(id=>integratedPromotionRuleForCharacter(id)?.minimumLevel),[6,16,26,36,46,56]);
  assert.deepEqual(ids.map(id=>integratedPromotionRuleForCharacter(id)?.toStageId),[110,120,130,140,150,160]);
});

test('S34 front-seven promotion policy uses 6/16/26/36/46/56 for wizard',()=>{
  const ids=[109,119,129,139,149,159];
  assert.deepEqual(ids.map(id=>integratedPromotionRuleForCharacter(id)?.minimumLevel),[6,16,26,36,46,56]);
  assert.deepEqual(ids.map(id=>integratedPromotionRuleForCharacter(id)?.toStageId),[119,129,139,149,159,169]);
});

test('stage seven delegates to the existing M6 ten-stage continuation',()=>{
  const swordsman=integratedPromotionRuleForCharacter(160);
  const wizard=integratedPromotionRuleForCharacter(169);
  assert.equal(swordsman?.toStageId,170);
  assert.equal(wizard?.toStageId,179);
  assert.ok((swordsman?.minimumLevel??0)>56);
  assert.ok((wizard?.minimumLevel??0)>56);
  assert.equal(M7_FRONT_SEVEN_PROMOTION_POLICY.provenance,'RECONSTRUCTION_POLICY');
});
