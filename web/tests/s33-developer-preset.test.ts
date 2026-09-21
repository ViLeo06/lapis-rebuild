import test from 'node:test';
import assert from 'node:assert/strict';
import {buildM7DeveloperCharacterPreset,M7DeveloperPresetPolicy} from '../src/training/m7-developer-preset.ts';
import {M7_DEVELOPER_PRESET_LEVELS,resolveM7Stage,resolveM7StageId} from '../src/training/m7-level-axis.ts';
import {renderM7DeveloperPreset} from '../src/ui/m7-training-camp.ts';

test('M7 stage resolver uses 6/16/26/36/46/56 boundaries',()=>{
  const checks=[
    [1,1],[5,1],[6,2],[15,2],[16,3],[25,3],[26,4],[35,4],
    [36,5],[45,5],[46,6],[55,6],[56,7],[65,7],
  ] as const;
  for(const [level,stage] of checks)assert.equal(resolveM7Stage(level).stage,stage);
  assert.deepEqual(M7_DEVELOPER_PRESET_LEVELS,[1,6,16,26,36,46,56,65]);
});

test('developer preset resolves both profession stage ids across seven stages',()=>{
  const levels=[1,6,16,26,36,46,56,65];
  const sword=[100,110,120,130,140,150,160,160];
  const wizard=[109,119,129,139,149,159,169,169];
  assert.deepEqual(levels.map(level=>resolveM7StageId('swordsman',level)),sword);
  assert.deepEqual(levels.map(level=>resolveM7StageId('wizard',level)),wizard);
});

test('developer all-skills override is explicit Lv6 debug state and runtime-only',()=>{
  const preset=buildM7DeveloperCharacterPreset('wizard',6,true);
  assert.equal(preset.stage,2);
  assert.equal(preset.stageId,119);
  assert.equal(preset.skillLevelOverride,6);
  assert.equal(preset.skillPoints,5);
  assert.equal(preset.effectiveSkillIds.length,7);
  assert.deepEqual(preset.legalSkillIds,[19101,19201]);
  assert.ok(preset.effectiveSkillIds.includes('wizard:blindness'));
  assert.ok(preset.effectiveSkillIds.includes('wizard:cursed-sword'));
  assert.equal(M7DeveloperPresetPolicy.persistence.includes('runtime-only'),true);
});

test('developer preset UI exposes level input, profession selection and quick boundaries',()=>{
  const html=renderM7DeveloperPreset('swordsman',36,false);
  assert.match(html,/data-dev-profession/);
  assert.match(html,/data-dev-level-input/);
  assert.match(html,/data-dev-unlock-all/);
  assert.equal((html.match(/data-action="dev-preset-quick"/g)??[]).length,8);
});


test('developer preset normal legality follows all seven M7 stage unlocks',()=>{
  assert.deepEqual(buildM7DeveloperCharacterPreset('swordsman',1,false).legalSkillIds,[1101]);
  assert.deepEqual(buildM7DeveloperCharacterPreset('swordsman',6,false).legalSkillIds,[1101,1201]);
  assert.deepEqual(buildM7DeveloperCharacterPreset('swordsman',56,false).legalSkillIds,[1101,1201,1301,1401,1501,'swordsman:battle-command','swordsman:stun-strike']);
  assert.deepEqual(buildM7DeveloperCharacterPreset('wizard',26,false).legalSkillIds,[19101,19201,19301,19401]);
  assert.equal(buildM7DeveloperCharacterPreset('wizard',56,false).legalSkillIds.length,7);
});
