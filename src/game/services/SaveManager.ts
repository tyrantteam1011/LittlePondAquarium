import { GAME_CONFIG } from '../core/GameConfig';
import { createInitialGameState, sanitizeLoadedState } from '../core/GameState';
import { SaveGameState } from '../core/types';

/**
 * Centralized SaveManager with backup fallback & validation.
 * Protects player progression from corrupted localStorage writes.
 */
export class SaveManager {
  static load(): { state: SaveGameState; isNewPlayer: boolean } {
    try {
      const raw = localStorage.getItem(GAME_CONFIG.SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveGameState>;
        return { state: sanitizeLoadedState(parsed), isNewPlayer: false };
      }
      const backup = localStorage.getItem(GAME_CONFIG.SAVE_BACKUP_KEY);
      if (backup) {
        const parsed = JSON.parse(backup) as Partial<SaveGameState>;
        return { state: sanitizeLoadedState(parsed), isNewPlayer: false };
      }
    } catch {
      // Attempt backup if primary failed JSON parse
      try {
        const backup = localStorage.getItem(GAME_CONFIG.SAVE_BACKUP_KEY);
        if (backup) {
          return {
            state: sanitizeLoadedState(JSON.parse(backup) as Partial<SaveGameState>),
            isNewPlayer: false,
          };
        }
      } catch {
        // Fallback to fresh state
      }
    }
    return { state: createInitialGameState(), isNewPlayer: true };
  }

  static save(state: SaveGameState): void {
    try {
      const payload = JSON.stringify({
        ...state,
        lastLoginTime: Date.now(),
      });
      const prev = localStorage.getItem(GAME_CONFIG.SAVE_KEY);
      if (prev) {
        localStorage.setItem(GAME_CONFIG.SAVE_BACKUP_KEY, prev);
      }
      localStorage.setItem(GAME_CONFIG.SAVE_KEY, payload);
    } catch {
      // Ignore storage quota errors gracefully
    }
  }

  static reset(): SaveGameState {
    try {
      localStorage.removeItem(GAME_CONFIG.SAVE_KEY);
      localStorage.removeItem(GAME_CONFIG.SAVE_BACKUP_KEY);
    } catch {
      // Ignore
    }
    const fresh = createInitialGameState();
    this.save(fresh);
    return fresh;
  }

  static exportSave(state: SaveGameState): string {
    return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  }
}
