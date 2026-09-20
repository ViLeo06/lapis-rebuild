import {validateSaveV2} from '../progression/save-schema.ts';
import type {SaveV2, SaveValidationContext} from '../progression/save-schema.ts';
import {
  SWORDSMAN_STAGE_IDS,
  validateSwordsmanProgressionState,
} from './swordsman-ten-stage.ts';
import type {SwordsmanProgressionState} from './swordsman-ten-stage.ts';

export const SWORDSMAN_SAVE_STAGE_IDS = Object.freeze(
  SWORDSMAN_STAGE_IDS.map(stageId => String(stageId)),
);

export function withSwordsmanSaveStages(
  context: SaveValidationContext,
): SaveValidationContext {
  return {
    ...context,
    characters: Object.freeze([
      ...new Set([...context.characters, ...SWORDSMAN_SAVE_STAGE_IDS]),
    ]),
  };
}

export function applySwordsmanStateToSaveV2(
  save: SaveV2,
  state: SwordsmanProgressionState,
  context: SaveValidationContext,
): SaveV2 {
  const validatedState = validateSwordsmanProgressionState(state);
  return validateSaveV2({
    ...save,
    character: String(validatedState.stageId),
    progression: validatedState.progression,
    inventory: validatedState.inventory,
  }, withSwordsmanSaveStages(context));
}

export function restoreSwordsmanStateFromSaveV2(
  save: SaveV2,
  context: SaveValidationContext,
): SwordsmanProgressionState {
  const validatedSave = validateSaveV2(save, withSwordsmanSaveStages(context));
  return validateSwordsmanProgressionState({
    family: 'swordsman',
    stageId: Number(validatedSave.character),
    progression: validatedSave.progression,
    inventory: validatedSave.inventory,
  });
}
