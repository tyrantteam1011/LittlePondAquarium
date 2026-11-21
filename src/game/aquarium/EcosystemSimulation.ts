import { GAME_CONFIG } from '../core/GameConfig';
import {
  CompatibilityRelation,
  EcosystemStatus,
  FishData,
  GeneticVariant,
  GrowthStage,
  HabitatId,
  PlacedEgg,
  PlacedFish,
  ResearchNodeData,
  SaveGameState,
  SpecialistData,
  WaterQualityState,
} from '../core/types';
import { FISH_BY_ID, FISH_CATALOG } from '../data/fishCatalog';
import { DECORATION_BY_ID } from '../data/decorationCatalog';
import { CREATURE_BY_ID, CREATURE_CATALOG } from '../data/creatureCatalog';
import { HABITAT_BY_ID } from '../data/habitatCatalog';
import { RESEARCH_CATALOG } from '../data/researchCatalog';
import { SPECIALIST_BY_ID } from '../data/specialistCatalog';
import { CONSERVATION_CATALOG } from '../data/conservationCatalog';
import {
  getLocalUpgradeValue,
  getMapSpaceCapacity,
  getMapSpeciesCapacity,
} from '../economy/UpgradeSystem';
import {
  getMapFoodConsumptionPerMin,
  getMapHungerSummary,
  stepFishHunger,
} from '../feeding/HungerSystem';
import {
  getFoodFactoryRatePerMin,
  getFoodStorageCapacity,
  stepLocalFoodFactory,
  syncManualFeedCharges,
} from '../feeding/FeedingSystem';
import { runAutoFeederTick } from '../feeding/AutoFeederSystem';
import { getGlobalMilestoneBonuses } from '../progression/MilestoneSystem';
import { LocalizationManager } from '../localization/LocalizationManager';
import { getMapMasteryBonuses } from '../progression/MapMasterySystem';

export interface EcosystemStepEvents {
  grownFishIds: string[];
  laidEggs: PlacedEgg[];
  hatchedFish: PlacedFish[];
  starvedFish: PlacedFish[];
  autoFeeds: { habitatId: HabitatId; fedCount: number; foodUsed: number }[];
  rpEarned: number;
}

export function getResearchBonus(
  state: SaveGameState,
  effectKey: ResearchNodeData['effectKey']
): number {
  let total = 0;
  for (const node of RESEARCH_CATALOG) {
    if (node.effectKey !== effectKey) continue;
    const lv = state.researchLevels[node.id] ?? 0;
    if (lv > 0) {
      total += lv * node.effectPerLevel;
    }
  }
  return total;
}

export function getMapSpecialistBonus(
  state: SaveGameState,
  habitatId: HabitatId,
  bonusKey: SpecialistData['bonusKey']
): number {
  const mapState = state.mapStates[habitatId];
  if (!mapState) return 0;
  let total = 0;
  for (const specId of mapState.assignedSpecialistIds) {
    const spec = SPECIALIST_BY_ID[specId];
    const lv = state.unlockedSpecialists[specId] ?? 0;
    if (!spec || lv <= 0 || spec.bonusKey !== bonusKey) continue;
    total += spec.baseBonusPct + (lv - 1) * spec.bonusPerLevelPct;
  }
  return total;
}

export function getConservationBonus(
  state: SaveGameState,
  bonusKey:
    | 'rare_discovery_pct'
    | 'water_efficiency_pct'
    | 'breeding_efficiency_pct'
    | 'global_income_pct'
    | 'variant_chance_pct'
): number {
  let total = 0;
  for (const proj of CONSERVATION_CATALOG) {
    if (proj.bonusKey !== bonusKey) continue;
    if (state.completedConservationIds.includes(proj.id)) {
      total += proj.bonusValue;
    }
  }
  return total;
}

export function getWaterQualityState(waterQuality: number): WaterQualityState {
  if (waterQuality >= 85) return 'Perfect';
  if (waterQuality >= 65) return 'Good';
  if (waterQuality >= 45) return 'Dirty';
  if (waterQuality >= 25) return 'Very Dirty';
  return 'Polluted';
}

export function getGrowthStageFromAge(ageSec: number, growthTimeSec: number): GrowthStage {
  const safeDuration = Math.max(30, growthTimeSec);
  const ratio = ageSec / safeDuration;
  if (ratio < 0.28) return 'baby';
  if (ratio < 0.65) return 'juvenile';
  if (ratio < 1.0) return 'adult';
  return 'breeding_adult';
}

export function getFishCompatibility(a: FishData, b: FishData): CompatibilityRelation {
  if (a.id === b.id) return 'Compatible';
  if (a.predatorLevel >= 7 && b.preyLevel >= 6 && a.predatorLevel > b.predatorLevel + 2) {
    return 'Predator';
  }
  if (b.predatorLevel >= 7 && a.preyLevel >= 6 && b.predatorLevel > a.predatorLevel + 2) {
    return 'Prey';
  }
  if (a.aggression >= 6 && b.aggression >= 6) return 'Territorial';
  if (a.aggression >= 7 && b.aggression <= 1) return 'Dangerous';
  if (a.dietType === 'filter' || b.dietType === 'filter') return 'Symbiotic';
  if (a.preferredHabitat === b.preferredHabitat) return 'Compatible';
  return 'Neutral';
}

export function calculateEcosystemStatus(
  state: SaveGameState,
  habitatId: HabitatId = state.activeHabitatId
): EcosystemStatus {
  const mapState = state.mapStates[habitatId];
  const habitat = HABITAT_BY_ID[habitatId];
  const fishInMap = state.placedFish.filter((f) => f.habitatId === habitatId);
  const creaturesInMap = state.placedCreatures.filter((c) => c.habitatId === habitatId);
  const decorInMap = state.placedDecorations.filter((d) => d.habitatId === habitatId);

  const decorBoost = 1 + getResearchBonus(state, 'decoration_effect_pct') / 100;
  const plantSpecBoost = 1 + getMapSpecialistBonus(state, habitatId, 'plants') / 100;
  const filterBoost =
    1 +
    (getResearchBonus(state, 'filtration_power') +
      getMapSpecialistBonus(state, habitatId, 'filtration') +
      getConservationBonus(state, 'water_efficiency_pct')) /
      100 +
    (habitat?.specializationBonus.waterPurification ?? 0);
  const oxygenResearchBoost = 1 + getResearchBonus(state, 'oxygen_efficiency') / 100;

  let totalFiltration = getLocalUpgradeValue(
    'filtration_system',
    mapState?.localUpgrades.filtration_system ?? 0
  );
  let totalOxygenGen = getLocalUpgradeValue(
    'oxygen_system',
    mapState?.localUpgrades.oxygen_system ?? 0
  );
  let totalShelter = 4;
  let tempDelta = 0;

  for (const d of decorInMap) {
    const def = DECORATION_BY_ID[d.decorationId];
    if (!def) continue;
    const isPlant = def.category === 'Plants';
    const mult = decorBoost * (isPlant ? plantSpecBoost : 1);
    totalFiltration += (def.effects.filtration ?? 0) * mult;
    totalOxygenGen += (def.effects.oxygen ?? 0) * mult;
    totalShelter += (def.effects.shelter ?? 0) * decorBoost;
    tempDelta += def.effects.temperatureDelta ?? 0;
  }

  let spaceUsed = 0;
  let totalOxygenDemand = 0;
  let totalWaste = 0;
  let maxPredator = 0;
  let vulnerablePreyCount = 0;
  const speciesCounts: Record<string, number> = {};
  const breedingAdultsBySpecies: Record<string, number> = {};

  for (const placed of fishInMap) {
    const def = FISH_BY_ID[placed.fishId];
    if (!def) continue;
    const sizeScale = GAME_CONFIG.GROWTH_STAGE_VISUAL_SCALE[placed.growthStage] ?? 1;
    spaceUsed += def.spaceRequirement * sizeScale;
    totalOxygenDemand += def.oxygenRequirement * sizeScale;
    totalWaste += def.wasteOutput * sizeScale;
    maxPredator = Math.max(maxPredator, def.predatorLevel);
    if (def.preyLevel >= 6) vulnerablePreyCount += 1;
    speciesCounts[placed.fishId] = (speciesCounts[placed.fishId] ?? 0) + 1;
    if (placed.growthStage === 'breeding_adult' && placed.health >= 70) {
      breedingAdultsBySpecies[placed.fishId] =
        (breedingAdultsBySpecies[placed.fishId] ?? 0) + 1;
    }
  }

  for (const c of creaturesInMap) {
    const def = CREATURE_BY_ID[c.creatureId];
    if (!def) continue;
    spaceUsed += def.spaceRequirement;
    totalFiltration += def.waterCleanRate;
    totalOxygenGen += def.oxygenBonus;
    totalOxygenDemand += def.oxygenRequirement ?? 0;
  }

  totalFiltration *= filterBoost;
  totalOxygenGen *= oxygenResearchBoost;

  const spaceMax = getMapSpaceCapacity(state, habitatId);
  const speciesMax = getMapSpeciesCapacity(state, habitatId);
  const speciesUsed = fishInMap.length;

  const waterQuality = mapState?.waterQuality ?? 92;
  const oxygen = mapState?.oxygen ?? 90;
  const algaeLevel = mapState?.algaeLevel ?? 8;
  const targetTemperature = habitat?.targetTemperature ?? 22;
  const temperature = Number((targetTemperature + tempDelta).toFixed(1));

  // Predation risk if big predators share tank with small prey without enough shelter
  let predationRisk = 0;
  if (maxPredator >= 7 && vulnerablePreyCount > 0) {
    const shelterMitigation = Math.min(0.85, totalShelter / 45);
    predationRisk = Number(Math.max(0, 0.75 * (1 - shelterMitigation)).toFixed(2));
  }

  const warnings: string[] = [];
  if (waterQuality < 65) warnings.push(LocalizationManager.get('WARN_WATER_CLOUDY'));
  if (algaeLevel >= 38) warnings.push(LocalizationManager.get('WARN_ALGAE_GLASS'));
  if (oxygen < 65) warnings.push(LocalizationManager.get('WARN_LOW_OXYGEN'));
  if (spaceUsed > spaceMax) warnings.push(LocalizationManager.get('WARN_TANK_CROWDED'));
  if (predationRisk > 0.3) warnings.push(LocalizationManager.get('WARN_PREDATOR_STRESS'));

  // Check schooling warnings
  let underSchooledSpecies = 0;
  for (const [fishId, count] of Object.entries(speciesCounts)) {
    const def = FISH_BY_ID[fishId];
    if (def && def.minimumSchoolSize > 1 && count < def.minimumSchoolSize) {
      underSchooledSpecies += 1;
      if (warnings.length < 3) {
        warnings.push(
          LocalizationManager.get('WARN_SCHOOL_NEEDED', {
            name: LocalizationManager.getFishName(def),
            min: def.minimumSchoolSize,
            cur: count,
          })
        );
      }
    }
  }

  const breedingReadySpecies = Object.entries(breedingAdultsBySpecies)
    .filter(([, count]) => count >= 2)
    .map(([fishId]) => fishId);

  const waterState = getWaterQualityState(waterQuality);

  // Ecosystem Efficiency (Section 33: 100% healthy, 70% dirty/stressed, 40% polluted)
  let ecosystemEfficiency = 1.0;
  if (waterQuality >= 85 && oxygen >= 80 && spaceUsed <= spaceMax && underSchooledSpecies === 0) {
    ecosystemEfficiency = 1.1; // Thriving bonus!
  } else if (waterQuality < 35 || oxygen < 35) {
    ecosystemEfficiency = 0.4;
  } else if (waterQuality < 65 || oxygen < 60 || spaceUsed > spaceMax) {
    ecosystemEfficiency = 0.7;
  }

  // Subtle penalty if waste drastically exceeds filtration
  if (totalWaste > totalFiltration * 1.4) {
    ecosystemEfficiency = Math.min(ecosystemEfficiency, 0.75);
  }

  const foodCapacity = getFoodStorageCapacity(
    mapState?.foodStorageLevel ?? 1,
    mapState?.masteryLevel ?? 1
  );
  const foodStored = Math.round(mapState?.foodStored ?? 0);
  const foodProductionPerMin = getFoodFactoryRatePerMin(
    mapState?.foodFactoryLevel ?? 1,
    mapState?.masteryLevel ?? 1
  );
  const milestoneBonuses = getGlobalMilestoneBonuses(state);
  const foodConsumptionPerMin = getMapFoodConsumptionPerMin(
    state,
    habitatId,
    milestoneBonuses.food_efficiency_pct
  );
  const hungerSummary = getMapHungerSummary(state, habitatId, foodStored, foodCapacity);
  for (const hw of hungerSummary.warnings) {
    if (!warnings.includes(hw)) warnings.unshift(hw);
  }

  return {
    waterQuality: Math.round(waterQuality),
    waterState,
    oxygen: Math.round(oxygen),
    algaeLevel: Math.round(algaeLevel),
    temperature,
    targetTemperature,
    spaceUsed: Number(spaceUsed.toFixed(1)),
    spaceMax,
    speciesUsed,
    speciesMax,
    totalFiltration: Math.round(totalFiltration),
    totalOxygenGen: Math.round(totalOxygenGen),
    totalOxygenDemand: Math.round(totalOxygenDemand),
    totalShelter: Math.round(totalShelter),
    warnings,
    ecosystemEfficiency,
    predationRisk,
    breedingReadySpecies,
    avgHunger: hungerSummary.avgHunger,
    hungryFishCount: hungerSummary.hungryFishCount,
    starvingFishCount: hungerSummary.starvingFishCount,
    criticalFishCount: hungerSummary.criticalFishCount,
    foodStored,
    foodCapacity,
    foodProductionPerMin,
    foodConsumptionPerMin,
    autoFeederActive: (mapState?.autoFeederLevel ?? 0) > 0,
  };
}

export function rollGeneticVariant(
  state: SaveGameState,
  habitatId: HabitatId
): GeneticVariant {
  const habitatBonus = HABITAT_BY_ID[habitatId]?.specializationBonus.legendaryDiscovery ?? 0;
  const researchPct = getResearchBonus(state, 'variant_chance_pct');
  const conservationPct = getConservationBonus(state, 'variant_chance_pct');
  const mapState = state.mapStates[habitatId];
  const masteryPct = mapState ? getMapMasteryBonuses(mapState).rareVariantBonusPct : 0;
  const totalChance = Math.min(
    0.58,
    GAME_CONFIG.BASE_VARIANT_CHANCE +
      (researchPct + conservationPct + masteryPct) / 100 +
      habitatBonus * 0.25
  );

  if (Math.random() > totalChance) {
    return 'normal';
  }
  const rarePool: GeneticVariant[] = ['golden', 'albino', 'sakura', 'longfin', 'prism'];
  return rarePool[Math.floor(Math.random() * rarePool.length)];
}

export function getMapMasteryPercent(state: SaveGameState, habitatId: HabitatId): number {
  const mapSpecies = FISH_CATALOG.filter((f) => f.preferredHabitat === habitatId);
  const discoveredSpecies = mapSpecies.filter((f) => state.discoveredFishIds.includes(f.id)).length;
  const speciesRatio = mapSpecies.length > 0 ? discoveredSpecies / mapSpecies.length : 1;

  const mapCreatures = CREATURE_CATALOG.filter((c) => c.habitatId === habitatId);
  const discoveredCreatures = mapCreatures.filter((c) =>
    state.discoveredCreatureIds.includes(c.id)
  ).length;
  const creatureRatio = mapCreatures.length > 0 ? discoveredCreatures / mapCreatures.length : 1;

  const mapState = state.mapStates[habitatId];
  const localUpgradeSum = mapState
    ? Object.values(mapState.localUpgrades).reduce((s, lv) => s + lv, 0)
    : 0;
  const upgradeRatio = Math.min(1, localUpgradeSum / 14);

  const waterRatio = mapState ? Math.min(1, mapState.waterQuality / 90) : 0.8;

  const pct =
    speciesRatio * 45 + creatureRatio * 20 + upgradeRatio * 20 + waterRatio * 15;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/**
 * Steps the living ecosystem simulation (called at 1Hz for active play).
 * Handles water quality equilibrium, algae buildup/cleaning, oxygen, fish growth,
 * schooling stress, breeding egg laying, and egg hatching.
 */
export function stepEcosystem(
  state: SaveGameState,
  dtSec: number,
  nowMs: number
): { updatedState: SaveGameState; events: EcosystemStepEvents } {
  const safeDt = Math.max(0.1, Math.min(10, dtSec));
  const events: EcosystemStepEvents = {
    grownFishIds: [],
    laidEggs: [],
    hatchedFish: [],
    starvedFish: [],
    autoFeeds: [],
    rpEarned: 0,
  };

  const nextMapStates = { ...state.mapStates };
  const autoMaintLv = state.researchLevels['auto_maintenance'] ?? 0;
  const algaeResist = 1 - Math.min(0.75, getResearchBonus(state, 'algae_resistance') / 100);
  const schoolResilience = 1 - Math.min(0.75, getResearchBonus(state, 'school_resilience') / 100);
  const milestoneBonuses = getGlobalMilestoneBonuses(state);
  const isTutorialSafe = !state.tutorial?.tutorialCompleted && !state.tutorial?.skippedTutorial;
  let totalFoodProduced = 0;

  // 1. Update water quality, oxygen, algae, local food factory & manual feed recharge per unlocked map
  for (const habId of state.unlockedHabitats) {
    const mapState = nextMapStates[habId];
    if (!mapState) continue;

    const status = calculateEcosystemStatus(state, habId);
    const fishInMap = state.placedFish.filter((f) => f.habitatId === habId);
    const creaturesInMap = state.placedCreatures.filter((c) => c.habitatId === habId);
    const decorInMap = state.placedDecorations.filter((d) => d.habitatId === habId);

    const wasteLoad = fishInMap.reduce((sum, f) => {
      const def = FISH_BY_ID[f.fishId];
      return sum + (def ? def.wasteOutput : 1);
    }, 0);

    // Target Water Quality equilibrium (gentle, cozy balance)
    const filterMargin = status.totalFiltration - wasteLoad * 1.15;
    const algaePenalty = mapState.algaeLevel * 0.25;
    const targetWater = Math.max(
      24,
      Math.min(100, 88 + filterMargin * 0.65 - algaePenalty + autoMaintLv * 4)
    );
    const waterRate = 0.035 * safeDt;
    const nextWater = mapState.waterQuality + (targetWater - mapState.waterQuality) * waterRate;

    // Target Oxygen equilibrium
    const oxygenMargin = status.totalOxygenGen - status.totalOxygenDemand * 1.35;
    const targetOxygen = Math.max(28, Math.min(100, 86 + oxygenMargin * 0.75));
    const nextOxygen = mapState.oxygen + (targetOxygen - mapState.oxygen) * (0.045 * safeDt);

    // Algae dynamics
    let algaeCleanPerMin = autoMaintLv * 9;
    for (const c of creaturesInMap) {
      algaeCleanPerMin += CREATURE_BY_ID[c.creatureId]?.algaeCleanRate ?? 0;
    }
    for (const d of decorInMap) {
      algaeCleanPerMin += DECORATION_BY_ID[d.decorationId]?.effects.algaeReduction ?? 0;
    }
    const algaeGrowthPerMin = (3.5 + wasteLoad * 0.65) * algaeResist;
    const netAlgaePerSec = (algaeGrowthPerMin - algaeCleanPerMin) / 60;
    const nextAlgae = Math.max(0, Math.min(100, mapState.algaeLevel + netAlgaePerSec * safeDt));

    const updatedMap = {
      ...mapState,
      waterQuality: Number(nextWater.toFixed(2)),
      oxygen: Number(nextOxygen.toFixed(2)),
      algaeLevel: Number(nextAlgae.toFixed(2)),
      temperature: status.temperature,
    };

    // Passive local Food Factory & Manual Feed charge recharge
    totalFoodProduced += stepLocalFoodFactory(updatedMap, safeDt);
    syncManualFeedCharges(updatedMap, nowMs);

    nextMapStates[habId] = updatedMap;
  }

  // 2. Step fish hunger, growth, schooling health, stress, and gradual starvation
  const growthResearchMult =
    1 + (getResearchBonus(state, 'growth_speed') + milestoneBonuses.growth_pct) / 100;
  const speciesCountsByMap: Record<string, number> = {};
  for (const f of state.placedFish) {
    const key = `${f.habitatId}:${f.fishId}`;
    speciesCountsByMap[key] = (speciesCountsByMap[key] ?? 0) + 1;
  }

  const nextPlacedFish: PlacedFish[] = [];
  for (const fish of state.placedFish) {
    const def = FISH_BY_ID[fish.fishId];
    if (!def) {
      nextPlacedFish.push(fish);
      continue;
    }
    const mapState = nextMapStates[fish.habitatId];
    const habitat = HABITAT_BY_ID[fish.habitatId];
    const mapGrowthBonus = habitat?.specializationBonus.growthSpeed ?? 0;
    const nurseryBonus =
      (getLocalUpgradeValue('breeding_care', mapState?.localUpgrades.breeding_care ?? 0) - 100) /
      100;

    // Clone fish so HungerSystem can mutate safely
    const workingFish: PlacedFish = {
      ...fish,
      hunger: fish.hunger ?? 90,
      starvationSec: fish.starvationSec ?? 0,
    };

    const { died, multipliers: hungerMults } = stepFishHunger(
      workingFish,
      def,
      safeDt,
      milestoneBonuses.food_efficiency_pct,
      isTutorialSafe
    );

    if (died) {
      events.starvedFish.push(workingFish);
      continue;
    }

    // Schooling stress stage (0..6)
    const count = speciesCountsByMap[`${fish.habitatId}:${fish.fishId}`] ?? 1;
    const schoolDeficit = Math.max(0, def.minimumSchoolSize - count);
    const waterStress =
      mapState && mapState.waterQuality < 55 ? 2 : mapState && mapState.waterQuality < 70 ? 1 : 0;
    const oxygenStress = mapState && mapState.oxygen < 55 ? 2 : 0;
    const hungerStress =
      workingFish.hunger < 10 ? 3 : workingFish.hunger < 25 ? 2 : workingFish.hunger < 50 ? 1 : 0;
    const rawStress = Math.round(
      (schoolDeficit * 1.15 + waterStress + oxygenStress + hungerStress) * schoolResilience
    );
    const targetStress = Math.max(0, Math.min(6, rawStress));

    // Smooth health & happiness towards ecosystem + hunger conditions
    if (workingFish.hunger >= 25) {
      const targetHealth = Math.max(22, Math.min(100, 98 - targetStress * 11));
      workingFish.health = Number(
        (workingFish.health + (targetHealth - workingFish.health) * (0.06 * safeDt)).toFixed(1)
      );
    }
    const targetHappiness = Math.max(15, Math.min(100, 96 - targetStress * 10));
    workingFish.happiness = Number(
      Math.max(
        5,
        Math.min(
          100,
          workingFish.happiness +
            (targetHappiness - workingFish.happiness) * (0.06 * safeDt) +
            hungerMults.happinessDeltaPerSec * safeDt
        )
      ).toFixed(1)
    );
    workingFish.stressStage = targetStress;

    // Growth progression (affected by health & hunger)
    const healthGrowthFactor = workingFish.health >= 70 ? 1.0 : 0.45;
    const totalGrowthSpeed =
      (growthResearchMult + mapGrowthBonus + nurseryBonus) *
      healthGrowthFactor *
      hungerMults.growthMult;
    const nextAge = workingFish.ageSec + safeDt * totalGrowthSpeed;
    const nextStage = getGrowthStageFromAge(nextAge, def.growthTimeSec);

    if (nextStage !== workingFish.growthStage) {
      events.grownFishIds.push(workingFish.fishId);
      events.rpEarned += 2;
    }

    workingFish.ageSec = Number(nextAge.toFixed(1));
    workingFish.growthStage = nextStage;
    workingFish.hunger = Number(workingFish.hunger.toFixed(1));
    nextPlacedFish.push(workingFish);
  }

  // 2.5 Run Per-Map Auto Feeders across unlocked maps
  const tempStateForAutoFeed: SaveGameState = {
    ...state,
    mapStates: nextMapStates,
    placedFish: nextPlacedFish,
    stats: { ...state.stats },
  };
  for (const habId of state.unlockedHabitats) {
    const autoRes = runAutoFeederTick(
      tempStateForAutoFeed,
      habId,
      nowMs,
      milestoneBonuses.food_efficiency_pct
    );
    if (autoRes.triggered) {
      events.autoFeeds.push({
        habitatId: habId,
        fedCount: autoRes.fedCount,
        foodUsed: autoRes.foodUsed,
      });
    }
  }

  // 3. Egg hatching & Breeding checks
  let nextEggs = [...state.placedEggs];
  const hatchedFish: PlacedFish[] = [];
  const nextDiscoveredVariants = { ...state.discoveredVariants };

  const remainingEggs: PlacedEgg[] = [];
  for (const egg of nextEggs) {
    const elapsedSec = (nowMs - egg.laidAt) / 1000;
    if (elapsedSec >= egg.hatchDurationSec) {
      const habFishCount =
        nextPlacedFish.filter((f) => f.habitatId === egg.habitatId).length +
        hatchedFish.filter((f) => f.habitatId === egg.habitatId).length;
      const cap = getMapSpeciesCapacity(state, egg.habitatId);
      if (habFishCount < cap) {
        const baby: PlacedFish = {
          instanceId: `baby_${egg.fishId}_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
          fishId: egg.fishId,
          habitatId: egg.habitatId,
          level: state.fishSpeciesLevels[egg.fishId] ?? 1,
          placedAt: nowMs,
          ageSec: 0,
          growthStage: 'baby',
          health: 96,
          happiness: 95,
          stressStage: 0,
          hunger: 92,
          starvationSec: 0,
          variant: egg.variant,
          lastBredAt: nowMs,
        };
        hatchedFish.push(baby);
        events.hatchedFish.push(baby);
        events.rpEarned += egg.variant !== 'normal' ? 8 : 4;

        const knownVars = new Set(nextDiscoveredVariants[egg.fishId] ?? ['normal']);
        knownVars.add(egg.variant);
        nextDiscoveredVariants[egg.fishId] = Array.from(knownVars);
        continue;
      }
    }
    remainingEggs.push(egg);
  }
  nextEggs = remainingEggs;

  // Check breeding pairs in active map (keep max 3 active eggs per map for visual serenity)
  const activeHab = state.activeHabitatId;
  const activeMapState = nextMapStates[activeHab];
  const activeEggsCount = nextEggs.filter((e) => e.habitatId === activeHab).length;
  const activeFishCount =
    nextPlacedFish.filter((f) => f.habitatId === activeHab).length +
    hatchedFish.filter((f) => f.habitatId === activeHab).length;
  const activeCap = getMapSpeciesCapacity(state, activeHab);

  if (
    activeMapState &&
    activeMapState.waterQuality >= 68 &&
    activeMapState.oxygen >= 65 &&
    activeEggsCount < 3 &&
    activeFishCount + activeEggsCount < activeCap
  ) {
    const breedSpeedMult =
      1 +
      (getResearchBonus(state, 'breeding_speed') +
        getMapSpecialistBonus(state, activeHab, 'breeding') +
        getConservationBonus(state, 'breeding_efficiency_pct') +
        milestoneBonuses.breeding_pct) /
        100 +
      (HABITAT_BY_ID[activeHab]?.specializationBonus.breedingSpeed ?? 0) +
      (getLocalUpgradeValue('breeding_care', activeMapState.localUpgrades.breeding_care ?? 0) -
        100) /
        100;

    // Group ready breeding adults by species (must also be well-fed >= 50% hunger)
    const bySpecies: Record<string, PlacedFish[]> = {};
    for (const f of nextPlacedFish) {
      if (f.habitatId !== activeHab) continue;
      if (f.growthStage === 'breeding_adult' && f.health >= 72 && (f.hunger ?? 90) >= 50) {
        if (!bySpecies[f.fishId]) bySpecies[f.fishId] = [];
        bySpecies[f.fishId].push(f);
      }
    }

    for (const [fishId, adults] of Object.entries(bySpecies)) {
      if (adults.length < 2) continue;
      const def = FISH_BY_ID[fishId];
      if (!def) continue;
      const effectiveCooldownMs = (def.reproductionCooldownSec * 1000) / breedSpeedMult;
      const readyPair = adults.filter((a) => nowMs - a.lastBredAt >= effectiveCooldownMs);
      if (readyPair.length >= 2) {
        // Lay egg!
        const variant = rollGeneticVariant(state, activeHab);
        const egg: PlacedEgg = {
          eggId: `egg_${fishId}_${nowMs}_${Math.random().toString(36).slice(2, 5)}`,
          fishId,
          habitatId: activeHab,
          x: 0.16 + Math.random() * 0.68,
          y: 0.81 + Math.random() * 0.06,
          laidAt: nowMs,
          hatchDurationSec: Math.max(12, Math.round(def.eggDurationSec / breedSpeedMult)),
          variant,
        };
        nextEggs.push(egg);
        events.laidEggs.push(egg);
        // Reset breeding cooldown on the pair
        readyPair[0].lastBredAt = nowMs;
        readyPair[1].lastBredAt = nowMs;
        break; // At most 1 egg laid per tick
      }
    }
  }

  const allPlacedFish =
    hatchedFish.length > 0 ? [...nextPlacedFish, ...hatchedFish] : nextPlacedFish;

  const updatedState: SaveGameState = {
    ...state,
    mapStates: nextMapStates,
    placedFish: allPlacedFish,
    placedEggs: nextEggs,
    discoveredVariants: nextDiscoveredVariants,
    researchPoints: state.researchPoints + events.rpEarned,
    stats: {
      ...tempStateForAutoFeed.stats,
      fishGrownTotal: state.stats.fishGrownTotal + events.grownFishIds.length,
      fishBredTotal: state.stats.fishBredTotal + hatchedFish.length,
      fishDiedStarvation: (state.stats.fishDiedStarvation ?? 0) + events.starvedFish.length,
      foodProducedTotal: Number(((state.stats.foodProducedTotal ?? 0) + totalFoodProduced).toFixed(1)),
    },
  };

  return { updatedState, events };
}
