import { GAME_CONFIG, getTodayDateKey } from '../core/GameConfig';
import { ActiveMissionState, MissionMetric, SaveGameState } from '../core/types';
import { MISSION_BY_ID, MISSION_CATALOG } from '../data/missionCatalog';

/**
 * Daily Mission Manager — lightweight 4-mission cozy checklist that refreshes each calendar day.
 */
export function ensureDailyMissionsFresh(state: SaveGameState): SaveGameState {
  const today = getTodayDateKey();
  if (state.lastMissionResetDate === today && state.dailyMissions.length > 0) {
    return state;
  }

  // Deterministic pseudo-random rotation based on date string
  let seed = 0;
  for (let i = 0; i < today.length; i++) {
    seed = (seed * 31 + today.charCodeAt(i)) % 9973;
  }

  const pool = [...MISSION_CATALOG];
  const selected: ActiveMissionState[] = [];
  for (let i = 0; i < GAME_CONFIG.ACTIVE_DAILY_MISSIONS_COUNT && pool.length > 0; i++) {
    const idx = (seed + i * 3) % pool.length;
    const picked = pool.splice(idx, 1)[0];
    selected.push({
      missionId: picked.id,
      progress: 0,
      claimed: false,
    });
  }

  return {
    ...state,
    dailyMissions: selected,
    lastMissionResetDate: today,
  };
}

export function incrementMissionProgress(
  state: SaveGameState,
  metric: MissionMetric,
  delta: number,
  absoluteValue?: number
): SaveGameState {
  let changed = false;
  const updated = state.dailyMissions.map((m) => {
    if (m.claimed) return m;
    const def = MISSION_BY_ID[m.missionId];
    if (!def || def.metric !== metric) return m;
    const nextProgress =
      typeof absoluteValue === 'number'
        ? Math.max(m.progress, absoluteValue)
        : m.progress + delta;
    const clamped = Math.min(def.target, nextProgress);
    if (clamped !== m.progress) {
      changed = true;
      return { ...m, progress: clamped };
    }
    return m;
  });

  if (!changed) return state;
  return { ...state, dailyMissions: updated };
}

export function getClaimableMissionCount(state: SaveGameState): number {
  return state.dailyMissions.filter((m) => {
    if (m.claimed) return false;
    const def = MISSION_BY_ID[m.missionId];
    return def ? m.progress >= def.target : false;
  }).length;
}
