import {
  AutoFeederUpgradeId,
  FishDietType,
  HabitatId,
} from '../core/types';

export interface MapFoodData {
  habitatId: HabitatId;
  foodName: string;
  foodSubtitle: string;
  preferredDiets: FishDietType[];
  pelletColor: string;
  pelletGlow: string;
  buyPackAmount: number;
  buyPackCoinCost: number;
}

export interface AutoFeederUpgradeData {
  id: AutoFeederUpgradeId;
  name: string;
  description: string;
  baseCost: number;
  tokenCost: number;
  growthFactor: number;
  maxLevel: number;
  minAutoFeederLevel: number;
  effectPerLevelLabel: string;
}

export const MAP_FOOD_DATA: Record<HabitatId, MapFoodData> = {
  pond: {
    habitatId: 'pond',
    foodName: 'Pond Pellets & Algae Flakes',
    foodSubtitle: 'Light botanical flakes for peaceful pond swimmers',
    preferredDiets: ['herbivore', 'omnivore'],
    pelletColor: '#9be06b',
    pelletGlow: '#e8ffbd',
    buyPackAmount: 40,
    buyPackCoinCost: 45,
  },
  garden_pond: {
    habitatId: 'garden_pond',
    foodName: 'Lotus Silk Pellets',
    foodSubtitle: 'Sweet floral flakes crafted for garden koi & goldfish',
    preferredDiets: ['herbivore', 'omnivore'],
    pelletColor: '#f5b878',
    pelletGlow: '#fff0c9',
    buyPackAmount: 55,
    buyPackCoinCost: 90,
  },
  lake: {
    habitatId: 'lake',
    foodName: 'Timber Insect Pellets',
    foodSubtitle: 'Balanced protein granules for deep lake schools',
    preferredDiets: ['omnivore', 'carnivore'],
    pelletColor: '#d99e5b',
    pelletGlow: '#ffe0a8',
    buyPackAmount: 75,
    buyPackCoinCost: 180,
  },
  mountain_lake: {
    habitatId: 'mountain_lake',
    foodName: 'Alpine Mayfly Bits',
    foodSubtitle: 'Cold-water crisp granules rich in omega nutrients',
    preferredDiets: ['omnivore', 'carnivore'],
    pelletColor: '#8ad8eb',
    pelletGlow: '#d9f8ff',
    buyPackAmount: 95,
    buyPackCoinCost: 340,
  },
  river: {
    habitatId: 'river',
    foodName: 'Stream Drift Granules',
    foodSubtitle: 'Slow-sinking river flakes built for brisk currents',
    preferredDiets: ['omnivore', 'carnivore', 'herbivore'],
    pelletColor: '#e6b467',
    pelletGlow: '#fff1c2',
    buyPackAmount: 120,
    buyPackCoinCost: 620,
  },
  rapids: {
    habitatId: 'rapids',
    foodName: 'Crystal Larvae Bites',
    foodSubtitle: 'High-energy protein bits for agile rapids sprinters',
    preferredDiets: ['carnivore', 'omnivore'],
    pelletColor: '#7be0d3',
    pelletGlow: '#d1fffa',
    buyPackAmount: 150,
    buyPackCoinCost: 1100,
  },
  wetland: {
    habitatId: 'wetland',
    foodName: 'Marsh Botanical Wafers',
    foodSubtitle: 'Nutrient-dense reed wafers & herbal algae chips',
    preferredDiets: ['herbivore', 'omnivore'],
    pelletColor: '#82c979',
    pelletGlow: '#d8ffd1',
    buyPackAmount: 190,
    buyPackCoinCost: 1950,
  },
  swamp: {
    habitatId: 'swamp',
    foodName: 'Cypress Moss Morsels',
    foodSubtitle: 'Rich organic pellets suited to warm shaded marsh tanks',
    preferredDiets: ['omnivore', 'carnivore'],
    pelletColor: '#9eb863',
    pelletGlow: '#e8f5b8',
    buyPackAmount: 240,
    buyPackCoinCost: 3400,
  },
  mangrove: {
    habitatId: 'mangrove',
    foodName: 'Estuary Brine Pellets',
    foodSubtitle: 'Brackish mineral-rich shrimp and root flakes',
    preferredDiets: ['omnivore', 'carnivore', 'filter'],
    pelletColor: '#eb9460',
    pelletGlow: '#ffd8b8',
    buyPackAmount: 300,
    buyPackCoinCost: 5800,
  },
  estuary: {
    habitatId: 'estuary',
    foodName: 'Tidal Krill Flakes',
    foodSubtitle: 'Salty tidal blend energizing coastal mixed schools',
    preferredDiets: ['omnivore', 'carnivore', 'filter'],
    pelletColor: '#f07c73',
    pelletGlow: '#ffd1cc',
    buyPackAmount: 380,
    buyPackCoinCost: 9500,
  },
  tropical_lagoon: {
    habitatId: 'tropical_lagoon',
    foodName: 'Lagoon Plankton Pearls',
    foodSubtitle: 'Sparkling sun-warmed reef granules & spirulina',
    preferredDiets: ['herbivore', 'omnivore', 'filter'],
    pelletColor: '#5fd4c4',
    pelletGlow: '#ccfff6',
    buyPackAmount: 480,
    buyPackCoinCost: 16000,
  },
  coral_reef: {
    habitatId: 'coral_reef',
    foodName: 'Marine Plankton & Coral Micro-Food',
    foodSubtitle: 'Vivid marine plankton feast boosting reef color & growth',
    preferredDiets: ['omnivore', 'herbivore', 'filter'],
    pelletColor: '#ff9678',
    pelletGlow: '#ffe0d1',
    buyPackAmount: 600,
    buyPackCoinCost: 26000,
  },
  deep_coral: {
    habitatId: 'deep_coral',
    foodName: 'Twilight Mysis Feast',
    foodSubtitle: 'Deep-reef protein pearls for exotic twilight dwellers',
    preferredDiets: ['carnivore', 'omnivore', 'filter'],
    pelletColor: '#c78df2',
    pelletGlow: '#f2deff',
    buyPackAmount: 750,
    buyPackCoinCost: 42000,
  },
  kelp_forest: {
    habitatId: 'kelp_forest',
    foodName: 'Giant Kelp & Urchin Bites',
    foodSubtitle: 'Botanical kelp wafers balanced with marine krill',
    preferredDiets: ['herbivore', 'omnivore'],
    pelletColor: '#69c983',
    pelletGlow: '#c9ffd6',
    buyPackAmount: 950,
    buyPackCoinCost: 68000,
  },
  coastal_ocean: {
    habitatId: 'coastal_ocean',
    foodName: 'Coastal Sardine Strips',
    foodSubtitle: 'High-protein marine feed for sleek coastal cruisers',
    preferredDiets: ['carnivore', 'omnivore', 'filter'],
    pelletColor: '#7ebce8',
    pelletGlow: '#d9f0ff',
    buyPackAmount: 1200,
    buyPackCoinCost: 110000,
  },
  open_ocean: {
    habitatId: 'open_ocean',
    foodName: 'Pelagic Krill & Ocean Blend',
    foodSubtitle: 'Expansive pelagic rations for rays, sharks, and tunas',
    preferredDiets: ['carnivore', 'filter', 'omnivore'],
    pelletColor: '#f58873',
    pelletGlow: '#ffd8cc',
    buyPackAmount: 1600,
    buyPackCoinCost: 185000,
  },
  deep_ocean: {
    habitatId: 'deep_ocean',
    foodName: 'Abyssal Bio-Plankton',
    foodSubtitle: 'Luminous deep-water nutrition for rare glowing fauna',
    preferredDiets: ['filter', 'carnivore', 'special'],
    pelletColor: '#78f0e6',
    pelletGlow: '#d9fffc',
    buyPackAmount: 2200,
    buyPackCoinCost: 310000,
  },
  abyss: {
    habitatId: 'abyss',
    foodName: 'Midnight Marine Snow',
    foodSubtitle: 'Concentrated deep-sea detritus pearls for giant abyssals',
    preferredDiets: ['filter', 'carnivore', 'special'],
    pelletColor: '#99b8ff',
    pelletGlow: '#e0ebff',
    buyPackAmount: 3000,
    buyPackCoinCost: 520000,
  },
  biolum_trench: {
    habitatId: 'biolum_trench',
    foodName: 'Luminous Trench Nectar',
    foodSubtitle: 'Radiant bioluminescent spores prized by mythical species',
    preferredDiets: ['special', 'filter', 'carnivore'],
    pelletColor: '#6ef7c8',
    pelletGlow: '#d4ffee',
    buyPackAmount: 4200,
    buyPackCoinCost: 880000,
  },
  legendary_ocean: {
    habitatId: 'legendary_ocean',
    foodName: 'Celestial Starlight Feast',
    foodSubtitle: 'Mythic ambrosia pellets sustaining legendary ocean titans',
    preferredDiets: ['special', 'filter', 'carnivore', 'omnivore', 'herbivore'],
    pelletColor: '#ffe078',
    pelletGlow: '#fff9d6',
    buyPackAmount: 6000,
    buyPackCoinCost: 1500000,
  },
};

export const AUTO_FEEDER_UPGRADE_TREE: AutoFeederUpgradeData[] = [
  {
    id: 'feeding_speed',
    name: 'Feeding Speed',
    description: 'Shortens the interval between automated feeding pulses.',
    baseCost: 220,
    tokenCost: 1,
    growthFactor: 1.62,
    maxLevel: 8,
    minAutoFeederLevel: 1,
    effectPerLevelLabel: '-10% Cycle Time',
  },
  {
    id: 'feeding_capacity',
    name: 'Hopper Capacity',
    description: 'Dispenses larger portions per auto-feed pulse for busy tanks.',
    baseCost: 280,
    tokenCost: 1,
    growthFactor: 1.65,
    maxLevel: 8,
    minAutoFeederLevel: 1,
    effectPerLevelLabel: '+20% Portion Size',
  },
  {
    id: 'feeding_efficiency',
    name: 'Food Efficiency',
    description: 'Reduces food consumed per hunger point restored.',
    baseCost: 340,
    tokenCost: 2,
    growthFactor: 1.68,
    maxLevel: 8,
    minAutoFeederLevel: 1,
    effectPerLevelLabel: '-6% Food Cost',
  },
  {
    id: 'feeding_range',
    name: 'Dispersion Range',
    description: 'Reaches more hungry fish simultaneously in a single drop.',
    baseCost: 420,
    tokenCost: 2,
    growthFactor: 1.7,
    maxLevel: 6,
    minAutoFeederLevel: 2,
    effectPerLevelLabel: '+2 Fish / Pulse',
  },
  {
    id: 'smart_targeting',
    name: 'Smart Targeting',
    description: 'Locks onto Critical and Starving fish first with zero waste.',
    baseCost: 650,
    tokenCost: 3,
    growthFactor: 1.78,
    maxLevel: 5,
    minAutoFeederLevel: 2,
    effectPerLevelLabel: '+12% Rescue Heal',
  },
  {
    id: 'advanced_feeder',
    name: 'Advanced Feeder',
    description: 'Raises the target hunger ceiling maintained automatically.',
    baseCost: 1100,
    tokenCost: 4,
    growthFactor: 1.85,
    maxLevel: 5,
    minAutoFeederLevel: 4,
    effectPerLevelLabel: '+5% Target Hunger',
  },
  {
    id: 'ai_feeder',
    name: 'Eco-AI Dispenser',
    description: 'Optimizes offline nutrition and adds gentle auto-growth nourishment.',
    baseCost: 2400,
    tokenCost: 6,
    growthFactor: 1.95,
    maxLevel: 5,
    minAutoFeederLevel: 6,
    effectPerLevelLabel: '+8% Offline Nutrition',
  },
];

export const AUTO_FEEDER_TREE_BY_ID: Record<AutoFeederUpgradeId, AutoFeederUpgradeData> =
  Object.fromEntries(AUTO_FEEDER_UPGRADE_TREE.map((u) => [u.id, u])) as Record<
    AutoFeederUpgradeId,
    AutoFeederUpgradeData
  >;
