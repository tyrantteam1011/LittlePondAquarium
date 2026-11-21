import {
  AutoFeederUpgradeId,
  HabitatId,
  MapInstanceState,
  PlacedFish,
  SaveGameState,
} from '../core/types';
import { HABITAT_BY_ID } from '../data/habitatCatalog';
import { AUTO_FEEDER_TREE_BY_ID } from '../data/feedingCatalog';
import { FISH_BY_ID } from '../data/fishCatalog';
import { getFishFoodRequirement } from './HungerSystem';

export const MAX_AUTO_FEEDER_LEVEL = 12;

export interface AutoFeederStats {
  enabled: boolean;
  level: number;
  intervalSec: number;
  targetHungerCeiling: number; // Auto feeder maintains 55..88% (never exceeds manual 100% + bonus)
  restorePerPulse: number;
  maxTargetsPerPulse: number;
  foodEfficiencyMult: number; // Lower is better
  smartRescueBonus: number;
  offlineNutritionPct: number;
}

export function getAutoFeederLevelCost(
  currentLevel: number,
  habitatId: HabitatId
): { coins: number; tokens: number } {
  const hab = HABITAT_BY_ID[habitatId] ?? HABITAT_BY_ID.pond;
  const mapScale = Math.pow(Math.max(1, hab.incomeMultiplier), 0.78);
  if (currentLevel === 0) {
    return {
      coins: Math.round(280 * mapScale),
      tokens: 0,
    };
  }
  return {
    coins: Math.round(320 * mapScale * Math.pow(1.62, currentLevel)),
    tokens: Math.min(12, Math.floor(currentLevel / 2)),
  };
}

export function getAutoFeederTreeCost(
  upgradeId: AutoFeederUpgradeId,
  currentLevel: number,
  habitatId: HabitatId
): { coins: number; tokens: number } {
  const def = AUTO_FEEDER_TREE_BY_ID[upgradeId];
  const hab = HABITAT_BY_ID[habitatId] ?? HABITAT_BY_ID.pond;
  const mapScale = Math.pow(Math.max(1, hab.incomeMultiplier), 0.76);
  return {
    coins: Math.round(def.baseCost * mapScale * Math.pow(def.growthFactor, currentLevel)),
    tokens: Math.round(def.tokenCost * (1 + currentLevel * 0.6)),
  };
}

export function getAutoFeederStats(mapState: MapInstanceState): AutoFeederStats {
  const level = mapState.autoFeederLevel ?? 0;
  if (level <= 0) {
    return {
      enabled: false,
      level: 0,
      intervalSec: 60,
      targetHungerCeiling: 0,
      restorePerPulse: 0,
      maxTargetsPerPulse: 0,
      foodEfficiencyMult: 1,
      smartRescueBonus: 0,
      offlineNutritionPct: 0,
    };
  }

  const tree = mapState.autoFeederUpgrades;
  const speedLv = tree.feeding_speed ?? 0;
  const capLv = tree.feeding_capacity ?? 0;
  const effLv = tree.feeding_efficiency ?? 0;
  const rangeLv = tree.feeding_range ?? 0;
  const smartLv = tree.smart_targeting ?? 0;
  const advLv = tree.advanced_feeder ?? 0;
  const aiLv = tree.ai_feeder ?? 0;
  const masteryBonus = Math.max(0, (mapState.masteryLevel ?? 1) - 1) * 0.02;

  // Base interval: Lv1 = 60s, Lv2 = 45s, Lv3 = 32s, Lv4 = 22s, Lv5 = 15s, Lv6..12 = 14..8s
  const baseIntervalCurve = [60, 60, 45, 32, 22, 15, 14, 13, 12, 11, 10, 9, 8];
  const rawInterval = baseIntervalCurve[Math.min(level, baseIntervalCurve.length - 1)] ?? 8;
  const intervalSec = Math.max(4, Math.round(rawInterval * Math.pow(0.9, speedLv)));

  // Target hunger ceiling: Lv1 = 58% -> Lv5 = 74% -> Lv10+ = 86% (capped at 90% so manual 100% stays optimal!)
  const baseCeiling = Math.min(84, 54 + level * 3.2);
  const targetHungerCeiling = Math.min(90, Math.round(baseCeiling + advLv * 4));

  const restorePerPulse = Math.round((16 + level * 2.5) * (1 + capLv * 0.2));
  const maxTargetsPerPulse = 2 + Math.floor(level * 0.8) + rangeLv * 2;
  const foodEfficiencyMult = Math.max(0.42, 1 - effLv * 0.06 - masteryBonus);
  const smartRescueBonus = smartLv * 0.12;
  const offlineNutritionPct = Math.min(95, 45 + level * 4 + aiLv * 8);

  return {
    enabled: true,
    level,
    intervalSec,
    targetHungerCeiling,
    restorePerPulse,
    maxTargetsPerPulse,
    foodEfficiencyMult,
    smartRescueBonus,
    offlineNutritionPct,
  };
}

export interface AutoFeedExecutionResult {
  triggered: boolean;
  fedCount: number;
  foodUsed: number;
}

/**
 * Runs the per-map Auto Feeder if its interval has elapsed.
 * Smart priority order: Critical -> Starving -> Very Hungry -> Hungry.
 * Zero food waste when all fish are already above targetHungerCeiling!
 */
export function runAutoFeederTick(
  state: SaveGameState,
  habitatId: HabitatId,
  nowMs: number,
  globalFoodEfficiencyPct = 0
): AutoFeedExecutionResult {
  const mapState = state.mapStates[habitatId];
  if (!mapState) return { triggered: false, fedCount: 0, foodUsed: 0 };

  const stats = getAutoFeederStats(mapState);
  if (!stats.enabled) return { triggered: false, fedCount: 0, foodUsed: 0 };

  const lastRun = mapState.autoFeederLastRunMs || 0;
  if (nowMs - lastRun < stats.intervalSec * 1000) {
    return { triggered: false, fedCount: 0, foodUsed: 0 };
  }

  // Filter fish in this map that actually need food below targetHungerCeiling
  const hungryFish: PlacedFish[] = state.placedFish
    .filter(
      (f) => f.habitatId === habitatId && (f.hunger ?? 90) < stats.targetHungerCeiling
    )
    .sort((a, b) => (a.hunger ?? 90) - (b.hunger ?? 90));

  // Do not waste food when all fish are healthy!
  if (hungryFish.length === 0) {
    mapState.autoFeederLastRunMs = nowMs;
    return { triggered: false, fedCount: 0, foodUsed: 0 };
  }

  if (mapState.foodStored < 0.5) {
    return { triggered: false, fedCount: 0, foodUsed: 0 };
  }

  const targets = hungryFish.slice(0, stats.maxTargetsPerPulse);
  const globalEff = Math.max(0.55, 1 - globalFoodEfficiencyPct / 100);
  let fedCount = 0;
  let foodUsed = 0;
  const aiGrowthSec = (mapState.autoFeederUpgrades.ai_feeder ?? 0) * 1.5;

  for (const fish of targets) {
    const fd = FISH_BY_ID[fish.fishId];
    if (!fd) continue;
    const baseReq = getFishFoodRequirement(fd);
    const mealCost = Math.max(0.5, baseReq * 0.55 * stats.foodEfficiencyMult * globalEff);
    if (mapState.foodStored < mealCost) break;

    mapState.foodStored = Math.max(0, mapState.foodStored - mealCost);
    foodUsed += mealCost;
    fedCount += 1;

    const isEmergency = (fish.hunger ?? 90) < 25;
    const rescueBoost = isEmergency ? 1 + stats.smartRescueBonus : 1;
    const gain = stats.restorePerPulse * rescueBoost;
    fish.hunger = Math.min(stats.targetHungerCeiling + 4, (fish.hunger ?? 90) + gain);
    fish.starvationSec = 0;
    fish.health = Math.min(100, fish.health + (isEmergency ? 6 : 2));
    if (aiGrowthSec > 0) {
      fish.ageSec += aiGrowthSec;
    }
  }

  if (fedCount > 0) {
    mapState.autoFeederLastRunMs = nowMs;
    state.stats.autoFeedsTriggered = (state.stats.autoFeedsTriggered ?? 0) + 1;
    return {
      triggered: true,
      fedCount,
      foodUsed: Math.round(foodUsed * 10) / 10,
    };
  }

  return { triggered: false, fedCount: 0, foodUsed: 0 };
}
