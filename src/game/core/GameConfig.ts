/**
 * Centralized Economy, Ecosystem & Progression Configuration (v2)
 */

import { GrowthStage, GeneticVariant } from './types';

export const GAME_CONFIG = {
  SAVE_KEY: 'coralia_pixel_aquarium_save_v1',
  SAVE_BACKUP_KEY: 'coralia_pixel_aquarium_save_backup_v1',
  SAVE_VERSION: 2,
  AUTO_SAVE_INTERVAL_MS: 8000,

  // Economy & Starting Resources
  STARTING_COINS: 180,
  STARTING_GEMS: 25,
  STARTING_RP: 25,
  FISH_COST_GROWTH_PER_OWNED: 1.16,
  CREATURE_COST_GROWTH_PER_OWNED: 1.24,
  FISH_LEVEL_INCOME_MULTIPLIER: 0.22,
  BASE_SPECIES_CAPACITY: 10, // Scales 10 -> 50 per map!
  MAX_SPECIES_CAPACITY: 50,
  BASE_SPACE_CAPACITY: 12,
  MAX_SPECIALISTS_PER_MAP: 2,

  // Offline Idle System
  DEFAULT_OFFLINE_CAP_HOURS: 8,
  MIN_OFFLINE_REPORT_SECONDS: 45,
  BASE_OFFLINE_EFFICIENCY: 0.75,

  // Aquarium Level & XP Curve (Global & Local Map Levels)
  MAX_AQUARIUM_LEVEL: 50,
  BASE_XP_REQUIRED: 60,
  XP_GROWTH_FACTOR: 1.22,
  XP_REWARDS: {
    BUY_FISH: 24,
    DISCOVER_NEW_FISH: 55,
    BUY_CREATURE: 28,
    PLACE_DECORATION: 18,
    BUY_UPGRADE: 20,
    FEED_FISH: 8,
    TAP_RARE_VISITOR: 45,
    CLAIM_MISSION: 35,
    BREED_FISH: 40,
    CLEAN_ALGAE: 12,
    INCOME_TICK_THRESHOLD: 250,
  },
  LEVEL_UP_GEM_BONUS: 5,
  LEVEL_UP_RP_BONUS: 12,

  // Growth Stage Multipliers
  GROWTH_STAGE_VISUAL_SCALE: {
    baby: 0.58,
    juvenile: 0.78,
    adult: 1.0,
    breeding_adult: 1.08,
  } as Record<GrowthStage, number>,

  GROWTH_STAGE_INCOME_MULT: {
    baby: 0.45,
    juvenile: 0.75,
    adult: 1.0,
    breeding_adult: 1.15,
  } as Record<GrowthStage, number>,

  GROWTH_STAGE_SPEED_MULT: {
    baby: 0.78,
    juvenile: 0.94,
    adult: 1.0,
    breeding_adult: 1.02,
  } as Record<GrowthStage, number>,

  // Genetic Variant Multipliers & Base Chance on Breeding
  BASE_VARIANT_CHANCE: 0.14,
  VARIANT_INCOME_MULT: {
    normal: 1.0,
    golden: 1.35,
    albino: 1.25,
    sakura: 1.3,
    prism: 1.5,
    longfin: 1.4,
  } as Record<GeneticVariant, number>,

  // Health Production Bands (Section 18)
  HEALTH_PRODUCTION_BANDS: {
    HEALTHY: 1.0, // health >= 75
    STRESSED: 0.7, // health >= 50
    VERY_STRESSED: 0.4, // health >= 25
    SICK: 0.1, // health > 0
  },

  // Feeding Active Interaction
  FEED_COOLDOWN_MS: 8000,
  FEED_BOOST_DURATION_MS: 30_000,
  FEED_INCOME_BONUS: 0.15,
  FEED_PELLETS_COUNT: 7,

  // Rewarded Ad Boost
  AD_BOOST_DURATION_MS: 30 * 60 * 1000,
  AD_BOOST_MULTIPLIER: 2,

  // Rare Visitor Moment
  RARE_VISITOR_MIN_INTERVAL_MS: 55_000,
  RARE_VISITOR_MAX_INTERVAL_MS: 110_000,
  RARE_VISITOR_SWIM_DURATION_MS: 18_000,

  // Visitor Remarks Cadence
  VISITOR_REMARK_INTERVAL_MS: 38_000,

  // Beauty System Milestones
  BEAUTY_MILESTONES: [
    {
      score: 25,
      title: 'Cozy Oasis',
      rewardLabel: '+450 Coins · +10 Gems · +15 RP',
      coins: 450,
      gems: 10,
      rp: 15,
    },
    {
      score: 50,
      title: 'Tranquil Sanctuary',
      rewardLabel: '+2,000 Coins · +20 Gems · +30 RP',
      coins: 2000,
      gems: 20,
      rp: 30,
    },
    {
      score: 75,
      title: 'Radiant Reefscape',
      rewardLabel: '+8,500 Coins · +35 Gems · +60 RP',
      coins: 8500,
      gems: 35,
      rp: 60,
    },
    {
      score: 90,
      title: 'Masterpiece Ecosystem',
      rewardLabel: '+25,000 Coins · +60 Gems · +120 RP',
      coins: 25000,
      gems: 60,
      rp: 120,
    },
  ],

  ACTIVE_DAILY_MISSIONS_COUNT: 4,
} as const;

export function getXpForNextLevel(level: number): number {
  if (level >= GAME_CONFIG.MAX_AQUARIUM_LEVEL) return Number.MAX_SAFE_INTEGER;
  return Math.floor(
    GAME_CONFIG.BASE_XP_REQUIRED * Math.pow(GAME_CONFIG.XP_GROWTH_FACTOR, level - 1)
  );
}

export function getHealthProductionMultiplier(health: number): number {
  if (health >= 75) return GAME_CONFIG.HEALTH_PRODUCTION_BANDS.HEALTHY;
  if (health >= 50) return GAME_CONFIG.HEALTH_PRODUCTION_BANDS.STRESSED;
  if (health >= 25) return GAME_CONFIG.HEALTH_PRODUCTION_BANDS.VERY_STRESSED;
  if (health > 0) return GAME_CONFIG.HEALTH_PRODUCTION_BANDS.SICK;
  return 0;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs < 1000) return Math.floor(value).toLocaleString();
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa'];
  const tier = Math.min(Math.floor(Math.log10(abs) / 3), suffixes.length - 1);
  const scaled = value / Math.pow(10, tier * 3);
  const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${scaled.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}${suffixes[tier]}`;
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
