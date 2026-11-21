import { ActivePanelId, GeneticVariant } from '../core/types';

export type TutorialStepId =
  | 'welcome'
  | 'inspect_aquarium'
  | 'collect_coin'
  | 'open_fish_shop'
  | 'buy_first_fish'
  | 'place_first_fish'
  | 'watch_fish'
  | 'learn_growth'
  | 'build_school'
  | 'water_quality'
  | 'place_plant'
  | 'place_airstone'
  | 'place_shelter'
  | 'first_feed'
  | 'growth_milestone'
  | 'first_breeding'
  | 'upgrade_aquarium'
  | 'world_map'
  | 'offline_preview'
  | 'first_research'
  | 'tutorial_complete';

export type TutorialTargetId =
  | 'aquarium-center'
  | 'snail-coin'
  | 'nav-fish'
  | 'fish-buy-first'
  | 'nav-decor'
  | 'nav-feed'
  | 'nav-upgrades'
  | 'upgrade-capacity'
  | 'top-world-map'
  | 'nav-research'
  | 'research-water';

export type TutorialEventType =
  | 'start_clicked'
  | 'aquarium_tapped'
  | 'coin_collected'
  | 'panel_fish_opened'
  | 'fish_bought'
  | 'fish_placed'
  | 'school_reached'
  | 'panel_decor_opened'
  | 'plant_placed'
  | 'airstone_placed'
  | 'shelter_placed'
  | 'fish_fed'
  | 'breeding_hatched'
  | 'upgrade_bought'
  | 'panel_map_opened'
  | 'research_bought'
  | 'continue_clicked';

export type ContextualHintId =
  | 'first_breeding'
  | 'water_quality_low'
  | 'glass_algae'
  | 'new_habitat_unlocked';

export interface TutorialReward {
  coins?: number;
  gems?: number;
  rp?: number;
  freeDecorationId?: string;
  exclusiveFish?: { fishId: string; variant: GeneticVariant };
}

export interface TutorialStepData {
  stepId: TutorialStepId;
  phase: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  titleKey: string;
  bodyKey: string;
  targetId?: TutorialTargetId;
  pointerMode: 'tap' | 'drag' | 'point' | 'none';
  requiredEvent: TutorialEventType;
  autoAdvanceDelayMs?: number;
  skippable: boolean;
  optionalPanel?: ActivePanelId;
  visualWidget?:
    | 'none'
    | 'aquarium_info'
    | 'growth_demo'
    | 'school_counter'
    | 'water_demo'
    | 'oxygen_demo'
    | 'shelter_demo'
    | 'growth_milestone'
    | 'breeding_demo'
    | 'map_journey'
    | 'offline_preview'
    | 'master_celebration';
  primaryButtonKey?: string;
  reward?: TutorialReward;
}

export interface TutorialSaveData {
  tutorialStarted: boolean;
  tutorialCompleted: boolean;
  currentStepIndex: number;
  completedStepIds: TutorialStepId[];
  skippedTutorial: boolean;
  contextualHintsShown: ContextualHintId[];
  pendingFishToPlaceId: string | null;
}
