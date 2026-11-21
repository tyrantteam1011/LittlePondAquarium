import { GAME_CONFIG } from '../core/GameConfig';
import {
  HabitatId,
  LocalUpgradeId,
  SaveGameState,
  UpgradeData,
  UpgradeId,
} from '../core/types';
import { LOCAL_UPGRADE_BY_ID, UPGRADE_BY_ID } from '../data/upgradeCatalog';
import { HABITAT_BY_ID } from '../data/habitatCatalog';
import { CREATURE_BY_ID } from '../data/creatureCatalog';
import { getMapExpansionBonus, getMapMasteryBonuses } from '../progression/MapMasterySystem';
import { getGlobalMilestoneBonuses } from '../progression/MilestoneSystem';

/**
 * Global Upgrade Economy
 */
export function getUpgradeCost(upgradeId: UpgradeId, currentLevel: number): number {
  const def = UPGRADE_BY_ID[upgradeId];
  return Math.floor(def.baseCost * Math.pow(def.growthFactor, currentLevel));
}

export function getUpgradeValue(upgradeId: UpgradeId, level: number): number {
  const def = UPGRADE_BY_ID[upgradeId];
  return Number((def.baseValue + def.valuePerLevel * level).toFixed(2));
}

export function formatUpgradeValue(def: UpgradeData, level: number): string {
  const val = getUpgradeValue(def.id, level);
  switch (def.valueFormat) {
    case 'percent':
      return `+${Math.round(val)}%`;
    case 'multiplier':
      return `${val.toFixed(2)}×`;
    case 'hours':
      return `${val}h`;
    case 'flat':
    default:
      return `${Math.round(val)}`;
  }
}

/**
 * Local Map Upgrade Economy (Upgrading Map A ONLY affects Map A!)
 */
export function getLocalUpgradeCost(
  upgradeId: LocalUpgradeId,
  currentLevel: number,
  habitatId: HabitatId
): number {
  const def = LOCAL_UPGRADE_BY_ID[upgradeId];
  const mapOrderScale = Math.pow(Math.max(1, HABITAT_BY_ID[habitatId]?.incomeMultiplier ?? 1), 0.72);
  return Math.floor(def.baseCost * mapOrderScale * Math.pow(def.growthFactor, currentLevel));
}

export function getLocalUpgradeValue(upgradeId: LocalUpgradeId, level: number): number {
  const def = LOCAL_UPGRADE_BY_ID[upgradeId];
  return Number((def.baseValue + def.valuePerLevel * level).toFixed(1));
}

/**
 * Active fish capacity per map (scales 10 -> 50 -> 75 -> 100 via local upgrades, Map Mastery & Retroactive Expansion!)
 */
export function getMapSpeciesCapacity(
  state: SaveGameState,
  habitatId: HabitatId = state.activeHabitatId
): number {
  const mapState = state.mapStates[habitatId];
  const localLv = mapState?.localUpgrades.species_capacity ?? 0;
  const localCap = Math.round(getLocalUpgradeValue('species_capacity', localLv));
  const globalBonus = Math.round(
    getUpgradeValue('aquarium_capacity', state.upgradeLevels.aquarium_capacity)
  );
  const mastery = mapState ? getMapMasteryBonuses(mapState) : { extraFishSlots: 0 };
  const expansion = mapState
    ? getMapExpansionBonus(mapState)
    : { maxFishCeiling: GAME_CONFIG.MAX_SPECIES_CAPACITY, bonusFishSlots: 0 };
  const ceiling = Math.max(GAME_CONFIG.MAX_SPECIES_CAPACITY, expansion.maxFishCeiling);
  return Math.min(ceiling, localCap + globalBonus + mastery.extraFishSlots + expansion.bonusFishSlots);
}

/**
 * Living Space capacity per map (includes Map Mastery & Retroactive Expansion space!)
 */
export function getMapSpaceCapacity(
  state: SaveGameState,
  habitatId: HabitatId = state.activeHabitatId
): number {
  const mapState = state.mapStates[habitatId];
  const localLv = mapState?.localUpgrades.tank_space ?? 0;
  const mapBaseBonus = ((HABITAT_BY_ID[habitatId]?.order ?? 1) - 1) * 3;
  const masterySpace = mapState ? getMapMasteryBonuses(mapState).extraSpaceUnits : 0;
  const expansionSpace = mapState ? getMapExpansionBonus(mapState).bonusSpace : 0;
  return Math.round(
    getLocalUpgradeValue('tank_space', localLv) + mapBaseBonus + masterySpace + expansionSpace
  );
}

/**
 * Backwards-compatible alias for active map capacity
 */
export function getMaxAquariumCapacity(state: SaveGameState): number {
  return getMapSpeciesCapacity(state, state.activeHabitatId);
}

export function getOfflineEfficiencyMultiplier(state: SaveGameState): number {
  const basePct = getUpgradeValue('offline_income', state.upgradeLevels.offline_income);
  const milestoneOfflinePct = getGlobalMilestoneBonuses(state).offline_pct;
  return (basePct + milestoneOfflinePct) / 100;
}

export function getCreaturePurchaseCost(creatureId: string, state: SaveGameState): number {
  const def = CREATURE_BY_ID[creatureId];
  if (!def) return 999999;
  const ownedCount = state.placedCreatures.filter((c) => c.creatureId === creatureId).length;
  return Math.floor(
    def.cost * Math.pow(GAME_CONFIG.CREATURE_COST_GROWTH_PER_OWNED, ownedCount)
  );
}
