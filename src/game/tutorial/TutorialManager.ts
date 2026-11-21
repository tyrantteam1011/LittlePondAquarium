import { TUTORIAL_STEPS, getTutorialStepByIndex } from './tutorialCatalog';
import {
  ContextualHintId,
  TutorialEventType,
  TutorialSaveData,
  TutorialStepData,
  TutorialStepId,
} from './types';

export function createDefaultTutorialSave(): TutorialSaveData {
  return {
    tutorialStarted: false,
    tutorialCompleted: false,
    currentStepIndex: 0,
    completedStepIds: [],
    skippedTutorial: false,
    contextualHintsShown: [],
    pendingFishToPlaceId: null,
  };
}

export function sanitizeTutorialSave(
  raw: Partial<TutorialSaveData> | undefined,
  legacyStep?: number
): TutorialSaveData {
  const defaults = createDefaultTutorialSave();
  if (!raw) {
    // Returning players who already finished the legacy v1/v2 8-step banner shouldn't be forced back to step 0
    if (typeof legacyStep === 'number' && legacyStep >= 8) {
      return {
        ...defaults,
        tutorialStarted: true,
        tutorialCompleted: true,
        currentStepIndex: TUTORIAL_STEPS.length,
      };
    }
    return defaults;
  }

  const completed = Boolean(raw.tutorialCompleted);
  const maxIdx = TUTORIAL_STEPS.length;
  const idx = Number.isFinite(raw.currentStepIndex)
    ? Math.max(0, Math.min(maxIdx, Math.floor(Number(raw.currentStepIndex))))
    : 0;

  return {
    tutorialStarted: Boolean(raw.tutorialStarted) || idx > 0 || completed,
    tutorialCompleted: completed || idx >= maxIdx,
    currentStepIndex: completed ? maxIdx : idx,
    completedStepIds: Array.isArray(raw.completedStepIds)
      ? (Array.from(new Set(raw.completedStepIds)) as TutorialStepId[])
      : [],
    skippedTutorial: Boolean(raw.skippedTutorial),
    contextualHintsShown: Array.isArray(raw.contextualHintsShown)
      ? (Array.from(new Set(raw.contextualHintsShown)) as ContextualHintId[])
      : [],
    pendingFishToPlaceId: typeof raw.pendingFishToPlaceId === 'string' ? raw.pendingFishToPlaceId : null,
  };
}

export function getActiveTutorialStep(
  tutorial: TutorialSaveData,
  showTutorialSetting: boolean
): TutorialStepData | null {
  if (!showTutorialSetting || tutorial.tutorialCompleted) return null;
  return getTutorialStepByIndex(tutorial.currentStepIndex);
}

export function doesEventCompleteStep(
  step: TutorialStepData | null,
  event: TutorialEventType
): boolean {
  if (!step) return false;
  if (step.requiredEvent === event) return true;
  // Allow continue button on inspect_aquarium / world_map so the player is never trapped
  if (
    event === 'continue_clicked' &&
    (step.stepId === 'inspect_aquarium' ||
      step.stepId === 'world_map' ||
      step.stepId === 'watch_fish')
  ) {
    return true;
  }
  return false;
}

export function advanceTutorialState(
  tutorial: TutorialSaveData
): { next: TutorialSaveData; completedStep: TutorialStepData | null; enteredStep: TutorialStepData | null } {
  const current = getTutorialStepByIndex(tutorial.currentStepIndex);
  if (!current) {
    return {
      next: { ...tutorial, tutorialCompleted: true },
      completedStep: null,
      enteredStep: null,
    };
  }

  const nextIndex = tutorial.currentStepIndex + 1;
  const isNowDone = nextIndex >= TUTORIAL_STEPS.length;
  const completedIds = tutorial.completedStepIds.includes(current.stepId)
    ? tutorial.completedStepIds
    : [...tutorial.completedStepIds, current.stepId];

  const next: TutorialSaveData = {
    ...tutorial,
    tutorialStarted: true,
    tutorialCompleted: isNowDone,
    currentStepIndex: nextIndex,
    completedStepIds: completedIds,
    pendingFishToPlaceId: current.stepId === 'place_first_fish' ? null : tutorial.pendingFishToPlaceId,
  };

  return {
    next,
    completedStep: current,
    enteredStep: isNowDone ? null : getTutorialStepByIndex(nextIndex),
  };
}

export function markContextualHintShown(
  tutorial: TutorialSaveData,
  hintId: ContextualHintId
): TutorialSaveData {
  if (tutorial.contextualHintsShown.includes(hintId)) return tutorial;
  return {
    ...tutorial,
    contextualHintsShown: [...tutorial.contextualHintsShown, hintId],
  };
}
