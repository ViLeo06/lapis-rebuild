import {validateSaveV2} from '../progression/save-schema.ts';
import type {SaveV2,SaveValidationContext} from '../progression/save-schema.ts';
import {WIZARD_STAGE_IDS,validateWizardProgressionState} from './wizard-ten-stage.ts';
import type {WizardProgressionState} from './wizard-ten-stage.ts';

export const WIZARD_SAVE_STAGE_IDS=Object.freeze(WIZARD_STAGE_IDS.map(stageId=>String(stageId)));

export function withWizardSaveStages(context:SaveValidationContext):SaveValidationContext{
  return{...context,characters:Object.freeze([...new Set([...context.characters,...WIZARD_SAVE_STAGE_IDS])])};
}

export function applyWizardStateToSaveV2(
  save:SaveV2,
  state:WizardProgressionState,
  context:SaveValidationContext,
):SaveV2{
  const validatedState=validateWizardProgressionState(state);
  return validateSaveV2({
    ...save,
    character:String(validatedState.stageId),
    progression:validatedState.progression,
    inventory:validatedState.inventory,
  },withWizardSaveStages(context));
}

export function restoreWizardStateFromSaveV2(
  save:SaveV2,
  context:SaveValidationContext,
):WizardProgressionState{
  const validatedSave=validateSaveV2(save,withWizardSaveStages(context));
  return validateWizardProgressionState({
    family:'wizard',
    stageId:Number(validatedSave.character),
    progression:validatedSave.progression,
    inventory:validatedSave.inventory,
  });
}
