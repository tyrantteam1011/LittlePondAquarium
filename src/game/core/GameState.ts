import { GAME_CONFIG, getTodayDateKey } from './GameConfig';
import {
  GeneticVariant,
  GrowthStage,
  HabitatId,
  MapInstanceState,
  PlacedFish,
  SaveGameState,
} from './types';
import { MISSION_CATALOG } from '../data/missionCatalog';
import { HABITAT_BY_ID, HABITAT_CATALOG } from '../data/habitatCatalog';
import { FISH_BY_ID } from '../data/fishCatalog';
import {
  createDefaultTutorialSave,
  sanitizeTutorialSave,
} from '../tutorial/TutorialManager';

const VALID_HABITATS: HabitatId[] = HABITAT_CATALOG.map((h) => h.id);

export function migrateHabitatId(rawId: string | undefined): HabitatId {
  if (!rawId) return 'pond';
  if (VALID_HABITATS.includes(rawId as HabitatId)) {
    return rawId as HabitatId;
  }
  switch (rawId) {
    case 'freshwater':
      return 'pond';
    case 'tropical':
      return 'lake';
    case 'arctic':
      return 'deep_ocean';
    default:
      return 'pond';
  }
}

export function createDefaultMapState(habitatId: HabitatId): MapInstanceState {
  const def = HABITAT_BY_ID[habitatId];
  const now = Date.now();
  return {
    habitatId,
    mapLevel: 1,
    mapXp: 0,
    mapTokens: habitatId === 'pond' ? 5 : 0,
    waterQuality: 92,
    oxygen: 90,
    algaeLevel: 8,
    temperature: def?.targetTemperature ?? 22,
    localUpgrades: {
      species_capacity: 0,
      tank_space: 0,
      oxygen_system: 0,
      filtration_system: 0,
      creature_income: 0,
      breeding_care: 0,
    },
    assignedSpecialistIds: [],
    claimedMasteryTiers: [],
    foodStored: 65,
    foodStorageLevel: 1,
    foodFactoryLevel: 1,
    manualFeedCharges: 5,
    manualFeedLastRechargeMs: now,
    autoFeederLevel: 0,
    autoFeederUpgrades: {
      feeding_speed: 0,
      feeding_capacity: 0,
      feeding_efficiency: 0,
      feeding_range: 0,
      smart_targeting: 0,
      advanced_feeder: 0,
      ai_feeder: 0,
    },
    autoFeederLastRunMs: now,
    masteryLevel: 1,
    expansionTier: 0,
  };
}

export function createAllDefaultMapStates(): Record<HabitatId, MapInstanceState> {
  return Object.fromEntries(
    HABITAT_CATALOG.map((h) => [h.id, createDefaultMapState(h.id)])
  ) as Record<HabitatId, MapInstanceState>;
}

export function createInitialGameState(): SaveGameState {
  const now = Date.now();
  const initialMissions = MISSION_CATALOG.slice(
    0,
    GAME_CONFIG.ACTIVE_DAILY_MISSIONS_COUNT
  ).map((m) => ({
    missionId: m.id,
    progress: 0,
    claimed: false,
  }));

  return {
    version: GAME_CONFIG.SAVE_VERSION,
    coins: GAME_CONFIG.STARTING_COINS,
    totalCoinsEarned: GAME_CONFIG.STARTING_COINS,
    gems: GAME_CONFIG.STARTING_GEMS,
    researchPoints: GAME_CONFIG.STARTING_RP,
    collectionPoints: 10,
    aquariumLevel: 1,
    aquariumXp: 0,
    activeHabitatId: 'pond',
    unlockedHabitats: ['pond'],
    mapStates: createAllDefaultMapStates(),
    discoveredFishIds: ['guppy'],
    discoveredVariants: { guppy: ['normal'] },
    discoveredCreatureIds: ['pond_snail'],
    fishSpeciesLevels: { guppy: 1 },
    placedFish: [
      {
        instanceId: 'starter_guppy_1',
        fishId: 'guppy',
        habitatId: 'pond',
        level: 1,
        placedAt: now,
        ageSec: 55,
        growthStage: 'adult',
        health: 96,
        happiness: 94,
        stressStage: 0,
        hunger: 92,
        starvationSec: 0,
        variant: 'normal',
        lastBredAt: now - 35_000,
      },
      {
        instanceId: 'starter_guppy_2',
        fishId: 'guppy',
        habitatId: 'pond',
        level: 1,
        placedAt: now,
        ageSec: 32,
        growthStage: 'juvenile',
        health: 95,
        happiness: 92,
        stressStage: 0,
        hunger: 90,
        starvationSec: 0,
        variant: 'normal',
        lastBredAt: now - 35_000,
      },
    ],
    placedEggs: [],
    placedCreatures: [
      {
        instanceId: 'starter_snail_1',
        creatureId: 'pond_snail',
        habitatId: 'pond',
        level: 1,
        placedAt: now,
      },
    ],
    storedFish: [],
    ownedDecorations: {
      java_fern: 1,
      river_slate: 1,
      air_stone: 1,
      golden_sand: 1,
    },
    placedDecorations: [
      {
        instanceId: 'starter_decor_fern',
        decorationId: 'java_fern',
        habitatId: 'pond',
        x: 0.2,
        y: 0.84,
      },
      {
        instanceId: 'starter_decor_airstone',
        decorationId: 'air_stone',
        habitatId: 'pond',
        x: 0.48,
        y: 0.88,
      },
      {
        instanceId: 'starter_decor_rock',
        decorationId: 'river_slate',
        habitatId: 'pond',
        x: 0.76,
        y: 0.86,
      },
    ],
    activeSubstrates: {
      pond: 'golden_sand',
    },
    activeBackgrounds: {},
    upgradeLevels: {
      fish_income: 0,
      offline_income: 0,
      aquarium_capacity: 0,
      beauty_bonus: 0,
      collection_bonus: 0,
      income_multiplier: 0,
    },
    researchLevels: {},
    unlockedSpecialists: {},
    completedConservationIds: [],
    claimedCollectionRewards: [],
    claimedBeautyMilestones: [],
    claimedMilestoneIds: [],
    discoveredDates: {
      guppy: now,
      pond_snail: now,
    },
    dailyMissions: initialMissions,
    lastMissionResetDate: getTodayDateKey(),
    weeklyEventProgress: 2,
    weeklyEventClaimed: false,
    lastLoginTime: now,
    feedBoostEndsAt: 0,
    adBoostEndsAt: 0,
    adRemoved: false,
    tutorialStep: 0,
    tutorial: createDefaultTutorialSave(),
    stats: {
      timesFed: 0,
      rareVisitorsTapped: 0,
      decorationsPlacedTotal: 3,
      fishPurchasedTotal: 0,
      fishBredTotal: 0,
      fishGrownTotal: 0,
      creatureCoinsCollected: 0,
      algaeCleanedTotal: 0,
      autoFeedsTriggered: 0,
      fishDiedStarvation: 0,
      foodProducedTotal: 0,
    },
    settings: {
      soundEnabled: true,
      ambientEnabled: true,
      showTutorial: true,
      reducedMotion: false,
    },
  };
}

function normalizePlacedFish(fish: Partial<PlacedFish>, now: number): PlacedFish | null {
  if (!fish.fishId || !FISH_BY_ID[fish.fishId]) return null;
  const def = FISH_BY_ID[fish.fishId];
  const validStages: GrowthStage[] = ['baby', 'juvenile', 'adult', 'breeding_adult'];
  const validVariants: GeneticVariant[] = ['normal', 'golden', 'albino', 'sakura', 'prism', 'longfin'];
  const growthStage = validStages.includes(fish.growthStage as GrowthStage)
    ? (fish.growthStage as GrowthStage)
    : 'adult';
  const defaultAge =
    growthStage === 'baby'
      ? 0
      : growthStage === 'juvenile'
        ? def.growthTimeSec * 0.35
        : growthStage === 'adult'
          ? def.growthTimeSec * 0.72
          : def.growthTimeSec;

  return {
    instanceId: fish.instanceId ?? `fish_${Math.random().toString(36).slice(2, 8)}`,
    fishId: fish.fishId,
    habitatId: migrateHabitatId(fish.habitatId),
    level: Math.max(1, Math.floor(Number(fish.level ?? 1))),
    placedAt: Number.isFinite(fish.placedAt) ? Number(fish.placedAt) : now,
    ageSec: Number.isFinite(fish.ageSec) ? Math.max(0, Number(fish.ageSec)) : defaultAge,
    growthStage,
    health: Number.isFinite(fish.health) ? Math.max(10, Math.min(100, Number(fish.health))) : 94,
    happiness: Number.isFinite(fish.happiness)
      ? Math.max(10, Math.min(100, Number(fish.happiness)))
      : 92,
    stressStage: Number.isFinite(fish.stressStage)
      ? Math.max(0, Math.min(6, Math.floor(Number(fish.stressStage))))
      : 0,
    hunger: Number.isFinite(fish.hunger)
      ? Math.max(0, Math.min(100, Number(fish.hunger)))
      : 90,
    starvationSec: Number.isFinite(fish.starvationSec)
      ? Math.max(0, Number(fish.starvationSec))
      : 0,
    variant: validVariants.includes(fish.variant as GeneticVariant)
      ? (fish.variant as GeneticVariant)
      : 'normal',
    lastBredAt: Number.isFinite(fish.lastBredAt) ? Number(fish.lastBredAt) : now - 30_000,
  };
}

export function sanitizeLoadedState(raw: Partial<SaveGameState>): SaveGameState {
  const defaults = createInitialGameState();
  const now = Date.now();

  const unlockedHabitats =
    Array.isArray(raw.unlockedHabitats) && raw.unlockedHabitats.length > 0
      ? Array.from(new Set(raw.unlockedHabitats.map((id) => migrateHabitatId(id))))
      : defaults.unlockedHabitats;

  if (!unlockedHabitats.includes('pond')) {
    unlockedHabitats.unshift('pond');
  }

  let activeHabitatId = migrateHabitatId(raw.activeHabitatId);
  if (!unlockedHabitats.includes(activeHabitatId)) {
    activeHabitatId = 'pond';
  }

  // Merge map states for all 8 habitats
  const defaultMapStates = createAllDefaultMapStates();
  const rawMapStates = (raw.mapStates ?? {}) as Partial<Record<string, Partial<MapInstanceState>>>;
  const mapStates: Record<HabitatId, MapInstanceState> = { ...defaultMapStates };
  for (const h of HABITAT_CATALOG) {
    const existing = rawMapStates[h.id];
    if (existing) {
      mapStates[h.id] = {
        ...defaultMapStates[h.id],
        ...existing,
        habitatId: h.id,
        mapLevel: Math.max(1, Math.floor(Number(existing.mapLevel ?? 1))),
        mapXp: Math.max(0, Number(existing.mapXp ?? 0)),
        mapTokens: Math.max(0, Math.floor(Number(existing.mapTokens ?? 0))),
        waterQuality: Math.max(0, Math.min(100, Number(existing.waterQuality ?? 90))),
        oxygen: Math.max(0, Math.min(100, Number(existing.oxygen ?? 90))),
        algaeLevel: Math.max(0, Math.min(100, Number(existing.algaeLevel ?? 8))),
        temperature: Number.isFinite(existing.temperature)
          ? Number(existing.temperature)
          : h.targetTemperature,
        localUpgrades: {
          ...defaultMapStates[h.id].localUpgrades,
          ...(existing.localUpgrades ?? {}),
        },
        assignedSpecialistIds: Array.isArray(existing.assignedSpecialistIds)
          ? existing.assignedSpecialistIds.slice(0, GAME_CONFIG.MAX_SPECIALISTS_PER_MAP)
          : [],
        claimedMasteryTiers: Array.isArray(existing.claimedMasteryTiers)
          ? existing.claimedMasteryTiers
          : [],
        foodStored: Number.isFinite(existing.foodStored) ? Math.max(0, Number(existing.foodStored)) : 65,
        foodStorageLevel: Math.max(1, Math.min(50, Math.floor(Number(existing.foodStorageLevel ?? 1)))),
        foodFactoryLevel: Math.max(1, Math.min(30, Math.floor(Number(existing.foodFactoryLevel ?? 1)))),
        manualFeedCharges: Number.isFinite(existing.manualFeedCharges)
          ? Math.max(0, Math.min(10, Math.floor(Number(existing.manualFeedCharges))))
          : 5,
        manualFeedLastRechargeMs: Number.isFinite(existing.manualFeedLastRechargeMs)
          ? Number(existing.manualFeedLastRechargeMs)
          : now,
        autoFeederLevel: Math.max(0, Math.min(12, Math.floor(Number(existing.autoFeederLevel ?? 0)))),
        autoFeederUpgrades: {
          ...defaultMapStates[h.id].autoFeederUpgrades,
          ...(existing.autoFeederUpgrades ?? {}),
        },
        autoFeederLastRunMs: Number.isFinite(existing.autoFeederLastRunMs)
          ? Number(existing.autoFeederLastRunMs)
          : now,
        masteryLevel: Math.max(1, Math.min(20, Math.floor(Number(existing.masteryLevel ?? 1)))),
        expansionTier: Math.max(0, Math.min(2, Math.floor(Number(existing.expansionTier ?? 0)))),
      };
    }
  }

  // Migrate placed fish & filter out any obsolete species IDs safely
  const rawFish = Array.isArray(raw.placedFish) ? raw.placedFish : defaults.placedFish;
  const normalizedFish = rawFish
    .map((f) => normalizePlacedFish(f, now))
    .filter((f): f is PlacedFish => f !== null);

  const placedFish = normalizedFish.length > 0 ? normalizedFish : defaults.placedFish;

  // Migrate placed decorations
  const rawDecor = Array.isArray(raw.placedDecorations)
    ? raw.placedDecorations
    : defaults.placedDecorations;
  const placedDecorations = rawDecor.map((d) => ({
    ...d,
    habitatId: migrateHabitatId(d.habitatId),
  }));

  // Migrate substrates & backgrounds
  const activeSubstrates: Partial<Record<HabitatId, string>> = {};
  if (raw.activeSubstrates) {
    for (const [k, v] of Object.entries(raw.activeSubstrates)) {
      if (v) activeSubstrates[migrateHabitatId(k)] = v;
    }
  } else {
    activeSubstrates.pond = 'golden_sand';
  }

  const activeBackgrounds: Partial<Record<HabitatId, string>> = {};
  if (raw.activeBackgrounds) {
    for (const [k, v] of Object.entries(raw.activeBackgrounds)) {
      if (v) activeBackgrounds[migrateHabitatId(k)] = v;
    }
  }

  const discoveredFishIds =
    Array.isArray(raw.discoveredFishIds) && raw.discoveredFishIds.length > 0
      ? Array.from(new Set(raw.discoveredFishIds.filter((id) => Boolean(FISH_BY_ID[id]))))
      : defaults.discoveredFishIds;
  if (discoveredFishIds.length === 0) discoveredFishIds.push('guppy');

  const placedCreatures = Array.isArray(raw.placedCreatures)
    ? raw.placedCreatures.map((c) => ({ ...c, habitatId: migrateHabitatId(c.habitatId) }))
    : defaults.placedCreatures;

  const placedEggs = Array.isArray(raw.placedEggs)
    ? raw.placedEggs.map((e) => ({ ...e, habitatId: migrateHabitatId(e.habitatId) }))
    : [];

  return {
    ...defaults,
    ...raw,
    version: GAME_CONFIG.SAVE_VERSION,
    coins: Math.max(0, Number.isFinite(raw.coins) ? Number(raw.coins) : defaults.coins),
    totalCoinsEarned: Math.max(
      0,
      Number.isFinite(raw.totalCoinsEarned) ? Number(raw.totalCoinsEarned) : defaults.totalCoinsEarned
    ),
    gems: Math.max(0, Number.isFinite(raw.gems) ? Number(raw.gems) : defaults.gems),
    researchPoints: Math.max(
      0,
      Number.isFinite(raw.researchPoints) ? Number(raw.researchPoints) : defaults.researchPoints
    ),
    collectionPoints: Math.max(
      0,
      Number.isFinite(raw.collectionPoints)
        ? Number(raw.collectionPoints)
        : discoveredFishIds.length * 10
    ),
    aquariumLevel: Math.max(
      1,
      Math.min(
        GAME_CONFIG.MAX_AQUARIUM_LEVEL,
        Number.isFinite(raw.aquariumLevel) ? Math.floor(Number(raw.aquariumLevel)) : 1
      )
    ),
    aquariumXp: Math.max(0, Number.isFinite(raw.aquariumXp) ? Number(raw.aquariumXp) : 0),
    activeHabitatId,
    unlockedHabitats,
    mapStates,
    discoveredFishIds,
    discoveredVariants: raw.discoveredVariants ?? defaults.discoveredVariants,
    discoveredCreatureIds: Array.isArray(raw.discoveredCreatureIds)
      ? Array.from(new Set(raw.discoveredCreatureIds))
      : defaults.discoveredCreatureIds,
    placedFish,
    placedEggs,
    placedCreatures,
    storedFish: Array.isArray(raw.storedFish) ? raw.storedFish : [],
    ownedDecorations: raw.ownedDecorations ?? defaults.ownedDecorations,
    placedDecorations,
    activeSubstrates,
    activeBackgrounds,
    upgradeLevels: {
      ...defaults.upgradeLevels,
      ...(raw.upgradeLevels ?? {}),
    },
    researchLevels: raw.researchLevels ?? {},
    unlockedSpecialists: raw.unlockedSpecialists ?? {},
    completedConservationIds: Array.isArray(raw.completedConservationIds)
      ? raw.completedConservationIds
      : [],
    claimedCollectionRewards: Array.isArray(raw.claimedCollectionRewards)
      ? raw.claimedCollectionRewards
      : [],
    claimedBeautyMilestones: Array.isArray(raw.claimedBeautyMilestones)
      ? raw.claimedBeautyMilestones
      : [],
    claimedMilestoneIds: Array.isArray(raw.claimedMilestoneIds)
      ? raw.claimedMilestoneIds
      : [],
    discoveredDates: {
      ...defaults.discoveredDates,
      ...(raw.discoveredDates ?? {}),
    },
    dailyMissions:
      Array.isArray(raw.dailyMissions) && raw.dailyMissions.length > 0
        ? raw.dailyMissions
        : defaults.dailyMissions,
    weeklyEventProgress: Number.isFinite(raw.weeklyEventProgress)
      ? Number(raw.weeklyEventProgress)
      : placedFish.length,
    weeklyEventClaimed: Boolean(raw.weeklyEventClaimed),
    tutorial: sanitizeTutorialSave(raw.tutorial, raw.tutorialStep),
    stats: {
      ...defaults.stats,
      ...(raw.stats ?? {}),
    },
    settings: {
      ...defaults.settings,
      ...(raw.settings ?? {}),
    },
  };
}
