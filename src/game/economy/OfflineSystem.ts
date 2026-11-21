import { GAME_CONFIG } from '../core/GameConfig';
import { OfflineEarningsReport, SaveGameState } from '../core/types';
import { calculateIncomeBreakdown } from './IncomeSystem';
import { getOfflineEfficiencyMultiplier } from './UpgradeSystem';
import {
  calculateEcosystemStatus,
  getMapSpecialistBonus,
  getResearchBonus,
} from '../aquarium/EcosystemSimulation';
import { FISH_BY_ID } from '../data/fishCatalog';
import { getAutoFeederStats } from '../feeding/AutoFeederSystem';

/**
 * Offline Progression & Offline Feeding Summary (Section 33 & 48)
 * Calculates ecosystem-weighted offline coins, RP, fish growth, new babies,
 * Auto Feeder cycles, food used, and overnight starvation protection so returning feels cozy and fair.
 */
export function calculateOfflineEarnings(
  state: SaveGameState,
  nowMs: number = Date.now(),
  forcedAwaySeconds?: number
): OfflineEarningsReport | null {
  const rawElapsedSeconds =
    typeof forcedAwaySeconds === 'number'
      ? forcedAwaySeconds
      : Math.floor((nowMs - state.lastLoginTime) / 1000);

  if (!Number.isFinite(rawElapsedSeconds) || rawElapsedSeconds < GAME_CONFIG.MIN_OFFLINE_REPORT_SECONDS) {
    return null;
  }

  const capHours = GAME_CONFIG.DEFAULT_OFFLINE_CAP_HOURS;
  const maxSeconds = capHours * 3600;
  const cappedSeconds = Math.min(rawElapsedSeconds, maxSeconds);
  const wasCapped = rawElapsedSeconds > maxSeconds;
  const awayMinutes = cappedSeconds / 60;

  const activeMapState = state.mapStates[state.activeHabitatId];
  const activeEco = calculateEcosystemStatus(state, state.activeHabitatId);
  const autoStats = activeMapState ? getAutoFeederStats(activeMapState) : null;

  // Offline food production vs consumption + Auto Feeder nutrition
  const offlineFoodProduced = Math.round(activeEco.foodProductionPerMin * awayMinutes * 0.55);
  const totalAvailableFood = activeEco.foodStored + offlineFoodProduced;
  const offlineDemand = Math.round(activeEco.foodConsumptionPerMin * awayMinutes * 0.35);

  let foodUsed = 0;
  let fishFedCount = 0;
  let avgHungerAtReturn = activeEco.avgHunger;

  const activeFishCount = state.placedFish.filter(
    (f) => f.habitatId === state.activeHabitatId
  ).length;

  if (autoStats?.enabled && activeFishCount > 0) {
    foodUsed = Math.min(totalAvailableFood, Math.max(1, offlineDemand));
    const coverage = offlineDemand > 0 ? Math.min(1, foodUsed / offlineDemand) : 1;
    const pulses = Math.max(1, Math.floor(cappedSeconds / Math.max(15, autoStats.intervalSec)));
    fishFedCount = Math.min(
      activeFishCount * Math.max(1, Math.floor(pulses * 0.35)),
      Math.max(activeFishCount, Math.round(pulses * autoStats.maxTargetsPerPulse * 0.25))
    );
    avgHungerAtReturn = Math.round(
      Math.max(45, Math.min(autoStats.targetHungerCeiling, 48 + coverage * (autoStats.offlineNutritionPct - 45)))
    );
  } else {
    // Overnight cozy protection: fish get hungry while away, never wiped out overnight!
    foodUsed = 0;
    fishFedCount = 0;
    const drop = Math.min(48, (cappedSeconds / 3600) * 10);
    avgHungerAtReturn = Math.max(36, Math.round(activeEco.avgHunger - drop));
  }

  const breakdown = calculateIncomeBreakdown(
    { ...state, feedBoostEndsAt: 0, adBoostEndsAt: 0 },
    nowMs
  );

  const researchOfflinePct = getResearchBonus(state, 'offline_bonus_pct');
  const specOfflinePct = getMapSpecialistBonus(state, state.activeHabitatId, 'offline');
  const autoOfflineBonus = autoStats?.enabled ? 1 + (autoStats.offlineNutritionPct - 45) / 250 : 0.9;
  const efficiencyMultiplier =
    getOfflineEfficiencyMultiplier(state) *
    (1 + (researchOfflinePct + specOfflinePct) / 100) *
    autoOfflineBonus;

  const ecosystemEfficiency = activeEco.ecosystemEfficiency;
  const coinsEarned = Math.max(
    1,
    Math.floor(breakdown.totalPerSecond * cappedSeconds * efficiencyMultiplier)
  );

  // Estimate biological milestones while away
  let fishGrewCount = 0;
  for (const f of state.placedFish) {
    const def = FISH_BY_ID[f.fishId];
    if (!def) continue;
    if (f.growthStage !== 'breeding_adult' && f.ageSec + cappedSeconds * 0.55 >= def.growthTimeSec) {
      fishGrewCount += 1;
    }
  }

  const breedingPairs = activeEco.breedingReadySpecies.length;
  const fishBornCount =
    breedingPairs > 0 && activeEco.waterQuality >= 65 && avgHungerAtReturn >= 50
      ? Math.min(3, Math.floor((cappedSeconds / 1800) * breedingPairs))
      : 0;

  // Offline Research Points earned from living observation
  const researchPointsEarned = Math.max(
    1,
    Math.floor((cappedSeconds / 600) * (1 + state.discoveredFishIds.length * 0.15) * ecosystemEfficiency)
  );

  const waterQualityAtReturn = Math.max(
    45,
    Math.round(activeEco.waterQuality - Math.min(18, (cappedSeconds / 3600) * 2.2))
  );

  const needsAttention = avgHungerAtReturn < 58 || waterQualityAtReturn < 65;

  return {
    awaySeconds: rawElapsedSeconds,
    cappedSeconds,
    coinsEarned,
    researchPointsEarned,
    fishGrewCount,
    fishBornCount,
    waterQualityAtReturn,
    efficiencyMultiplier,
    ecosystemEfficiency,
    capHours,
    wasCapped,
    foodUsed,
    fishFedCount,
    avgHungerAtReturn,
    needsAttention,
  };
}
