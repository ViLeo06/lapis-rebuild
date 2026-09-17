import classRows from '../../../../data/classes/wizard.json' with { type: 'json' };
import type {PlayableClassDefinition} from '../content-types.ts';
import {WIZARD_SHOWCASE_SKILL_IDS} from '../skills/skill-catalog.ts';
import {buildPlayableClass} from './class-helpers.ts';

const row=classRows.find(candidate=>candidate.class_id===109);
if(!row)throw new Error('Missing authored wizard class 109');

export const WIZARD:PlayableClassDefinition=buildPlayableClass(row,'wizard',WIZARD_SHOWCASE_SKILL_IDS);
