import {
  FishData,
  FishSizeTier,
  HabitatId,
  HungerBand,
  PlacedFish,
  SaveGameState,
} from '../core/types';
import { FISH_BY_ID } from '../data/fishCatalog';
import { CREATURE_BY_ID } from '../data/creatureCatalog';
import { LocalizationManager } from '../localization/LocalizationManager';

export interface HungerMultipliers {
  band: HungerBand;
  growthMult: number;
  happinessDeltaPerSec: number;
  breedingAllowed: boolean;
  breedingMult: number;
  incomeMult: number;
  speedMult: number;
  healthDeltaPerSec: number;
}

export function getFishSizeTier(fish: FishData): FishSizeTier {
  if (fish.sizeTier) return fish.sizeTier;
  if (fish.spaceRequirement <= 0.35) return 'tiny';
  if (fish.spaceRequirement <= 0.85) return 'small';
  if (fish.spaceRequirement <= 1.8) return 'medium';
  if (fish.spaceRequirement <= 3.5) return 'large';
  return 'huge';
}

/**
 * Configurable Food Consumption per feeding cycle (1..15 units)
 * Tiny: 1 | Small: 2 | Medium: 4 | Large: 8 | Huge: 15
 */
export function getFishFoodRequirement(fish: FishData): number {
  if (typeof fish.foodRequirement === 'number' && fish.foodRequirement > 0) {
    return fish.foodRequirement;
  }
  switch (getFishSizeTier(fish)) {
    case 'tiny':
      return 1;
    case 'small':
      return 2;
    case 'medium':
      return 4;
    case 'large':
      return 8;
    case 'huge':
      return 15;
  }
}

export function getHungerBand(hunger: number): HungerBand {
  if (hunger >= 75) return 'healthy';
  if (hunger >= 50) return 'hungry';
  if (hunger >= 25) return 'very_hungry';
  if (hunger >= 10) return 'starving';
  return 'critical';
}

export function getHungerBandColor(band: HungerBand): string {
  switch (band) {
    case 'healthy':
      return '#8df5da';
    case 'hungry':
      return '#ffe394';
    case 'very_hungry':
      return '#ffb973';
    case 'starving':
      return '#ff857a';
    case 'critical':
      return '#ff5e5e';
  }
}

export function getHungerMultipliers(hunger: number): HungerMultipliers {
  const band = getHungerBand(hunger);
  switch (band) {
    case 'healthy':
      return {
        band,
        growthMult: 1.08,
        happinessDeltaPerSec: 0.08,
        breedingAllowed: true,
        breedingMult: 1.05,
        incomeMult: 1.0,
        speedMult: 1.0,
        healthDeltaPerSec: 0.16,
      };
    case 'hungry':
      return {
        band,
        growthMult: 0.78,
        happinessDeltaPerSec: -0.05,
        breedingAllowed: true,
        breedingMult: 0.75,
        incomeMult: 0.9,
        speedMult: 0.92,
        healthDeltaPerSec: 0,
      };
    case 'very_hungry':
      return {
        band,
        growthMult: 0.45,
        happinessDeltaPerSec: -0.14,
        breedingAllowed: false,
        breedingMult: 0,
        incomeMult: 0.72,
        speedMult: 0.8,
        healthDeltaPerSec: -0.08,
      };
    case 'starving':
      return {
        band,
        growthMult: 0.15,
        happinessDeltaPerSec: -0.28,
        breedingAllowed: false,
        breedingMult: 0,
        incomeMult: 0.48,
        speedMult: 0.62,
        healthDeltaPerSec: -0.35,
      };
    case 'critical':
      return {
        band,
        growthMult: 0,
        happinessDeltaPerSec: -0.45,
        breedingAllowed: false,
        breedingMult: 0,
        incomeMult: 0.25,
        speedMult: 0.45,
        healthDeltaPerSec: -0.95,
      };
  }
}

/**
 * Computes per-map food demand per minute across fish & creatures.
 */
export function getMapFoodConsumptionPerMin(
  state: SaveGameState,
  habitatId: HabitatId,
  globalFoodEfficiencyPct = 0
): number {
  const effMult = Math.max(0.5, 1 - globalFoodEfficiencyPct / 100);
  const fishDemand = state.placedFish
    .filter((f) => f.habitatId === habitatId)
    .reduce((sum, pf) => {
      const fd = FISH_BY_ID[pf.fishId];
      if (!fd) return sum;
      const stageFactor = pf.growthStage === 'baby' ? 0.65 : pf.growthStage === 'juvenile' ? 0.85 : 1;
      return sum + getFishFoodRequirement(fd) * stageFactor;
    }, 0);

  const creatureDemand = state.placedCreatures
    .filter((c) => c.habitatId === habitatId)
    .reduce((sum, pc) => {
      const cd = CREATURE_BY_ID[pc.creatureId];
      if (!cd) return sum;
      return sum + (cd.foodRequirement ?? 0.5) * 0.5;
    }, 0);

  return Math.round((fishDemand + creatureDemand) * effMult * 10) / 10;
}

/**
 * Steps a single fish's hunger & starvation state cleanly.
 * Respects tutorial safety so beginners never lose their starter fish during onboarding.
 */
export function stepFishHunger(
  fish: PlacedFish,
  fishData: FishData,
  dtSec: number,
  globalFoodEfficiencyPct: number,
  isTutorialSafe: boolean
): { died: boolean; multipliers: HungerMultipliers } {
  const req = getFishFoodRequirement(fishData);
  const effMult = Math.max(0.55, 1 - globalFoodEfficiencyPct / 100);
  // Cozy pace: a tiny fish drops ~0.09%/sec (~18 mins from 100 -> 0), huge fish ~0.22%/sec (~7.5 mins)
  const sizeDecayScale = 0.08 + Math.sqrt(req) * 0.036;
  const stageScale = fish.growthStage === 'baby' ? 0.8 : 1;
  const decayPerSec = sizeDecayScale * stageScale * effMult;

  const minFloor = isTutorialSafe ? 55 : 0;
  fish.hunger = Math.max(minFloor, Math.min(100, (fish.hunger ?? 90) - decayPerSec * dtSec));

  const multipliers = getHungerMultipliers(fish.hunger);
  if (multipliers.healthDeltaPerSec !== 0) {
    const nextHealth = fish.health + multipliers.healthDeltaPerSec * dtSec;
    fish.health = Math.max(isTutorialSafe ? 40 : 0, Math.min(100, nextHealth));
  }

  if (fish.hunger <= 10 && !isTutorialSafe) {
    fish.starvationSec = (fish.starvationSec ?? 0) + dtSec;
  } else {
    fish.starvationSec = Math.max(0, (fish.starvationSec ?? 0) - dtSec * 2);
  }

  // Gradual death only when hunger is 0 AND health reaches 0 AND fish stayed critical >= 20s
  const died = !isTutorialSafe && fish.hunger <= 0.5 && fish.health <= 0.5 && fish.starvationSec >= 20;
  return { died, multipliers };
}

export interface MapHungerSummary {
  avgHunger: number;
  hungryFishCount: number;
  starvingFishCount: number;
  criticalFishCount: number;
  warnings: string[];
}

export function getMapHungerSummary(
  state: SaveGameState,
  habitatId: HabitatId,
  foodStored: number,
  foodCapacity: number
): MapHungerSummary {
  const fishList = state.placedFish.filter((f) => f.habitatId === habitatId);
  if (fishList.length === 0) {
    return {
      avgHunger: 100,
      hungryFishCount: 0,
      starvingFishCount: 0,
      criticalFishCount: 0,
      warnings: [],
    };
  }

  let sum = 0;
  let hungryFishCount = 0;
  let starvingFishCount = 0;
  let criticalFishCount = 0;

  for (const fish of fishList) {
    const h = fish.hunger ?? 90;
    sum += h;
    if (h < 10) criticalFishCount += 1;
    else if (h < 25) starvingFishCount += 1;
    else if (h < 60) hungryFishCount += 1;
  }

  const avgHunger = Math.round(sum / fishList.length);
  const warnings: string[] = [];

  if (criticalFishCount > 0 || starvingFishCount > 0) {
    warnings.push(LocalizationManager.get('WARN_FISH_AT_RISK'));
  } else if (hungryFishCount > 0 || avgHunger < 65) {
    warnings.push(LocalizationManager.get('WARN_FISH_HUNGRY'));
  }

  if (foodStored < Math.max(10, foodCapacity * 0.12)) {
    warnings.push(LocalizationManager.get('WARN_FOOD_LOW'));
  }

  return {
    avgHunger,
    hungryFishCount,
    starvingFishCount,
    criticalFishCount,
    warnings,
  };
}
