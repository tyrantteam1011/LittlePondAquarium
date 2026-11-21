import { CollectionRewardData, HabitatId, SaveGameState } from '../core/types';
import { FISH_CATALOG } from '../data/fishCatalog';
import { COLLECTION_REWARDS } from '../data/collectionRewards';

export function getDiscoveredCountForHabitat(
  state: SaveGameState,
  habitatId: HabitatId
): { discovered: number; total: number } {
  const inHabitat = FISH_CATALOG.filter((f) => f.collection === habitatId);
  const discovered = inHabitat.filter((f) => state.discoveredFishIds.includes(f.id)).length;
  return { discovered, total: inHabitat.length };
}

export function getCollectionMilestoneProgress(
  milestone: CollectionRewardData,
  state: SaveGameState
): { current: number; required: number; isReady: boolean; isClaimed: boolean } {
  const isClaimed = state.claimedCollectionRewards.includes(milestone.id);
  const current = milestone.habitatId
    ? getDiscoveredCountForHabitat(state, milestone.habitatId).discovered
    : state.discoveredFishIds.length;
  const isReady = !isClaimed && current >= milestone.requiredDiscovered;
  return {
    current,
    required: milestone.requiredDiscovered,
    isReady,
    isClaimed,
  };
}

export function getUnclaimedCollectionRewardCount(state: SaveGameState): number {
  return COLLECTION_REWARDS.filter(
    (m) => getCollectionMilestoneProgress(m, state).isReady
  ).length;
}
