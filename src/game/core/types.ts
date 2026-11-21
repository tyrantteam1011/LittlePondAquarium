/**
 * Core Data Models & Domain Types — Coralia Pixel Aquarium Ecosystem Tycoon (v2)
 * Preserves existing v1 contracts while cleanly extending with:
 * - 8-Map World Progression & independent per-map local state
 * - Fish Growth, Schooling, Compatibility, Breeding, Eggs & Genetic Variants
 * - Ecosystem Simulation (Water Quality, Algae, Oxygen, Space, Temperature)
 * - Map-Specific Income Creatures & Active/Automated Collection
 * - Aquarium Research Center, Specialists, Visitors, Weekly Events & Conservation
 */

import { TutorialSaveData } from '../tutorial/types';

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export type HabitatId =
  | 'pond'
  | 'garden_pond'
  | 'lake'
  | 'mountain_lake'
  | 'river'
  | 'rapids'
  | 'wetland'
  | 'swamp'
  | 'mangrove'
  | 'estuary'
  | 'tropical_lagoon'
  | 'coral_reef'
  | 'deep_coral'
  | 'kelp_forest'
  | 'coastal_ocean'
  | 'open_ocean'
  | 'deep_ocean'
  | 'abyss'
  | 'biolum_trench'
  | 'legendary_ocean';

export type FishSizeTier = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

export type FishDietType = 'herbivore' | 'omnivore' | 'carnivore' | 'filter' | 'special';

export type HungerBand = 'healthy' | 'hungry' | 'very_hungry' | 'starving' | 'critical';

export type AutoFeederUpgradeId =
  | 'feeding_speed'
  | 'feeding_capacity'
  | 'feeding_efficiency'
  | 'feeding_range'
  | 'smart_targeting'
  | 'advanced_feeder'
  | 'ai_feeder';

export type EncyclopediaCategory =
  | 'Fish'
  | 'Sharks & Rays'
  | 'Reptiles'
  | 'Crustaceans'
  | 'Mollusks'
  | 'Jellyfish'
  | 'Corals & Other';

export type CreatureMovementProfile =
  | 'shark_sweep'
  | 'ray_glide'
  | 'turtle_swim'
  | 'jelly_drift'
  | 'squid_dart'
  | 'octopus_burst'
  | 'snail_crawl'
  | 'crab_scuttle'
  | 'stationary'
  | 'seahorse_bob'
  | 'frog_hop'
  | 'shrimp_dart';

export type FishBehaviorType =
  | 'schooling'
  | 'solo'
  | 'bottom'
  | 'fast'
  | 'glider';

export type SchoolingCategory =
  | 'solitary'
  | 'small_school'
  | 'medium_school'
  | 'large_school'
  | 'mass_school';

export type GrowthStage = 'baby' | 'juvenile' | 'adult' | 'breeding_adult';

export type GeneticVariant =
  | 'normal'
  | 'golden'
  | 'albino'
  | 'sakura'
  | 'prism'
  | 'longfin';

export type CompatibilityRelation =
  | 'Compatible'
  | 'Neutral'
  | 'Territorial'
  | 'Predator'
  | 'Prey'
  | 'Dangerous'
  | 'Symbiotic';

export type WaterQualityState =
  | 'Perfect'
  | 'Good'
  | 'Dirty'
  | 'Very Dirty'
  | 'Polluted';

export type DecorationCategory =
  | 'Plants'
  | 'Equipment'
  | 'Rocks'
  | 'Coral'
  | 'Wood'
  | 'Substrate'
  | 'Structures'
  | 'Special'
  | 'Background';

export type UpgradeId =
  | 'fish_income'
  | 'offline_income'
  | 'aquarium_capacity'
  | 'beauty_bonus'
  | 'collection_bonus'
  | 'income_multiplier';

export type LocalUpgradeId =
  | 'species_capacity'
  | 'tank_space'
  | 'oxygen_system'
  | 'filtration_system'
  | 'creature_income'
  | 'breeding_care';

export type CreatureType =
  | 'crab'
  | 'snail'
  | 'shrimp'
  | 'clam'
  | 'mussel'
  | 'crayfish'
  | 'octopus'
  | 'squid'
  | 'ray'
  | 'shark'
  | 'turtle'
  | 'jellyfish'
  | 'starfish'
  | 'seahorse'
  | 'frog';

export type ResearchCategory =
  | 'Biology'
  | 'Water Science'
  | 'Aquaculture'
  | 'Decoration'
  | 'Exploration'
  | 'Automation';

export type MissionMetric =
  | 'discover_fish'
  | 'place_decoration'
  | 'feed_fish'
  | 'earn_coins'
  | 'buy_fish'
  | 'buy_upgrade'
  | 'tap_rare_visitor'
  | 'reach_beauty'
  | 'grow_fish'
  | 'breed_fish'
  | 'collect_creature_coins'
  | 'complete_research'
  | 'maintain_water';

export interface UnlockRequirement {
  aquariumLevel?: number;
  beautyScore?: number;
  habitatId?: HabitatId;
  discoveredFishCount?: number;
  coinsToUnlock?: number;
  gemsToUnlock?: number;
}

export interface FishData {
  id: string;
  /** @deprecated Internal English dev reference only — always render via LocalizationManager.getFishName(fish) */
  name: string;
  scientificName: string;
  nameKey: string;
  descriptionKey: string;
  noteKey: string;
  habitatKey: string;
  dietKey: string;
  behaviorKey: string;
  rarity: Rarity;
  baseIncome: number;
  baseCost: number;
  gemCost?: number;
  size: number; // Adult visual scale (0.8 to 1.55)
  speed: number;
  behavior: FishBehaviorType;
  preferredHabitat: HabitatId;
  collection: HabitatId;
  spriteKey: string;
  animationStyle: 'flutter' | 'glide' | 'dart' | 'wiggle' | 'vertical' | 'pulse' | 'ray';
  /** @deprecated Internal English dev reference only — always render via LocalizationManager.getFishDescription(fish) */
  description: string;
  unlockRequirement: UnlockRequirement;
  beautyValue: number;

  // Ecosystem & Biology Extension
  preferredTemperature: [number, number]; // Celsius min..max
  preferredWaterQuality: number; // Min water quality %
  preferredOxygen: number; // Min oxygen %
  preferredDepth: 'surface' | 'mid' | 'deep' | 'bottom';
  dietType: FishDietType;
  foodRequirement?: number; // Food units consumed per cycle (defaults from size/space)
  sizeTier?: FishSizeTier;
  encyclopediaCategory?: EncyclopediaCategory;
  growthTimeSec: number; // Seconds from baby -> breeding_adult
  schoolingBehavior: SchoolingCategory;
  minimumSchoolSize: number;
  maximumSchoolSize: number;
  aggression: number; // 0..10
  predatorLevel: number; // 0..10
  preyLevel: number; // 0..10
  reproductionCooldownSec: number;
  eggDurationSec: number;
  spaceRequirement: number; // 0.2 tiny, 0.5 small, 1 medium, 3 large, 6 huge
  oxygenRequirement: number;
  wasteOutput: number;
  shelterRequirement: number;
  preferredDecorations: DecorationCategory[];

  palette: {
    primary: string;
    secondary: string;
    accent: string;
    fin: string;
    outline: string;
    pattern: 'solid' | 'stripe' | 'spots' | 'gradient' | 'banded' | 'ornate';
    bodyShape: 'sleek' | 'round' | 'angel' | 'betta' | 'seahorse' | 'flat' | 'long' | 'jelly' | 'ray';
  };
}

export interface DecorationEcosystemEffect {
  filtration?: number; // Water quality stabilization & algae reduction
  oxygen?: number; // Oxygen production
  shelter?: number; // Reduces predation risk & helps breeding
  circulation?: number; // Water flow & oxygen distribution
  temperatureDelta?: number; // + warms (heater), - cools (chiller)
  algaeReduction?: number; // Direct algae suppression
  visibilityBonus?: number; // Lighting beauty synergy
}

export interface DecorationData {
  id: string;
  /** @deprecated Internal English dev reference only — always render via LocalizationManager.getDecorationName(decor) */
  name: string;
  nameKey: string;
  descriptionKey: string;
  effectDescriptionKey: string;
  categoryKey: string;
  category: DecorationCategory;
  cost: number;
  gemCost?: number;
  beautyValue: number;
  spriteKey: string;
  preferredHabitat?: HabitatId;
  placementZone: 'floor' | 'mid' | 'surface' | 'substrate' | 'background';
  width: number;
  height: number;
  unlockRequirement: UnlockRequirement;
  /** @deprecated Internal English dev reference only — always render via LocalizationManager.getDecorationDescription(decor) */
  description: string;
  effects: DecorationEcosystemEffect;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    outline: string;
  };
  shape:
    | 'fern'
    | 'sword_plant'
    | 'kelp'
    | 'lotus'
    | 'bush_plant'
    | 'rock_boulder'
    | 'rock_arch'
    | 'crystal'
    | 'pagoda_rock'
    | 'staghorn'
    | 'brain_coral'
    | 'anemone'
    | 'sea_fan'
    | 'driftwood'
    | 'bonsai'
    | 'sunken_log'
    | 'substrate_sand'
    | 'substrate_pebbles'
    | 'substrate_volcanic'
    | 'amphora'
    | 'torii'
    | 'lantern'
    | 'castle'
    | 'gazebo'
    | 'chest'
    | 'pearl_clam'
    | 'submarine'
    | 'bg_tint'
    | 'air_stone'
    | 'filter_box'
    | 'water_pump'
    | 'heater'
    | 'chiller'
    | 'reef_light';
}

export interface CreatureData {
  id: string;
  /** @deprecated Internal English dev reference only — always render via LocalizationManager.getCreatureName(creature) */
  name: string;
  nameKey: string;
  descriptionKey: string;
  abilityKey: string;
  habitatKey: string;
  type: CreatureType;
  habitatId: HabitatId;
  allowedHabitats?: HabitatId[];
  movementProfile?: CreatureMovementProfile;
  encyclopediaCategory?: EncyclopediaCategory;
  rarity: Rarity;
  cost: number;
  tokenCost?: number;
  coinDropValue: number;
  coinDropIntervalSec: number;
  passiveIncomePerSec: number;
  algaeCleanRate: number; // Algae removed per minute
  waterCleanRate: number; // Water quality boost
  oxygenBonus: number;
  oxygenRequirement?: number;
  foodRequirement?: number;
  waterQualityRequirement?: number;
  minTemperature?: number;
  maxTemperature?: number;
  growthTimeSec?: number;
  sizeScale?: number;
  beautyValue: number;
  spaceRequirement: number;
  isLargeCreature?: boolean;
  /** @deprecated Internal English dev reference only — always render via LocalizationManager.getCreatureDescription(creature) */
  description: string;
  /** @deprecated Internal English dev reference only — always render via LocalizationManager.getCreatureAbility(creature) */
  specialAbility: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    outline: string;
  };
}

export interface HabitatData {
  id: HabitatId;
  mapNumber: number;
  name: string;
  subtitle: string;
  description: string;
  uniqueMechanic: string;
  specializationLabel: string;
  specializationBonus: {
    breedingSpeed?: number;
    growthSpeed?: number;
    incomeSpeed?: number;
    waterPurification?: number;
    creatureIncome?: number;
    beautyBonus?: number;
    rareDiscovery?: number;
    legendaryDiscovery?: number;
  };
  targetTemperature: number; // Ideal Celsius for this map
  currentStrength: number; // 0 (calm) .. 1 (strong river current)
  order: number;
  incomeMultiplier: number;
  tokenName: string;
  unlockRequirement: {
    aquariumLevel: number;
    discoveredFishCount: number;
    beautyScore: number;
    coinCost: number;
  };
  palette: {
    waterTop: string;
    waterMid: string;
    waterBottom: string;
    sunbeamColor: string;
    farSilhouette: string;
    midSilhouette: string;
    sandTop: string;
    sandBottom: string;
    ambientParticle: string;
  };
  ambientEffect:
    | 'sunbeams'
    | 'bubbles'
    | 'current'
    | 'spores'
    | 'brackish_roots'
    | 'plankton'
    | 'open_beams'
    | 'bioluminescence';
}

export interface UpgradeData {
  id: UpgradeId;
  name: string;
  description: string;
  baseCost: number;
  growthFactor: number;
  maxLevel: number;
  baseValue: number;
  valuePerLevel: number;
  unit: string;
  valueFormat: 'percent' | 'flat' | 'hours' | 'multiplier';
}

export interface LocalUpgradeData {
  id: LocalUpgradeId;
  name: string;
  description: string;
  baseCost: number;
  tokenBaseCost: number;
  growthFactor: number;
  maxLevel: number;
  baseValue: number;
  valuePerLevel: number;
  unit: string;
}

export interface ResearchNodeData {
  id: string;
  name: string;
  category: ResearchCategory;
  description: string;
  rpCost: number;
  maxLevel: number;
  effectPerLevel: number;
  effectUnit: string;
  requiresId?: string;
  effectKey:
    | 'growth_speed'
    | 'breeding_speed'
    | 'school_resilience'
    | 'filtration_power'
    | 'oxygen_efficiency'
    | 'algae_resistance'
    | 'fish_income_pct'
    | 'decoration_effect_pct'
    | 'beauty_bonus_pct'
    | 'rare_discovery_pct'
    | 'variant_chance_pct'
    | 'auto_collector'
    | 'auto_maintenance'
    | 'offline_bonus_pct';
}

export interface SpecialistData {
  id: string;
  name: string;
  role: string;
  rarity: Rarity;
  specialty: string;
  description: string;
  unlockRpCost: number;
  upgradeRpBase: number;
  maxLevel: number;
  baseBonusPct: number;
  bonusPerLevelPct: number;
  bonusKey:
    | 'breeding'
    | 'plants'
    | 'filtration'
    | 'offline'
    | 'rare_discovery'
    | 'beauty'
    | 'growth'
    | 'creature_income';
  avatarColor: string;
  accentColor: string;
}

export interface ConservationProjectData {
  id: string;
  name: string;
  description: string;
  coinCost: number;
  rpCost: number;
  minDiscoveredSpecies: number;
  permanentBonusLabel: string;
  bonusKey:
    | 'rare_discovery_pct'
    | 'water_efficiency_pct'
    | 'breeding_efficiency_pct'
    | 'global_income_pct'
    | 'variant_chance_pct';
  bonusValue: number;
}

export interface RewardData {
  coins?: number;
  gems?: number;
  xp?: number;
  researchPoints?: number;
  mapTokens?: number;
  unlockDecorationId?: string;
  unlockFishId?: string;
  incomeBonusPercent?: number;
  label: string;
}

export interface MissionData {
  id: string;
  title: string;
  description: string;
  metric: MissionMetric;
  target: number;
  reward: RewardData;
}

export interface CollectionRewardData {
  id: string;
  requiredDiscovered: number;
  habitatId?: HabitatId;
  title: string;
  reward: RewardData;
}

export interface EventThemeData {
  id: string;
  name: string;
  type: 'weekly' | 'limited_aquarium';
  description: string;
  objectiveText: string;
  target: number;
  active: boolean;
  limitedFishIds: string[];
  limitedDecorationIds: string[];
  currencyName: string;
  rewardLabel: string;
  accentColor: string;
}

export interface PlacedFish {
  instanceId: string;
  fishId: string;
  habitatId: HabitatId;
  level: number;
  placedAt: number;
  // Ecosystem & Lifecycle fields
  ageSec: number;
  growthStage: GrowthStage;
  health: number; // 0..100
  happiness: number; // 0..100
  stressStage: number; // 0 (calm) .. 6 (critical)
  hunger: number; // 0..100 (100 = full, 0 = starving)
  starvationSec: number; // Accumulated seconds at critical hunger
  variant: GeneticVariant;
  lastBredAt: number;
}

export interface PlacedEgg {
  eggId: string;
  fishId: string;
  habitatId: HabitatId;
  x: number; // Normalized 0.1..0.9
  y: number; // Normalized 0.78..0.88
  laidAt: number;
  hatchDurationSec: number;
  variant: GeneticVariant;
}

export interface PlacedCreature {
  instanceId: string;
  creatureId: string;
  habitatId: HabitatId;
  level: number;
  placedAt: number;
}

export interface PlacedDecoration {
  instanceId: string;
  decorationId: string;
  habitatId: HabitatId;
  x: number;
  y: number;
  flipped?: boolean;
}

export interface MapInstanceState {
  habitatId: HabitatId;
  mapLevel: number;
  mapXp: number;
  mapTokens: number;
  waterQuality: number; // 0..100
  oxygen: number; // 0..100
  algaeLevel: number; // 0..100 (0 = spotless glass, 100 = heavy algae)
  temperature: number; // Current Celsius
  localUpgrades: Record<LocalUpgradeId, number>;
  assignedSpecialistIds: string[]; // Max 2 active specialists per map
  claimedMasteryTiers: number[]; // 25, 50, 75, 90, 100%
  // Local Feeding, Storage, Food Factory & Auto Feeder (strictly per map)
  foodStored: number;
  foodStorageLevel: number; // 1..50
  foodFactoryLevel: number; // 1..30
  manualFeedCharges: number; // Active manual feeding energy
  manualFeedLastRechargeMs: number;
  autoFeederLevel: number; // 0 (off) .. 10+
  autoFeederUpgrades: Record<AutoFeederUpgradeId, number>;
  autoFeederLastRunMs: number;
  // Long-Term Map Mastery (No Reset!) & Retroactive Expansion
  masteryLevel: number; // 1..20
  expansionTier: number; // 0 (50 cap) -> 1 (75 cap) -> 2 (100 cap)
}

export interface ActiveMissionState {
  missionId: string;
  progress: number;
  claimed: boolean;
}

export interface BeautyBreakdown {
  fishVariety: number; // Max 20
  plantVariety: number; // Max 15
  decorationScore: number; // Max 15
  rarityScore: number; // Max 15
  balanceScore: number; // Max 10
  waterQualityScore: number; // Max 10
  schoolingActivity: number; // Max 8
  creatureBonus: number; // Max 7
  total: number; // 0 to 100
}

export interface EcosystemStatus {
  waterQuality: number;
  waterState: WaterQualityState;
  oxygen: number;
  algaeLevel: number;
  temperature: number;
  targetTemperature: number;
  spaceUsed: number;
  spaceMax: number;
  speciesUsed: number;
  speciesMax: number;
  totalFiltration: number;
  totalOxygenGen: number;
  totalOxygenDemand: number;
  totalShelter: number;
  warnings: string[];
  ecosystemEfficiency: number; // 0.4 .. 1.15
  predationRisk: number; // 0..1
  breedingReadySpecies: string[];
  // Feeding & Hunger telemetry
  avgHunger: number; // 0..100
  hungryFishCount: number;
  starvingFishCount: number;
  criticalFishCount: number;
  foodStored: number;
  foodCapacity: number;
  foodProductionPerMin: number;
  foodConsumptionPerMin: number;
  autoFeederActive: boolean;
}

export interface OfflineEarningsReport {
  awaySeconds: number;
  cappedSeconds: number;
  coinsEarned: number;
  researchPointsEarned: number;
  fishGrewCount: number;
  fishBornCount: number;
  waterQualityAtReturn: number;
  efficiencyMultiplier: number;
  ecosystemEfficiency: number;
  capHours: number;
  wasCapped: boolean;
  newDiscoveryName?: string;
  // Offline Feeding Summary
  foodUsed: number;
  fishFedCount: number;
  avgHungerAtReturn: number;
  needsAttention: boolean;
}

export interface LevelUpNotification {
  fromLevel: number;
  toLevel: number;
  mapName?: string;
  unlockedFishIds: string[];
  unlockedDecorationIds: string[];
  gemBonus: number;
  rpBonus: number;
}

export interface DiscoveryNotification {
  fishId: string;
  variant?: GeneticVariant;
  isNewDiscovery: boolean;
  source: 'purchase' | 'rare_visitor' | 'milestone' | 'ad_reward' | 'breeding';
  bonusCoins: number;
  bonusGems: number;
  bonusRp: number;
}

export interface VisitorRemark {
  id: string;
  visitorName: string;
  visitorRole: string;
  message: string;
  accentColor: string;
}

export interface FeedbackPopup {
  id: string;
  text: string;
  kind: 'coin' | 'gem' | 'xp' | 'beauty' | 'rp' | 'info' | 'warning';
  x: number;
  y: number;
}

export interface FlyingCoin {
  id: string;
  startX: number;
  startY: number;
  amountLabel?: string;
}

export type GraphicsQualityPreset = 'low' | 'medium' | 'high';

export type DisplaySizePreference = 'auto' | 'smaller' | 'larger';

export interface GameSettings {
  soundEnabled: boolean;
  ambientEnabled: boolean;
  showTutorial: boolean;
  reducedMotion: boolean;
  displaySize: DisplaySizePreference;
  graphicsQuality?: GraphicsQualityPreset;
}

export interface SaveGameState {
  version: number;
  coins: number;
  totalCoinsEarned: number;
  gems: number;
  researchPoints: number;
  collectionPoints: number;
  aquariumLevel: number; // Global Aquarium Rank (1..50)
  aquariumXp: number;
  activeHabitatId: HabitatId;
  unlockedHabitats: HabitatId[];
  mapStates: Record<HabitatId, MapInstanceState>;
  discoveredFishIds: string[];
  discoveredVariants: Record<string, GeneticVariant[]>;
  discoveredCreatureIds: string[];
  fishSpeciesLevels: Record<string, number>;
  placedFish: PlacedFish[];
  placedEggs: PlacedEgg[];
  placedCreatures: PlacedCreature[];
  storedFish: {
    instanceId: string;
    fishId: string;
    level: number;
    ageSec?: number;
    growthStage?: GrowthStage;
    variant?: GeneticVariant;
  }[];
  ownedDecorations: Record<string, number>;
  placedDecorations: PlacedDecoration[];
  activeSubstrates: Partial<Record<HabitatId, string>>;
  activeBackgrounds: Partial<Record<HabitatId, string>>;
  upgradeLevels: Record<UpgradeId, number>;
  researchLevels: Record<string, number>;
  unlockedSpecialists: Record<string, number>; // specialistId -> level
  completedConservationIds: string[];
  claimedCollectionRewards: string[];
  claimedBeautyMilestones: number[];
  claimedMilestoneIds: string[];
  discoveredDates: Record<string, number>; // fishId or creatureId -> timestamp
  dailyMissions: ActiveMissionState[];
  lastMissionResetDate: string;
  weeklyEventProgress: number;
  weeklyEventClaimed: boolean;
  lastLoginTime: number;
  feedBoostEndsAt: number;
  adBoostEndsAt: number;
  adRemoved: boolean;
  tutorialStep: number;
  tutorial: TutorialSaveData;
  stats: {
    timesFed: number;
    rareVisitorsTapped: number;
    decorationsPlacedTotal: number;
    fishPurchasedTotal: number;
    fishBredTotal: number;
    fishGrownTotal: number;
    creatureCoinsCollected: number;
    algaeCleanedTotal: number;
    autoFeedsTriggered: number;
    fishDiedStarvation: number;
    foodProducedTotal: number;
  };
  settings: GameSettings;
}

export type ActivePanelId =
  | null
  | 'fish'
  | 'decor'
  | 'collection'
  | 'upgrades'
  | 'habitats'
  | 'research'
  | 'missions'
  | 'feeding'
  | 'settings';
