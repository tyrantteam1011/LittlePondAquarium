import { GAME_CONFIG, getXpForNextLevel } from '../core/GameConfig';
import {
  DecorationData,
  FishData,
  HabitatData,
  LevelUpNotification,
  SaveGameState,
  UnlockRequirement,
} from '../core/types';
import { FISH_CATALOG } from '../data/fishCatalog';
import { DECORATION_CATALOG } from '../data/decorationCatalog';
import { HABITAT_BY_ID } from '../data/habitatCatalog';
import { calculateBeautyBreakdown } from '../aquarium/BeautySystem';
import { LocalizationManager } from '../localization/LocalizationManager';

export function checkUnlockRequirement(
  req: UnlockRequirement,
  state: SaveGameState,
  beautyScore: number
): { unlocked: boolean; reason?: string } {
  if (req.habitatId && !state.unlockedHabitats.includes(req.habitatId)) {
    const habName = LocalizationManager.getHabitatName(req.habitatId);
    return {
      unlocked: false,
      reason: LocalizationManager.get('UNLOCK_REQ_HABITAT', { name: habName }),
    };
  }
  if (req.aquariumLevel && state.aquariumLevel < req.aquariumLevel) {
    return {
      unlocked: false,
      reason: LocalizationManager.get('UNLOCK_REQ_LEVEL', { level: req.aquariumLevel }),
    };
  }
  if (req.beautyScore && beautyScore < req.beautyScore) {
    return {
      unlocked: false,
      reason: LocalizationManager.get('UNLOCK_REQ_BEAUTY', { score: req.beautyScore }),
    };
  }
  if (req.discoveredFishCount && state.discoveredFishIds.length < req.discoveredFishCount) {
    return {
      unlocked: false,
      reason: LocalizationManager.get('UNLOCK_REQ_DISCOVER', { count: req.discoveredFishCount }),
    };
  }
  return { unlocked: true };
}

export function isFishUnlocked(
  fish: FishData,
  state: SaveGameState,
  beautyScore?: number
): { unlocked: boolean; reason?: string } {
  if (state.discoveredFishIds.includes(fish.id)) {
    return { unlocked: true };
  }
  const score = beautyScore ?? calculateBeautyBreakdown(state).total;
  return checkUnlockRequirement(fish.unlockRequirement, state, score);
}

export function isDecorationUnlocked(
  decor: DecorationData,
  state: SaveGameState,
  beautyScore?: number
): { unlocked: boolean; reason?: string } {
  if ((state.ownedDecorations[decor.id] ?? 0) > 0) {
    return { unlocked: true };
  }
  const score = beautyScore ?? calculateBeautyBreakdown(state).total;
  return checkUnlockRequirement(decor.unlockRequirement, state, score);
}

export function canUnlockHabitat(
  habitat: HabitatData,
  state: SaveGameState,
  beautyScore?: number
): { canUnlock: boolean; reasons: string[] } {
  if (state.unlockedHabitats.includes(habitat.id)) {
    return { canUnlock: true, reasons: [] };
  }
  const score = beautyScore ?? calculateBeautyBreakdown(state).total;
  const reasons: string[] = [];
  if (state.aquariumLevel < habitat.unlockRequirement.aquariumLevel) {
    reasons.push(
      LocalizationManager.get('UNLOCK_REQ_LEVEL', {
        level: habitat.unlockRequirement.aquariumLevel,
      })
    );
  }
  if (state.discoveredFishIds.length < habitat.unlockRequirement.discoveredFishCount) {
    reasons.push(
      LocalizationManager.get('UNLOCK_REQ_DISCOVER', {
        count: habitat.unlockRequirement.discoveredFishCount,
      })
    );
  }
  if (score < habitat.unlockRequirement.beautyScore) {
    reasons.push(
      LocalizationManager.get('UNLOCK_REQ_BEAUTY', {
        score: habitat.unlockRequirement.beautyScore,
      })
    );
  }
  if (state.coins < habitat.unlockRequirement.coinCost) {
    reasons.push(
      LocalizationManager.get('UNLOCK_REQ_COINS', {
        coins: LocalizationManager.formatNumber(habitat.unlockRequirement.coinCost),
      })
    );
  }
  return { canUnlock: reasons.length === 0, reasons };
}

export function awardAquariumXp(
  state: SaveGameState,
  xpAmount: number
): { updatedState: SaveGameState; levelUp: LevelUpNotification | null } {
  if (xpAmount <= 0) {
    return { updatedState: state, levelUp: null };
  }

  // Also level up the active local map independently!
  const activeId = state.activeHabitatId;
  const currentMap = state.mapStates[activeId];
  const nextMapStates = { ...state.mapStates };
  if (currentMap) {
    let mLevel = currentMap.mapLevel;
    let mXp = currentMap.mapXp + xpAmount;
    let tokensGained = 0;
    while (mLevel < GAME_CONFIG.MAX_AQUARIUM_LEVEL) {
      const needed = Math.floor(getXpForNextLevel(mLevel) * 0.85);
      if (mXp >= needed) {
        mXp -= needed;
        mLevel += 1;
        tokensGained += 3;
      } else {
        break;
      }
    }
    nextMapStates[activeId] = {
      ...currentMap,
      mapLevel: mLevel,
      mapXp: mXp,
      mapTokens: currentMap.mapTokens + tokensGained,
    };
  }

  if (state.aquariumLevel >= GAME_CONFIG.MAX_AQUARIUM_LEVEL) {
    return {
      updatedState: { ...state, mapStates: nextMapStates },
      levelUp: null,
    };
  }

  let level = state.aquariumLevel;
  let xp = state.aquariumXp + xpAmount;
  const startLevel = level;

  while (level < GAME_CONFIG.MAX_AQUARIUM_LEVEL) {
    const needed = getXpForNextLevel(level);
    if (xp >= needed) {
      xp -= needed;
      level += 1;
    } else {
      break;
    }
  }

  if (level === startLevel) {
    return {
      updatedState: { ...state, aquariumXp: xp, mapStates: nextMapStates },
      levelUp: null,
    };
  }

  const levelsGained = level - startLevel;
  const gemBonus = levelsGained * GAME_CONFIG.LEVEL_UP_GEM_BONUS;
  const rpBonus = levelsGained * GAME_CONFIG.LEVEL_UP_RP_BONUS;

  const unlockedFishIds = FISH_CATALOG.filter((f) => {
    const reqLv = f.unlockRequirement.aquariumLevel ?? 1;
    return reqLv > startLevel && reqLv <= level;
  }).map((f) => f.id);

  const unlockedDecorationIds = DECORATION_CATALOG.filter((d) => {
    const reqLv = d.unlockRequirement.aquariumLevel ?? 1;
    return reqLv > startLevel && reqLv <= level;
  }).map((d) => d.id);

  return {
    updatedState: {
      ...state,
      aquariumLevel: level,
      aquariumXp: xp,
      gems: state.gems + gemBonus,
      researchPoints: state.researchPoints + rpBonus,
      mapStates: nextMapStates,
    },
    levelUp: {
      fromLevel: startLevel,
      toLevel: level,
      mapName: HABITAT_BY_ID[activeId]?.name,
      unlockedFishIds,
      unlockedDecorationIds,
      gemBonus,
      rpBonus,
    },
  };
}
