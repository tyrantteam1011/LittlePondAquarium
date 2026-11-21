import { LocalUpgradeData, LocalUpgradeId, UpgradeData, UpgradeId } from '../core/types';

/**
 * Global Aquarium Upgrades (Preserved for compatibility)
 */
export const UPGRADE_CATALOG: UpgradeData[] = [
  {
    id: 'fish_income',
    name: 'Fish Vitality',
    description: 'Increases coins generated every second by healthy fish globally.',
    baseCost: 110,
    growthFactor: 1.17,
    maxLevel: 20,
    baseValue: 0,
    valuePerLevel: 15,
    unit: '% Fish Income',
    valueFormat: 'percent',
  },
  {
    id: 'offline_income',
    name: 'Offline Efficiency',
    description: 'Boosts earnings collected while you relax away from your aquariums.',
    baseCost: 160,
    growthFactor: 1.16,
    maxLevel: 15,
    baseValue: 75,
    valuePerLevel: 10,
    unit: '% Offline Rate',
    valueFormat: 'percent',
  },
  {
    id: 'aquarium_capacity',
    name: 'Global Bio-Bonus',
    description: 'Adds bonus fish capacity across all unlocked world maps.',
    baseCost: 220,
    growthFactor: 1.19,
    maxLevel: 10,
    baseValue: 0,
    valuePerLevel: 2,
    unit: 'Bonus Slots',
    valueFormat: 'flat',
  },
  {
    id: 'beauty_bonus',
    name: 'Aquascape Harmony',
    description: 'Increases the income bonus earned from your Beauty Score.',
    baseCost: 240,
    growthFactor: 1.17,
    maxLevel: 15,
    baseValue: 1.0,
    valuePerLevel: 0.15,
    unit: '× Beauty Effect',
    valueFormat: 'multiplier',
  },
  {
    id: 'collection_bonus',
    name: 'Curator Mastery',
    description: 'Amplifies passive income earned from every discovered fish species.',
    baseCost: 300,
    growthFactor: 1.18,
    maxLevel: 15,
    baseValue: 5,
    valuePerLevel: 2,
    unit: '% per Species',
    valueFormat: 'percent',
  },
  {
    id: 'income_multiplier',
    name: 'Crystal Filter Network',
    description: 'Multiplies total coin income across all habitats.',
    baseCost: 420,
    growthFactor: 1.2,
    maxLevel: 15,
    baseValue: 1.0,
    valuePerLevel: 0.2,
    unit: '× Total Coins',
    valueFormat: 'multiplier',
  },
];

export const UPGRADE_BY_ID: Record<UpgradeId, UpgradeData> = Object.fromEntries(
  UPGRADE_CATALOG.map((u) => [u.id, u])
) as Record<UpgradeId, UpgradeData>;

/**
 * LOCAL MAP UPGRADES (Section 25 — Upgrading Map A ONLY upgrades Map A!)
 * Supports species capacity scaling 10 -> 50 per map, space expansion, oxygen, filtration, creature harvest, and breeding care.
 */
export const LOCAL_UPGRADE_CATALOG: LocalUpgradeData[] = [
  {
    id: 'species_capacity',
    name: 'Active Fish Capacity',
    description: 'Expands active fish capacity in this map only (10 → 50 fish).',
    baseCost: 140,
    tokenBaseCost: 0,
    growthFactor: 1.28,
    maxLevel: 8,
    baseValue: 10,
    valuePerLevel: 5, // 10 -> 15 -> 20 -> 25 -> 30 -> 35 -> 40 -> 45 -> 50!
    unit: 'Max Fish',
  },
  {
    id: 'tank_space',
    name: 'Expand Swimming Space',
    description: 'Widens safe living volume in this map so larger fish & schools fit.',
    baseCost: 160,
    tokenBaseCost: 0,
    growthFactor: 1.24,
    maxLevel: 12,
    baseValue: 12,
    valuePerLevel: 4,
    unit: 'Space Units',
  },
  {
    id: 'oxygen_system',
    name: 'Local Aeration System',
    description: 'Boosts baseline oxygen supply and circulation in this map.',
    baseCost: 120,
    tokenBaseCost: 0,
    growthFactor: 1.2,
    maxLevel: 12,
    baseValue: 20,
    valuePerLevel: 8,
    unit: 'O₂ Supply',
  },
  {
    id: 'filtration_system',
    name: 'Local Bio-Filtration',
    description: 'Strengthens water clarity and slows glass algae in this map.',
    baseCost: 130,
    tokenBaseCost: 0,
    growthFactor: 1.2,
    maxLevel: 12,
    baseValue: 20,
    valuePerLevel: 8,
    unit: 'Filtration',
  },
  {
    id: 'creature_income',
    name: 'Creature Harvest Gear',
    description: 'Increases Shell Coin & Pearl drop value from creatures in this map.',
    baseCost: 150,
    tokenBaseCost: 0,
    growthFactor: 1.22,
    maxLevel: 12,
    baseValue: 100,
    valuePerLevel: 20,
    unit: '% Creature Payout',
  },
  {
    id: 'breeding_care',
    name: 'Nursery Sanctuary',
    description: 'Accelerates fish growth and breeding cooldowns in this map.',
    baseCost: 200,
    tokenBaseCost: 0,
    growthFactor: 1.23,
    maxLevel: 10,
    baseValue: 100,
    valuePerLevel: 15,
    unit: '% Growth & Breed',
  },
];

export const LOCAL_UPGRADE_BY_ID: Record<LocalUpgradeId, LocalUpgradeData> = Object.fromEntries(
  LOCAL_UPGRADE_CATALOG.map((u) => [u.id, u])
) as Record<LocalUpgradeId, LocalUpgradeData>;
