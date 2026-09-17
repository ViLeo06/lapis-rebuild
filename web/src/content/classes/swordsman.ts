import classRows from '../../../../data/classes/swordsman.json' with { type: 'json' };
import type {PlayableClassDefinition} from '../content-types.ts';
import {SWORDSMAN_SHOWCASE_SKILL_IDS} from '../skills/skill-catalog.ts';
import {buildPlayableClass} from './class-helpers.ts';

const row=classRows.find(candidate=>candidate.class_id===100);
if(!row)throw new Error('Missing authored swordsman class 100');

export const SWORDSMAN:PlayableClassDefinition=buildPlayableClass(row,'swordsman',SWORDSMAN_SHOWCASE_SKILL_IDS);
