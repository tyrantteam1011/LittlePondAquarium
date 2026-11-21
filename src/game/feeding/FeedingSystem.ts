import { HabitatId, MapInstanceState, SaveGameState } from '../core/types';
import { HABITAT_BY_ID } from '../data/habitatCatalog';
import { MAP_FOOD_DATA, MapFoodData } from '../data/feedingCatalog';
import { FISH_BY_ID } from '../data/fishCatalog';
import { getFishFoodRequirement } from './HungerSystem';

export const MANUAL_FEED_RECHARGE_SEC = 45;
export const MAX_FOOD_STORAGE_LEVEL = 50;
export const MAX_FOOD_FACTORY_LEVEL = 30;

export function getMapFoodInfo(habitatId: HabitatId): MapFoodData {
  return MAP_FOOD_DATA[habitatId] ?? MAP_FOOD_DATA.pond;
}

/**
 * Local Food Storage Capacity Curve (Level 1 = 100 -> Level 50 = 100,000)
 * Plus Map Mastery bonus (+6% per Mastery level above 1).
 */
export function getFoodStorageCapacity(storageLevel: number, masteryLevel = 1): number {
  const lv = Math.max(1, Math.min(MAX_FOOD_STORAGE_LEVEL, storageLevel));
  // Smooth geometric curve: 100 * 1000^((lv-1)/49) -> Lv1: 100, Lv10: 356, Lv25: 2950, Lv50: 100,000
  const base = Math.round(100 * Math.pow(1000, (lv - 1) / 49));
  const masteryMult = 1 + Math.max(0, masteryLevel - 1) * 0.06;
  return Math.round((base * masteryMult) / 5) * 5;
}

export function getFoodStorageUpgradeCost(
  storageLevel: number,
  habitatId: HabitatId
): number {
  const hab = HABITAT_BY_ID[habitatId] ?? HABITAT_BY_ID.pond;
  const mapScale = Math.pow(Math.max(1, hab.incomeMultiplier), 0.72);
  return Math.round(90 * mapScale * Math.pow(1.42, Math.max(0, storageLevel - 1)));
}

/**
 * Local Food Factory Production Rate (Food / minute)
 * Level 1 = 10/min -> Level 30 = 2,000+/min
 */
export function getFoodFactoryRatePerMin(factoryLevel: number, masteryLevel = 1): number {
  const lv = Math.max(1, Math.min(MAX_FOOD_FACTORY_LEVEL, factoryLevel));
  // Smooth geometric curve: 10 * 200^((lv-1)/29) -> Lv1: 10, Lv10: 52, Lv20: 325, Lv30: 2000
  const base = 10 * Math.pow(200, (lv - 1) / 29);
  const masteryMult = 1 + Math.max(0, masteryLevel - 1) * 0.04;
  return Math.round(base * masteryMult * 10) / 10;
}

export function getFoodFactoryUpgradeCost(
  factoryLevel: number,
  habitatId: HabitatId
): number {
  const hab = HABITAT_BY_ID[habitatId] ?? HABITAT_BY_ID.pond;
  const mapScale = Math.pow(Math.max(1, hab.incomeMultiplier), 0.78);
  return Math.round(140 * mapScale * Math.pow(1.52, Math.max(0, factoryLevel - 1)));
}

export function getMaxManualFeedCharges(mapState: MapInstanceState): number {
  return Math.min(10, 5 + Math.floor(Math.max(0, (mapState.masteryLevel ?? 1) - 1) / 4));
}

/**
 * Recharges manual feeding charges over time (1 charge per 45s).
 */
export function syncManualFeedCharges(mapState: MapInstanceState, nowMs: number): void {
  const maxCharges = getMaxManualFeedCharges(mapState);
  if (mapState.manualFeedCharges >= maxCharges) {
    mapState.manualFeedCharges = maxCharges;
    mapState.manualFeedLastRechargeMs = nowMs;
    return;
  }
  const elapsedSec = Math.max(0, (nowMs - (mapState.manualFeedLastRechargeMs || nowMs)) / 1000);
  const gained = Math.floor(elapsedSec / MANUAL_FEED_RECHARGE_SEC);
  if (gained > 0) {
    mapState.manualFeedCharges = Math.min(maxCharges, mapState.manualFeedCharges + gained);
    mapState.manualFeedLastRechargeMs =
      mapState.manualFeedCharges >= maxCharges
        ? nowMs
        : mapState.manualFeedLastRechargeMs + gained * MANUAL_FEED_RECHARGE_SEC * 1000;
  }
}

export function getNextChargeCountdownSec(mapState: MapInstanceState, nowMs: number): number {
  const maxCharges = getMaxManualFeedCharges(mapState);
  if (mapState.manualFeedCharges >= maxCharges) return 0;
  const elapsedSec = Math.max(0, (nowMs - (mapState.manualFeedLastRechargeMs || nowMs)) / 1000);
  return Math.max(0, Math.ceil(MANUAL_FEED_RECHARGE_SEC - elapsedSec));
}

/**
 * Passive Food Factory step (1Hz)
 */
export function stepLocalFoodFactory(
  mapState: MapInstanceState,
  dtSec: number
): number {
  const cap = getFoodStorageCapacity(mapState.foodStorageLevel, mapState.masteryLevel);
  if (mapState.foodStored >= cap) return 0;
  const perSec = getFoodFactoryRatePerMin(mapState.foodFactoryLevel, mapState.masteryLevel) / 60;
  const produced = Math.min(cap - mapState.foodStored, perSec * dtSec);
  mapState.foodStored = Math.min(cap, mapState.foodStored + produced);
  return produced;
}

export interface ManualFeedResult {
  fedFishCount: number;
  foodConsumed: number;
  usedEmergencyCrumbs: boolean;
  hungerRestoredAvg: number;
  growthBonusSec: number;
  xpBonus: number;
}

/**
 * Executes an Active Manual Feed on the active habitat.
 * Active Play > Idle Play: restores up to +42% hunger, gives growth burst, happiness,
 * breeding readiness nudge, XP, and +15% coin buff.
 */
export function performManualFeed(
  state: SaveGameState,
  habitatId: HabitatId,
  globalFoodEfficiencyPct = 0
): ManualFeedResult {
  const mapState = state.mapStates[habitatId];
  const fishInMap = state.placedFish.filter((f) => f.habitatId === habitatId);
  if (!mapState || fishInMap.length === 0) {
    return {
      fedFishCount: 0,
      foodConsumed: 0,
      usedEmergencyCrumbs: false,
      hungerRestoredAvg: 0,
      growthBonusSec: 0,
      xpBonus: 0,
    };
  }

  const effMult = Math.max(0.55, 1 - globalFoodEfficiencyPct / 100);
  let totalNeeded = 0;
  for (const fish of fishInMap) {
    const fd = FISH_BY_ID[fish.fishId];
    if (!fd) continue;
    totalNeeded += Math.max(1, getFishFoodRequirement(fd) * 0.75 * effMult);
  }
  totalNeeded = Math.max(2, Math.round(totalNeeded));

  let foodConsumed = 0;
  let usedEmergencyCrumbs = false;
  let restorePower = 44;

  if (mapState.foodStored >= 1) {
    foodConsumed = Math.min(mapState.foodStored, totalNeeded);
    mapState.foodStored = Math.max(0, mapState.foodStored - foodConsumed);
    const ratio = Math.min(1, foodConsumed / totalNeeded);
    restorePower = 20 + 26 * ratio; // Full meal gives +46% hunger!
  } else {
    // Cozy safeguard: manual tapping still sprinkles small hand-crumbs (+14% hunger) so players are never soft-locked
    usedEmergencyCrumbs = true;
    restorePower = 14;
  }

  let totalRestored = 0;
  const growthBonusSec = usedEmergencyCrumbs ? 6 : 16;

  for (const fish of fishInMap) {
    const prev = fish.hunger ?? 85;
    fish.hunger = Math.min(100, prev + restorePower);
    totalRestored += fish.hunger - prev;
    fish.happiness = Math.min(100, fish.happiness + (usedEmergencyCrumbs ? 4 : 11));
    fish.health = Math.min(100, fish.health + (usedEmergencyCrumbs ? 3 : 8));
    fish.starvationSec = 0;
    fish.ageSec += growthBonusSec;
    // Slight breeding readiness nudge from active care
    if (fish.lastBredAt > 0) {
      fish.lastBredAt -= 4000;
    }
  }

  return {
    fedFishCount: fishInMap.length,
    foodConsumed: Math.round(foodConsumed),
    usedEmergencyCrumbs,
    hungerRestoredAvg: Math.round(totalRestored / fishInMap.length),
    growthBonusSec,
    xpBonus: usedEmergencyCrumbs ? 2 : 5 + Math.min(10, Math.floor(fishInMap.length / 2)),
  };
}
