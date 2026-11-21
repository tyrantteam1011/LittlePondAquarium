import { HabitatId, SaveGameState } from '../core/types';
import { HABITAT_CATALOG } from '../data/habitatCatalog';
import {
  GlobalMilestoneBonusKey,
  MILESTONE_CATALOG,
  MilestoneData,
} from '../data/milestoneCatalog';
import { calculateBeautyBreakdown } from '../aquarium/BeautySystem';
import {
  getCompletedMapsCount,
  getTotalDiscoveredSpeciesCount,
} from './EncyclopediaSystem';

export interface GlobalMilestoneBonuses {
  growth_pct: number;
  breeding_pct: number;
  offline_pct: number;
  rare_discovery_pct: number;
  food_efficiency_pct: number;
}

export function getMilestoneProgress(
  state: SaveGameState,
  milestone: MilestoneData
): number {
  switch (milestone.metric) {
    case 'discover_species':
      return getTotalDiscoveredSpeciesCount(state);
    case 'breed_fish':
      return state.stats.fishBredTotal ?? 0;
    case 'aquarium_level':
      return state.aquariumLevel;
    case 'complete_maps':
      return getCompletedMapsCount(state);
    case 'population_born':
      return (state.stats.fishPurchasedTotal ?? 0) + (state.stats.fishBredTotal ?? 0);
    case 'beauty_score': {
      let totalBeauty = 0;
      for (const habId of state.unlockedHabitats) {
        totalBeauty += calculateBeautyBreakdown(state, habId).total;
      }
      return totalBeauty;
    }
    case 'times_fed':
      return (state.stats.timesFed ?? 0) + (state.stats.autoFeedsTriggered ?? 0);
    case 'research_levels':
      return Object.values(state.researchLevels).reduce((sum, lv) => sum + lv, 0);
  }
}

export function isMilestoneClaimable(
  state: SaveGameState,
  milestone: MilestoneData
): boolean {
  if (state.claimedMilestoneIds?.includes(milestone.id)) return false;
  return getMilestoneProgress(state, milestone) >= milestone.target;
}

export function getClaimableMilestonesCount(state: SaveGameState): number {
  return MILESTONE_CATALOG.filter((m) => isMilestoneClaimable(state, m)).length;
}

/**
 * Aggregates moderate permanent Global Milestone Bonuses (never overpowering local upgrades).
 */
export function getGlobalMilestoneBonuses(state: SaveGameState): GlobalMilestoneBonuses {
  const bonuses: GlobalMilestoneBonuses = {
    growth_pct: 0,
    breeding_pct: 0,
    offline_pct: 0,
    rare_discovery_pct: 0,
    food_efficiency_pct: 0,
  };

  const claimed = state.claimedMilestoneIds ?? [];
  for (const ms of MILESTONE_CATALOG) {
    if (!claimed.includes(ms.id)) continue;
    const key = ms.reward.globalBonusKey as GlobalMilestoneBonusKey | undefined;
    const val = ms.reward.globalBonusValue ?? 0;
    if (key && val > 0) {
      bonuses[key] += val;
    }
  }

  return bonuses;
}

/**
 * Checks the highest Retroactive Map Expansion Tier unlocked via claimed milestones for a given map.
 * Allows returning to earlier maps (like Pond) to expand max fish cap 50 -> 75 -> 100!
 */
export function getUnlockedRetroactiveExpansionTier(
  state: SaveGameState,
  habitatId: HabitatId
): number {
  const claimed = state.claimedMilestoneIds ?? [];
  let maxTier = 0;
  for (const ms of MILESTONE_CATALOG) {
    if (!claimed.includes(ms.id)) continue;
    const exp = ms.reward.retroactiveMapExpansion;
    if (exp && exp.habitatId === habitatId) {
      maxTier = Math.max(maxTier, exp.tier);
    }
  }
  // Global Aquarium Level also gently unlocks retroactive expansions on earlier maps
  const hab = HABITAT_CATALOG.find((h) => h.id === habitatId);
  if (hab) {
    if (state.aquariumLevel >= hab.unlockRequirement.aquariumLevel + 10) {
      maxTier = Math.max(maxTier, 1);
    }
    if (state.aquariumLevel >= hab.unlockRequirement.aquariumLevel + 22) {
      maxTier = Math.max(maxTier, 2);
    }
  }
  return maxTier;
}
