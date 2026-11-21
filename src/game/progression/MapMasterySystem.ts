import { HabitatId, MapInstanceState, SaveGameState } from '../core/types';
import { HABITAT_BY_ID } from '../data/habitatCatalog';
import { getUnlockedRetroactiveExpansionTier } from './MilestoneSystem';

export const MAX_MAP_MASTERY_LEVEL = 20;

export interface MapMasteryBonuses {
  level: number;
  extraFishSlots: number;
  extraSpaceUnits: number;
  foodCapacityBonusPct: number;
  autoFeederEfficiencyPct: number;
  rareVariantBonusPct: number;
  incomeBonusPct: number;
}

/**
 * Long-Term Map Mastery (Levels 1..20, NO RESET!)
 * Rewards returning to earlier maps like Little Pond to optimize and expand them.
 */
export function getMapMasteryBonuses(mapState: MapInstanceState): MapMasteryBonuses {
  const level = Math.max(1, Math.min(MAX_MAP_MASTERY_LEVEL, mapState.masteryLevel ?? 1));
  const steps = level - 1;
  return {
    level,
    extraFishSlots: steps * 2, // Up to +38 extra fish slots!
    extraSpaceUnits: steps * 1.5, // Up to +28.5 extra tank space!
    foodCapacityBonusPct: steps * 6,
    autoFeederEfficiencyPct: steps * 2,
    rareVariantBonusPct: steps * 1.5,
    incomeBonusPct: steps * 8,
  };
}

export function getMapMasteryUpgradeCost(
  currentLevel: number,
  habitatId: HabitatId
): { coins: number; tokens: number } {
  const hab = HABITAT_BY_ID[habitatId] ?? HABITAT_BY_ID.pond;
  const mapScale = Math.pow(Math.max(1, hab.incomeMultiplier), 0.8);
  return {
    coins: Math.round(450 * mapScale * Math.pow(1.48, Math.max(0, currentLevel - 1))),
    tokens: Math.max(1, Math.round(1 + currentLevel * 1.2)),
  };
}

/**
 * Retroactive Map Expansion Tier (0 -> 1 -> 2):
 * Lifts per-map maximum fish ceiling (50 -> 75 -> 100) + grants bonus space & fish slots.
 */
export function getMapExpansionBonus(mapState: MapInstanceState): {
  tier: number;
  maxFishCeiling: number;
  bonusFishSlots: number;
  bonusSpace: number;
} {
  const tier = Math.max(0, Math.min(2, mapState.expansionTier ?? 0));
  if (tier >= 2) {
    return { tier: 2, maxFishCeiling: 100, bonusFishSlots: 16, bonusSpace: 22 };
  }
  if (tier === 1) {
    return { tier: 1, maxFishCeiling: 75, bonusFishSlots: 8, bonusSpace: 10 };
  }
  return { tier: 0, maxFishCeiling: 50, bonusFishSlots: 0, bonusSpace: 0 };
}

export function getMapExpansionCost(
  nextTier: number,
  habitatId: HabitatId
): { coins: number; tokens: number } {
  const hab = HABITAT_BY_ID[habitatId] ?? HABITAT_BY_ID.pond;
  const mapScale = Math.pow(Math.max(1, hab.incomeMultiplier), 0.78);
  if (nextTier === 1) {
    return { coins: Math.round(2500 * mapScale), tokens: 6 };
  }
  return { coins: Math.round(18000 * mapScale), tokens: 16 };
}

export function canUnlockNextMapExpansion(
  state: SaveGameState,
  habitatId: HabitatId
): { available: boolean; unlockedByProgress: boolean; nextTier: number; cost: { coins: number; tokens: number } } {
  const mapState = state.mapStates[habitatId];
  const currentTier = mapState?.expansionTier ?? 0;
  const nextTier = currentTier + 1;
  const cost = getMapExpansionCost(nextTier, habitatId);
  if (currentTier >= 2) {
    return { available: false, unlockedByProgress: false, nextTier: 2, cost };
  }
  const unlockedTier = getUnlockedRetroactiveExpansionTier(state, habitatId);
  return {
    available: unlockedTier >= nextTier,
    unlockedByProgress: unlockedTier >= nextTier,
    nextTier,
    cost,
  };
}
