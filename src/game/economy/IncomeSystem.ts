import { GAME_CONFIG, getHealthProductionMultiplier } from '../core/GameConfig';
import { HabitatId, SaveGameState } from '../core/types';
import { FISH_BY_ID } from '../data/fishCatalog';
import { CREATURE_BY_ID } from '../data/creatureCatalog';
import { HABITAT_BY_ID } from '../data/habitatCatalog';
import { COLLECTION_REWARDS } from '../data/collectionRewards';
import { calculateBeautyBreakdown } from '../aquarium/BeautySystem';
import {
  calculateEcosystemStatus,
  getConservationBonus,
  getMapSpecialistBonus,
  getResearchBonus,
} from '../aquarium/EcosystemSimulation';
import { getLocalUpgradeValue, getUpgradeValue } from './UpgradeSystem';
import { getHungerMultipliers } from '../feeding/HungerSystem';
import { getMapMasteryBonuses } from '../progression/MapMasterySystem';

export interface IncomeBreakdown {
  rawFishIncome: number;
  rawCreatureIncome: number;
  fishUpgradeMultiplier: number;
  aquariumMultiplier: number;
  collectionMultiplier: number;
  beautyMultiplier: number;
  ecosystemMultiplier: number;
  habitatMultiplier: number;
  feedBoostMultiplier: number;
  adBoostMultiplier: number;
  totalPerSecond: number;
}

/**
 * Ecosystem-Driven Idle Income Formula (v2)
 * Weighs each fish's growth stage, health, hunger, genetic variant,
 * map specialization, Map Mastery, creature passive income, research, specialists, conservation & beauty.
 */
export function calculateIncomeBreakdown(
  state: SaveGameState,
  nowMs: number = Date.now()
): IncomeBreakdown {
  let rawFishIncome = 0;
  let rawCreatureIncome = 0;

  // Cache ecosystem efficiency per habitat
  const ecoEffByMap: Partial<Record<HabitatId, number>> = {};
  for (const habId of state.unlockedHabitats) {
    ecoEffByMap[habId] = calculateEcosystemStatus(state, habId).ecosystemEfficiency;
  }

  for (const placed of state.placedFish) {
    const def = FISH_BY_ID[placed.fishId];
    if (!def) continue;
    const habitat = HABITAT_BY_ID[placed.habitatId];
    const mapState = state.mapStates[placed.habitatId];
    const habitatMult = habitat?.incomeMultiplier ?? 1;
    const mapIncomeSpeedBonus = 1 + (habitat?.specializationBonus.incomeSpeed ?? 0);
    const masteryMult = mapState ? 1 + getMapMasteryBonuses(mapState).incomeBonusPct / 100 : 1;
    const speciesLevel = Math.max(1, state.fishSpeciesLevels[placed.fishId] ?? placed.level ?? 1);
    const levelMult = 1 + (speciesLevel - 1) * GAME_CONFIG.FISH_LEVEL_INCOME_MULTIPLIER;
    const growthMult = GAME_CONFIG.GROWTH_STAGE_INCOME_MULT[placed.growthStage] ?? 1;
    const healthMult = getHealthProductionMultiplier(placed.health);
    const hungerMult = getHungerMultipliers(placed.hunger ?? 90).incomeMult;
    const variantMult = GAME_CONFIG.VARIANT_INCOME_MULT[placed.variant] ?? 1;
    const ecoMult = ecoEffByMap[placed.habitatId] ?? 1;

    rawFishIncome +=
      def.baseIncome *
      levelMult *
      habitatMult *
      mapIncomeSpeedBonus *
      masteryMult *
      growthMult *
      healthMult *
      hungerMult *
      variantMult *
      ecoMult;
  }

  for (const placedCreature of state.placedCreatures) {
    const def = CREATURE_BY_ID[placedCreature.creatureId];
    if (!def) continue;
    const habitat = HABITAT_BY_ID[placedCreature.habitatId];
    const mapState = state.mapStates[placedCreature.habitatId];
    const localCreaturePct = getLocalUpgradeValue(
      'creature_income',
      mapState?.localUpgrades.creature_income ?? 0
    );
    const specCreaturePct = getMapSpecialistBonus(
      state,
      placedCreature.habitatId,
      'creature_income'
    );
    const mapSpecBonus = 1 + (habitat?.specializationBonus.creatureIncome ?? 0);

    rawCreatureIncome +=
      def.passiveIncomePerSec *
      (localCreaturePct / 100) *
      (1 + specCreaturePct / 100) *
      mapSpecBonus;
  }

  const fishUpgradePct =
    getUpgradeValue('fish_income', state.upgradeLevels.fish_income) +
    getResearchBonus(state, 'fish_income_pct');
  const fishUpgradeMultiplier = 1 + fishUpgradePct / 100;

  // Aquarium level + Crystal Filter + Conservation global income
  const levelMult = 1 + (state.aquariumLevel - 1) * 0.06;
  const filterMult = getUpgradeValue('income_multiplier', state.upgradeLevels.income_multiplier);
  const conservationMult = 1 + getConservationBonus(state, 'global_income_pct') / 100;
  const aquariumMultiplier = levelMult * filterMult * conservationMult;

  // Collection Bonus
  const perSpeciesPct = getUpgradeValue('collection_bonus', state.upgradeLevels.collection_bonus);
  let milestoneBonusPct = 0;
  for (const rewardId of state.claimedCollectionRewards) {
    const found = COLLECTION_REWARDS.find((r) => r.id === rewardId);
    if (found?.reward.incomeBonusPercent) {
      milestoneBonusPct += found.reward.incomeBonusPercent;
    }
  }
  const collectionMultiplier =
    1 + (state.discoveredFishIds.length * perSpeciesPct + milestoneBonusPct) / 100;

  // Beauty Bonus (enhanced by Research, Coral Aquascaper Specialist, and Coral Reef map specialization)
  const activeHab = HABITAT_BY_ID[state.activeHabitatId];
  const beauty = calculateBeautyBreakdown(state, state.activeHabitatId);
  const beautyEffectScale =
    getUpgradeValue('beauty_bonus', state.upgradeLevels.beauty_bonus) *
    (1 +
      (getResearchBonus(state, 'beauty_bonus_pct') +
        getMapSpecialistBonus(state, state.activeHabitatId, 'beauty')) /
        100 +
      (activeHab?.specializationBonus.beautyBonus ?? 0));
  const beautyMultiplier = 1 + (beauty.total / 100) * 0.85 * beautyEffectScale;

  const ecosystemMultiplier = ecoEffByMap[state.activeHabitatId] ?? 1;
  const habitatMultiplier = activeHab?.incomeMultiplier ?? 1;

  // Active temporary boosts
  const feedBoostMultiplier =
    state.feedBoostEndsAt > nowMs ? 1 + GAME_CONFIG.FEED_INCOME_BONUS : 1;
  const adBoostMultiplier =
    state.adBoostEndsAt > nowMs ? GAME_CONFIG.AD_BOOST_MULTIPLIER : 1;

  const totalPerSecond =
    (rawFishIncome * fishUpgradeMultiplier + rawCreatureIncome) *
    aquariumMultiplier *
    collectionMultiplier *
    beautyMultiplier *
    feedBoostMultiplier *
    adBoostMultiplier;

  return {
    rawFishIncome,
    rawCreatureIncome,
    fishUpgradeMultiplier,
    aquariumMultiplier,
    collectionMultiplier,
    beautyMultiplier,
    ecosystemMultiplier,
    habitatMultiplier,
    feedBoostMultiplier,
    adBoostMultiplier,
    totalPerSecond,
  };
}

export function getCreatureDropValue(
  creatureId: string,
  state: SaveGameState,
  habitatId: HabitatId
): number {
  const def = CREATURE_BY_ID[creatureId];
  if (!def) return 10;
  const mapState = state.mapStates[habitatId];
  const localMult =
    getLocalUpgradeValue('creature_income', mapState?.localUpgrades.creature_income ?? 0) / 100;
  const specMult = 1 + getMapSpecialistBonus(state, habitatId, 'creature_income') / 100;
  const mapBonus = 1 + (HABITAT_BY_ID[habitatId]?.specializationBonus.creatureIncome ?? 0);
  const filterMult = getUpgradeValue('income_multiplier', state.upgradeLevels.income_multiplier);
  return Math.max(5, Math.round(def.coinDropValue * localMult * specMult * mapBonus * filterMult));
}

export function getFishPurchaseCost(fishId: string, state: SaveGameState): number {
  const def = FISH_BY_ID[fishId];
  if (!def) return 999999;
  const ownedCount =
    state.placedFish.filter((f) => f.fishId === fishId).length +
    state.storedFish.filter((f) => f.fishId === fishId).length;
  return Math.floor(
    def.baseCost * Math.pow(GAME_CONFIG.FISH_COST_GROWTH_PER_OWNED, ownedCount)
  );
}
