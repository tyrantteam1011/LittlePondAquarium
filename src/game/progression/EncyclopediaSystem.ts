import {
  CreatureData,
  EncyclopediaCategory,
  FishBehaviorType,
  FishData,
  FishDietType,
  HabitatId,
  Rarity,
  SaveGameState,
  SchoolingCategory,
} from '../core/types';
import { FISH_CATALOG } from '../data/fishCatalog';
import { CREATURE_CATALOG } from '../data/creatureCatalog';
import { HABITAT_CATALOG } from '../data/habitatCatalog';
import { getFishFoodRequirement } from '../feeding/HungerSystem';

export interface EncyclopediaEntry {
  id: string;
  kind: 'fish' | 'creature';
  fishData?: FishData;
  creatureData?: CreatureData;
  nameKey: string;
  descriptionKey: string;
  noteOrAbilityKey: string;
  scientificOrSub: string;
  category: EncyclopediaCategory;
  habitatId: HabitatId;
  rarity: Rarity;
  diet: FishDietType;
  foodRequirement: number;
  beautyValue: number;
  behavior?: FishBehaviorType;
  schoolingBehavior?: SchoolingCategory;
  preferredDepth?: 'surface' | 'mid' | 'deep' | 'bottom';
  discovered: boolean;
  discoveredAt?: number;
}

export interface MapSpeciesIndex {
  habitatId: HabitatId;
  fishDiscovered: number;
  fishTotal: number;
  creaturesDiscovered: number;
  creaturesTotal: number;
  totalDiscovered: number;
  totalSpecies: number;
  percent: number;
  isComplete: boolean;
}

export const ENCYCLOPEDIA_CATEGORIES: EncyclopediaCategory[] = [
  'Fish',
  'Sharks & Rays',
  'Reptiles',
  'Crustaceans',
  'Mollusks',
  'Jellyfish',
  'Corals & Other',
];

export const MAP_COMPLETION_TIERS = [25, 50, 75, 90, 100] as const;

export function getFishEncyclopediaCategory(
  fishId: string,
  bodyShape: string,
  explicit?: EncyclopediaCategory
): EncyclopediaCategory {
  if (explicit) return explicit;
  if (bodyShape === 'ray') return 'Sharks & Rays';
  if (bodyShape === 'jelly' || fishId.includes('jelly')) return 'Jellyfish';
  return 'Fish';
}

export function getAllEncyclopediaEntries(state: SaveGameState): EncyclopediaEntry[] {
  const entries: EncyclopediaEntry[] = [];

  for (const fish of FISH_CATALOG) {
    const discovered = state.discoveredFishIds.includes(fish.id);
    entries.push({
      id: fish.id,
      kind: 'fish',
      fishData: fish,
      nameKey: fish.nameKey,
      descriptionKey: fish.descriptionKey,
      noteOrAbilityKey: fish.noteKey,
      scientificOrSub: fish.scientificName,
      category: getFishEncyclopediaCategory(
        fish.id,
        fish.palette.bodyShape,
        fish.encyclopediaCategory
      ),
      habitatId: fish.preferredHabitat,
      rarity: fish.rarity,
      diet: fish.dietType,
      foodRequirement: getFishFoodRequirement(fish),
      beautyValue: fish.beautyValue,
      behavior: fish.behavior,
      schoolingBehavior: fish.schoolingBehavior,
      preferredDepth: fish.preferredDepth,
      discovered,
      discoveredAt: state.discoveredDates?.[fish.id],
    });
  }

  for (const creature of CREATURE_CATALOG) {
    const discovered = state.discoveredCreatureIds.includes(creature.id);
    entries.push({
      id: creature.id,
      kind: 'creature',
      creatureData: creature,
      nameKey: creature.nameKey,
      descriptionKey: creature.descriptionKey,
      noteOrAbilityKey: creature.abilityKey,
      scientificOrSub: creature.type.toUpperCase(),
      category: creature.encyclopediaCategory ?? 'Corals & Other',
      habitatId: creature.habitatId,
      rarity: creature.rarity,
      diet: 'omnivore',
      foodRequirement: creature.foodRequirement ?? 1,
      beautyValue: creature.beautyValue,
      discovered,
      discoveredAt: state.discoveredDates?.[creature.id],
    });
  }

  return entries;
}

export function getMapSpeciesIndex(
  state: SaveGameState,
  habitatId: HabitatId
): MapSpeciesIndex {
  const mapFish = FISH_CATALOG.filter((f) => f.preferredHabitat === habitatId);
  const mapCreatures = CREATURE_CATALOG.filter((c) => c.habitatId === habitatId);

  const fishDiscovered = mapFish.filter((f) => state.discoveredFishIds.includes(f.id)).length;
  const creaturesDiscovered = mapCreatures.filter((c) =>
    state.discoveredCreatureIds.includes(c.id)
  ).length;

  const totalSpecies = mapFish.length + mapCreatures.length;
  const totalDiscovered = fishDiscovered + creaturesDiscovered;
  const percent =
    totalSpecies === 0 ? 100 : Math.min(100, Math.round((totalDiscovered / totalSpecies) * 100));

  return {
    habitatId,
    fishDiscovered,
    fishTotal: mapFish.length,
    creaturesDiscovered,
    creaturesTotal: mapCreatures.length,
    totalDiscovered,
    totalSpecies,
    percent,
    isComplete: totalSpecies > 0 && totalDiscovered >= totalSpecies,
  };
}

export function getCompletedMapsCount(state: SaveGameState): number {
  let completed = 0;
  for (const hab of HABITAT_CATALOG) {
    const idx = getMapSpeciesIndex(state, hab.id);
    if (idx.isComplete) completed += 1;
  }
  return completed;
}

export function getTotalDiscoveredSpeciesCount(state: SaveGameState): number {
  return state.discoveredFishIds.length + state.discoveredCreatureIds.length;
}

export function getTotalEncyclopediaSpeciesCount(): number {
  return FISH_CATALOG.length + CREATURE_CATALOG.length;
}
