import { BeautyBreakdown, HabitatId, SaveGameState } from '../core/types';
import { FISH_BY_ID } from '../data/fishCatalog';
import { DECORATION_BY_ID } from '../data/decorationCatalog';
import { CREATURE_BY_ID } from '../data/creatureCatalog';

/**
 * Beauty Score 2.0 (0 - 100)
 * Evaluates Fish Variety, Plant Variety, Decoration Score, Rarity & Variants,
 * Aquascape Balance, Water Quality, Schooling Harmony, and Creature Life.
 */
export function calculateBeautyBreakdown(
  state: SaveGameState,
  habitatId: HabitatId = state.activeHabitatId
): BeautyBreakdown {
  const fishInTank = state.placedFish.filter((f) => f.habitatId === habitatId);
  const decorInTank = state.placedDecorations.filter((d) => d.habitatId === habitatId);
  const creaturesInTank = state.placedCreatures.filter((c) => c.habitatId === habitatId);
  const mapState = state.mapStates[habitatId];

  // 1. Fish Variety (0 - 20)
  const uniqueFishIds = new Set(fishInTank.map((f) => f.fishId));
  const fishVariety = Math.min(20, uniqueFishIds.size * 4);

  // 2. Plant Variety (0 - 15)
  const plantIds = new Set<string>();
  let totalPlantCount = 0;
  for (const placed of decorInTank) {
    const def = DECORATION_BY_ID[placed.decorationId];
    if (def?.category === 'Plants') {
      plantIds.add(def.id);
      totalPlantCount += 1;
    }
  }
  const plantVariety = Math.min(15, plantIds.size * 4 + Math.min(3, totalPlantCount));

  // 3. Decoration & Aquascaping Score (0 - 15)
  let rawDecorPoints = 0;
  const uniqueDecorCategories = new Set<string>();
  for (const placed of decorInTank) {
    const def = DECORATION_BY_ID[placed.decorationId];
    if (!def) continue;
    uniqueDecorCategories.add(def.category);
    const habitatMatch = def.preferredHabitat === habitatId ? 1.25 : 1.0;
    rawDecorPoints += def.beautyValue * 0.48 * habitatMatch;
  }
  if (state.activeSubstrates[habitatId]) rawDecorPoints += 2.5;
  if (state.activeBackgrounds[habitatId]) rawDecorPoints += 2.5;
  const decorationScore = Math.min(15, Math.round(rawDecorPoints));

  // 4. Rarity & Genetic Variant Score (0 - 15)
  let rawRarity = 0;
  for (const fish of fishInTank) {
    const def = FISH_BY_ID[fish.fishId];
    if (!def) continue;
    if (def.rarity === 'Rare') rawRarity += 2;
    if (def.rarity === 'Epic') rawRarity += 3.5;
    if (def.rarity === 'Legendary') rawRarity += 5.5;
    if (fish.variant !== 'normal') rawRarity += 2.5;
  }
  const rarityScore = Math.min(15, Math.round(rawRarity));

  // 5. Aquascape Balance Score (0 - 10)
  let balanceScore = 0;
  if (fishInTank.length >= 2) balanceScore += 2;
  if (totalPlantCount >= 1) balanceScore += 2;
  if (uniqueDecorCategories.size >= 2) balanceScore += 2;
  if (uniqueDecorCategories.size >= 4) balanceScore += 2;
  if (decorInTank.length >= 2) {
    const leftCount = decorInTank.filter((d) => d.x < 0.5).length;
    const rightCount = decorInTank.length - leftCount;
    if (leftCount >= 1 && rightCount >= 1) balanceScore += 2;
  }
  balanceScore = Math.min(10, balanceScore);

  // 6. Water Quality & Clarity Score (0 - 10)
  const waterQ = mapState?.waterQuality ?? 90;
  const algae = mapState?.algaeLevel ?? 10;
  const waterQualityScore = Math.max(
    0,
    Math.min(10, Math.round((waterQ / 100) * 10 - (algae > 40 ? 2 : 0)))
  );

  // 7. Schooling Activity Score (0 - 8)
  const speciesCounts: Record<string, number> = {};
  for (const f of fishInTank) {
    speciesCounts[f.fishId] = (speciesCounts[f.fishId] ?? 0) + 1;
  }
  let thrivingSchools = 0;
  for (const [fishId, count] of Object.entries(speciesCounts)) {
    const def = FISH_BY_ID[fishId];
    if (def && count >= def.minimumSchoolSize) {
      thrivingSchools += 1;
    }
  }
  const schoolingActivity = Math.min(8, thrivingSchools * 3 + (fishInTank.length >= 5 ? 2 : 0));

  // 8. Creature Ecosystem Bonus (0 - 7)
  let creaturePoints = 0;
  const uniqueCreatureIds = new Set<string>();
  for (const c of creaturesInTank) {
    uniqueCreatureIds.add(c.creatureId);
    const def = CREATURE_BY_ID[c.creatureId];
    if (def) creaturePoints += def.beautyValue * 0.45;
  }
  const creatureBonus = Math.min(7, Math.round(creaturePoints + uniqueCreatureIds.size));

  const total = Math.min(
    100,
    fishVariety +
      plantVariety +
      decorationScore +
      rarityScore +
      balanceScore +
      waterQualityScore +
      schoolingActivity +
      creatureBonus
  );

  return {
    fishVariety,
    plantVariety,
    decorationScore,
    rarityScore,
    balanceScore,
    waterQualityScore,
    schoolingActivity,
    creatureBonus,
    total,
  };
}
