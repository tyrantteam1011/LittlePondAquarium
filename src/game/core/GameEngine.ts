import { GAME_CONFIG, formatNumber } from './GameConfig';
import { createDefaultMapState } from './GameState';
import {
  AutoFeederUpgradeId,
  BeautyBreakdown,
  DiscoveryNotification,
  EcosystemStatus,
  FeedbackPopup,
  FlyingCoin,
  HabitatId,
  LevelUpNotification,
  LocalUpgradeId,
  MapInstanceState,
  OfflineEarningsReport,
  PlacedEgg,
  PlacedFish,
  SaveGameState,
  UpgradeId,
  VisitorRemark,
} from './types';
import { FISH_BY_ID, FISH_CATALOG } from '../data/fishCatalog';
import { DECORATION_BY_ID } from '../data/decorationCatalog';
import {
  CREATURE_BY_ID,
  CREATURE_CATALOG,
  isCreatureAllowedInHabitat,
} from '../data/creatureCatalog';
import { HABITAT_BY_ID, HABITAT_CATALOG } from '../data/habitatCatalog';
import { LOCAL_UPGRADE_BY_ID, UPGRADE_BY_ID } from '../data/upgradeCatalog';
import { RESEARCH_BY_ID } from '../data/researchCatalog';
import { SPECIALIST_BY_ID } from '../data/specialistCatalog';
import { CONSERVATION_CATALOG } from '../data/conservationCatalog';
import { COLLECTION_REWARDS } from '../data/collectionRewards';
import { MISSION_BY_ID } from '../data/missionCatalog';
import { EVENT_CATALOG } from '../data/eventCatalog';
import { AUTO_FEEDER_TREE_BY_ID } from '../data/feedingCatalog';
import { MILESTONE_BY_ID, MILESTONE_CATALOG } from '../data/milestoneCatalog';
import { calculateBeautyBreakdown } from '../aquarium/BeautySystem';
import {
  calculateEcosystemStatus,
  getMapMasteryPercent,
  rollGeneticVariant,
  stepEcosystem,
} from '../aquarium/EcosystemSimulation';
import {
  calculateIncomeBreakdown,
  getCreatureDropValue,
  getFishPurchaseCost,
  IncomeBreakdown,
} from '../economy/IncomeSystem';
import {
  getCreaturePurchaseCost,
  getLocalUpgradeCost,
  getMapSpeciesCapacity,
  getUpgradeCost,
} from '../economy/UpgradeSystem';
import { calculateOfflineEarnings } from '../economy/OfflineSystem';
import {
  getFoodFactoryUpgradeCost,
  getFoodStorageCapacity,
  getFoodStorageUpgradeCost,
  getMapFoodInfo,
  getNextChargeCountdownSec,
  MAX_FOOD_FACTORY_LEVEL,
  MAX_FOOD_STORAGE_LEVEL,
  performManualFeed,
  syncManualFeedCharges,
} from '../feeding/FeedingSystem';
import {
  getAutoFeederLevelCost,
  getAutoFeederTreeCost,
  MAX_AUTO_FEEDER_LEVEL,
} from '../feeding/AutoFeederSystem';
import {
  getGlobalMilestoneBonuses,
  isMilestoneClaimable,
} from '../progression/MilestoneSystem';
import { getMapSpeciesIndex } from '../progression/EncyclopediaSystem';
import {
  canUnlockNextMapExpansion,
  getMapMasteryUpgradeCost,
  MAX_MAP_MASTERY_LEVEL,
} from '../progression/MapMasterySystem';
import {
  awardAquariumXp,
  canUnlockHabitat,
  isDecorationUnlocked,
  isFishUnlocked,
} from '../progression/ProgressionManager';
import { getCollectionMilestoneProgress } from '../progression/CollectionManager';
import { ensureDailyMissionsFresh, incrementMissionProgress } from '../progression/MissionManager';
import { SaveManager } from '../services/SaveManager';
import { AudioService } from '../services/AudioService';
import { AdsService } from '../services/AdsService';
import { IAPService } from '../services/IAPService';
import { FishSimulation, FloatingCreatureCoin } from '../aquarium/FishSimulation';
import {
  ContextualHintId,
  TutorialEventType,
  TutorialStepData,
} from '../tutorial/types';
import {
  advanceTutorialState,
  createDefaultTutorialSave,
  doesEventCompleteStep,
  getActiveTutorialStep,
  markContextualHintShown,
} from '../tutorial/TutorialManager';
import { TUTORIAL_STEPS } from '../tutorial/tutorialCatalog';
import { LocalizationManager } from '../localization/LocalizationManager';

export interface ActiveContextualHint {
  id: ContextualHintId;
  paramName?: string;
}

export interface EngineSnapshot {
  state: SaveGameState;
  income: IncomeBreakdown;
  beauty: BeautyBreakdown;
  ecosystem: EcosystemStatus;
  activeMapState: MapInstanceState;
  mapMasteryPct: number;
  maxCapacity: number;
  activeHabitatFishCount: number;
  floatingCoinCount: number;
  offlineReport: OfflineEarningsReport | null;
  levelUpModal: LevelUpNotification | null;
  discoveryModal: DiscoveryNotification | null;
  visitorRemark: VisitorRemark | null;
  activeTutorialStep: TutorialStepData | null;
  activeContextualHint: ActiveContextualHint | null;
  popups: FeedbackPopup[];
  flyingCoins: FlyingCoin[];
  feedCooldownRemainingMs: number;
  toastMessage: string | null;
  placingDecorationId: string | null;
  selectedPlacedDecorId: string | null;
}

type EngineListener = (snapshot: EngineSnapshot) => void;

const VISITOR_PROFILES = [
  { name: 'Sophie', roleKey: 'VISITOR_ROLE_NATURE', color: '#7be3d4' },
  { name: 'Dr. Kenji', roleKey: 'VISITOR_ROLE_AQUARIST', color: '#8ad8ff' },
  { name: 'Maya', roleKey: 'VISITOR_ROLE_BOTANIST', color: '#a5e89e' },
  { name: 'Clara', roleKey: 'VISITOR_ROLE_PHOTOGRAPHER', color: '#ffd480' },
];

export class GameEngine {
  state: SaveGameState;
  simulation: FishSimulation;

  private listeners = new Set<EngineListener>();
  private tickInterval: number | null = null;
  private saveInterval: number | null = null;
  private lastTickMs = Date.now();
  private ecosystemAccumulatorSec = 0;
  private visitorRemarkTimerSec = 18;
  private passiveCoinXpAccumulator = 0;

  private offlineReport: OfflineEarningsReport | null = null;
  private levelUpModal: LevelUpNotification | null = null;
  private discoveryModal: DiscoveryNotification | null = null;
  private visitorRemark: VisitorRemark | null = null;
  private visitorDismissTimer: number | null = null;
  private activeContextualHint: ActiveContextualHint | null = null;
  private contextualHintTimer: number | null = null;
  private popups: FeedbackPopup[] = [];
  private flyingCoins: FlyingCoin[] = [];
  private lastFeedAtMs = 0;
  private toastMessage: string | null = null;
  private toastTimer: number | null = null;
  private placingDecorationId: string | null = null;
  private selectedPlacedDecorId: string | null = null;

  constructor() {
    const loaded = SaveManager.load();
    this.state = ensureDailyMissionsFresh(loaded.state);
    this.simulation = new FishSimulation();

    AudioService.setEnabled(this.state.settings.soundEnabled);
    AudioService.setAmbientEnabled(this.state.settings.ambientEnabled);

    if (!loaded.isNewPlayer) {
      const report = calculateOfflineEarnings(this.state, Date.now());
      if (report && report.coinsEarned > 0) {
        this.offlineReport = report;
      }
    }

    this.syncSimulation();

    // Ensure snapshot-derived ecosystem warnings refresh immediately when language changes
    LocalizationManager.subscribe(() => {
      this.emit();
    });
  }

  private syncSimulation(): void {
    const activeMap = this.state.mapStates[this.state.activeHabitatId];
    const autoCollect = (this.state.researchLevels['auto_collector'] ?? 0) >= 1;
    this.simulation.configureEcosystemBridge(
      activeMap?.oxygen ?? 90,
      autoCollect,
      (creatureId) => getCreatureDropValue(creatureId, this.state, this.state.activeHabitatId),
      (coin) => this.awardCreatureCoin(coin, true)
    );
    this.simulation.syncPlacedFish(
      this.state.placedFish,
      this.state.activeHabitatId,
      this.state.discoveredFishIds
    );
    this.simulation.syncPlacedCreatures(this.state.placedCreatures, this.state.activeHabitatId);
  }

  start(): void {
    if (this.tickInterval !== null) return;
    this.lastTickMs = Date.now();
    this.tickInterval = window.setInterval(() => this.tick(), 250);
    this.saveInterval = window.setInterval(
      () => SaveManager.save(this.state),
      GAME_CONFIG.AUTO_SAVE_INTERVAL_MS
    );

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  stop(): void {
    if (this.tickInterval !== null) {
      window.clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.saveInterval !== null) {
      window.clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    SaveManager.save(this.state);
  }

  private handleBeforeUnload = (): void => {
    SaveManager.save(this.state);
  };

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      SaveManager.save(this.state);
    } else if (document.visibilityState === 'visible') {
      const now = Date.now();
      const report = calculateOfflineEarnings(this.state, now);
      if (report && report.coinsEarned > 0 && !this.offlineReport) {
        this.offlineReport = report;
        this.emit();
      }
      this.lastTickMs = now;
    }
  };

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): EngineSnapshot {
    const now = Date.now();
    const income = calculateIncomeBreakdown(this.state, now);
    const beauty = calculateBeautyBreakdown(this.state, this.state.activeHabitatId);
    const ecosystem = calculateEcosystemStatus(this.state, this.state.activeHabitatId);
    const activeMapState =
      this.state.mapStates[this.state.activeHabitatId] ??
      createDefaultMapState(this.state.activeHabitatId);
    const maxCapacity = getMapSpeciesCapacity(this.state, this.state.activeHabitatId);
    const activeHabitatFishCount = this.state.placedFish.filter(
      (f) => f.habitatId === this.state.activeHabitatId
    ).length;

    return {
      state: this.state,
      income,
      beauty,
      ecosystem,
      activeMapState,
      mapMasteryPct: getMapMasteryPercent(this.state, this.state.activeHabitatId),
      maxCapacity,
      activeHabitatFishCount,
      floatingCoinCount: this.simulation.creatureCoins.length,
      offlineReport: this.offlineReport,
      levelUpModal: this.levelUpModal,
      discoveryModal: this.discoveryModal,
      visitorRemark: this.visitorRemark,
      activeTutorialStep: getActiveTutorialStep(
        this.state.tutorial,
        this.state.settings.showTutorial
      ),
      activeContextualHint: this.activeContextualHint,
      popups: this.popups,
      flyingCoins: this.flyingCoins,
      feedCooldownRemainingMs: Math.max(
        0,
        GAME_CONFIG.FEED_COOLDOWN_MS - (now - this.lastFeedAtMs)
      ),
      toastMessage: this.toastMessage,
      placingDecorationId: this.placingDecorationId,
      selectedPlacedDecorId: this.selectedPlacedDecorId,
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  private tick(): void {
    const now = Date.now();
    const elapsedSec = Math.min(2, Math.max(0, (now - this.lastTickMs) / 1000));
    this.lastTickMs = now;

    this.state = ensureDailyMissionsFresh(this.state);
    const income = calculateIncomeBreakdown(this.state, now);
    const earned = income.totalPerSecond * elapsedSec;

    if (earned > 0) {
      this.state = {
        ...this.state,
        coins: this.state.coins + earned,
        totalCoinsEarned: this.state.totalCoinsEarned + earned,
        lastLoginTime: now,
      };
      this.state = incrementMissionProgress(this.state, 'earn_coins', earned);

      this.passiveCoinXpAccumulator += earned;
      if (this.passiveCoinXpAccumulator >= GAME_CONFIG.XP_REWARDS.INCOME_TICK_THRESHOLD) {
        const xpTicks = Math.floor(
          this.passiveCoinXpAccumulator / GAME_CONFIG.XP_REWARDS.INCOME_TICK_THRESHOLD
        );
        this.passiveCoinXpAccumulator -= xpTicks * GAME_CONFIG.XP_REWARDS.INCOME_TICK_THRESHOLD;
        this.grantXp(xpTicks);
      }
    }

    // 1Hz Ecosystem Simulation tick (water, oxygen, algae, growth, breeding, hatching)
    this.ecosystemAccumulatorSec += elapsedSec;
    if (this.ecosystemAccumulatorSec >= 1.0) {
      const ecoDt = this.ecosystemAccumulatorSec;
      this.ecosystemAccumulatorSec = 0;

      const { updatedState, events } = stepEcosystem(this.state, ecoDt, now);
      this.state = updatedState;

      if (events.grownFishIds.length > 0) {
        this.state = incrementMissionProgress(this.state, 'grow_fish', events.grownFishIds.length);
        this.pushPopup(
          LocalizationManager.get('POPUP_FISH_GREW', { rp: events.grownFishIds.length * 2 }),
          'rp',
          50,
          34
        );
      }

      if (events.laidEggs.length > 0) {
        const egg = events.laidEggs[0];
        const fishDef = FISH_BY_ID[egg.fishId];
        const fishName = fishDef
          ? LocalizationManager.getFishName(fishDef)
          : LocalizationManager.get('UI_FISH');
        AudioService.playBubble();
        this.pushPopup(
          LocalizationManager.get('POPUP_EGG_LAID', { name: fishName }),
          'info',
          Math.round(egg.x * 100),
          72
        );
      }

      if (events.hatchedFish.length > 0) {
        const baby = events.hatchedFish[0];
        const def = FISH_BY_ID[baby.fishId];
        const fishName = def
          ? LocalizationManager.getFishName(def)
          : LocalizationManager.get('UI_FISH');
        this.state = incrementMissionProgress(this.state, 'breed_fish', events.hatchedFish.length);
        this.grantXp(GAME_CONFIG.XP_REWARDS.BREED_FISH);
        AudioService.playDiscovery();
        this.simulation.spawnCelebrationBurst(
          this.simulation.worldWidth * 0.5,
          this.simulation.worldHeight * 0.72,
          baby.variant !== 'normal' ? '#ffe885' : '#9bf5d8'
        );
        this.pushPopup(
          baby.variant !== 'normal'
            ? LocalizationManager.get('POPUP_RARE_HATCHED', {
                variant: LocalizationManager.getVariantLabel(baby.variant),
                name: fishName,
              })
            : LocalizationManager.get('POPUP_BABY_HATCHED', { name: fishName }),
          baby.variant !== 'normal' ? 'gem' : 'beauty',
          50,
          44
        );
        if (this.state.tutorial.tutorialCompleted) {
          this.triggerContextualHint('first_breeding');
        }
      }

      // Starvation deaths (with gentle fade/fall animation)
      if (events.starvedFish.length > 0) {
        for (const sf of events.starvedFish) {
          if (sf.habitatId === this.state.activeHabitatId) {
            this.simulation.triggerFishDeathAnimation(sf.instanceId);
            const fishDef = FISH_BY_ID[sf.fishId];
            const name = fishDef
              ? LocalizationManager.getFishName(fishDef)
              : LocalizationManager.get('UI_FISH');
            this.pushPopup(
              LocalizationManager.get('POPUP_FISH_STARVED', { name }),
              'info',
              50,
              34
            );
          }
        }
      }

      // Per-Map Auto Feeder visual pellets & indicator
      if (events.autoFeeds.length > 0) {
        for (const af of events.autoFeeds) {
          if (af.habitatId === this.state.activeHabitatId) {
            const foodInfo = getMapFoodInfo(af.habitatId);
            this.simulation.dropFood(
              Math.max(4, Math.min(10, af.fedCount * 2)),
              foodInfo.pelletColor,
              true
            );
            this.pushPopup(LocalizationManager.get('POPUP_AUTO_FEED'), 'info', 50, 26);
          }
        }
      }

      // Contextual post-tutorial hints for water quality & algae
      if (this.state.tutorial.tutorialCompleted) {
        const mapSt = this.state.mapStates[this.state.activeHabitatId];
        if (mapSt) {
          if (mapSt.algaeLevel >= 28) {
            this.triggerContextualHint('glass_algae');
          } else if (mapSt.waterQuality < 74) {
            this.triggerContextualHint('water_quality_low');
          }
        }
      }

      // Sync weekly event progress (Schooling Week: active tank fish count)
      const activeCount = this.state.placedFish.filter(
        (f) => f.habitatId === this.state.activeHabitatId
      ).length;
      if (activeCount > this.state.weeklyEventProgress) {
        this.state = { ...this.state, weeklyEventProgress: activeCount };
      }

      this.syncSimulation();
    }

    // Cozy Aquarium Visitors remarks
    this.visitorRemarkTimerSec -= elapsedSec;
    if (this.visitorRemarkTimerSec <= 0) {
      this.visitorRemarkTimerSec = GAME_CONFIG.VISITOR_REMARK_INTERVAL_MS / 1000;
      this.spawnVisitorRemark();
    }

    // Passive mission checks
    const beauty = calculateBeautyBreakdown(this.state);
    this.state = incrementMissionProgress(this.state, 'reach_beauty', 0, beauty.total);
    const activeMap = this.state.mapStates[this.state.activeHabitatId];
    if (activeMap) {
      this.state = incrementMissionProgress(
        this.state,
        'maintain_water',
        0,
        Math.round(activeMap.waterQuality)
      );
    }

    this.emit();
  }

  private spawnVisitorRemark(): void {
    const eco = calculateEcosystemStatus(this.state, this.state.activeHabitatId);
    const beauty = calculateBeautyBreakdown(this.state, this.state.activeHabitatId);
    const profile = VISITOR_PROFILES[Math.floor(Math.random() * VISITOR_PROFILES.length)];

    const habitatName = LocalizationManager.getHabitatName(this.state.activeHabitatId);
    let message = LocalizationManager.get('VISITOR_REMARK_5', { habitat: habitatName });
    if (eco.waterQuality >= 88 && beauty.total >= 50) {
      message = LocalizationManager.get('VISITOR_REMARK_1');
    } else if (eco.breedingReadySpecies.length > 0) {
      message = LocalizationManager.get('VISITOR_REMARK_3');
    } else if (eco.waterQuality < 65) {
      message = LocalizationManager.get('WARN_WATER_CLOUDY');
    } else if (eco.algaeLevel >= 35) {
      message = LocalizationManager.get('VISITOR_REMARK_6');
    } else if (this.state.placedFish.filter((f) => f.habitatId === this.state.activeHabitatId).length >= 5) {
      message = LocalizationManager.get('VISITOR_REMARK_2');
    } else if (beauty.total >= 30) {
      message = LocalizationManager.get('VISITOR_REMARK_4');
    }

    this.visitorRemark = {
      id: `vis_${Date.now()}`,
      visitorName: profile.name,
      visitorRole: LocalizationManager.get(profile.roleKey),
      message,
      accentColor: profile.color,
    };

    if (this.visitorDismissTimer !== null) window.clearTimeout(this.visitorDismissTimer);
    this.visitorDismissTimer = window.setTimeout(() => {
      this.visitorRemark = null;
      this.emit();
    }, 8500);
  }

  dismissVisitorRemark(): void {
    this.visitorRemark = null;
    this.emit();
  }

  // ==================== VISUAL FEEDBACK HELPERS ====================

  private pushPopup(text: string, kind: FeedbackPopup['kind'], x = 50, y = 45): void {
    const id = `pop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.popups = [...this.popups.slice(-10), { id, text, kind, x, y }];
    window.setTimeout(() => {
      this.popups = this.popups.filter((p) => p.id !== id);
      this.emit();
    }, 1150);
  }

  private spawnFlyingCoins(count = 5, startX = 50, startY = 55): void {
    const created: FlyingCoin[] = [];
    for (let i = 0; i < count; i++) {
      created.push({
        id: `coin_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`,
        startX: startX + (Math.random() - 0.5) * 16,
        startY: startY + (Math.random() - 0.5) * 10,
      });
    }
    this.flyingCoins = [...this.flyingCoins.slice(-12), ...created];
    window.setTimeout(() => {
      const ids = new Set(created.map((c) => c.id));
      this.flyingCoins = this.flyingCoins.filter((c) => !ids.has(c.id));
      this.emit();
    }, 800);
  }

  showToast(message: string): void {
    this.toastMessage = message;
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastMessage = null;
      this.emit();
    }, 2800);
    this.emit();
  }

  private grantXp(amount: number): void {
    const { updatedState, levelUp } = awardAquariumXp(this.state, amount);
    this.state = updatedState;
    if (levelUp) {
      AudioService.playLevelUp();
      this.levelUpModal = levelUp;
      this.advanceTutorialIfAt(5);
      this.simulation.spawnCelebrationBurst(
        this.simulation.worldWidth * 0.5,
        this.simulation.worldHeight * 0.45,
        '#ffe58f'
      );
    }
  }

  private advanceTutorialIfAt(step: number): void {
    if (this.state.tutorialStep === step) {
      this.state = { ...this.state, tutorialStep: Math.min(8, step + 1) };
    }
  }

  dismissTutorial(): void {
    this.skipTutorial();
  }

  advanceTutorialManual(): void {
    this.notifyTutorialEvent('continue_clicked');
  }

  // ==================== MODULAR DATA-DRIVEN TUTORIAL ENGINE ====================

  notifyTutorialEvent(event: TutorialEventType): boolean {
    const active = getActiveTutorialStep(
      this.state.tutorial,
      this.state.settings.showTutorial
    );
    if (!active || !doesEventCompleteStep(active, event)) return false;

    const { next, completedStep, enteredStep } = advanceTutorialState(this.state.tutorial);
    this.state = {
      ...this.state,
      tutorial: next,
      tutorialStep: next.tutorialCompleted ? 8 : Math.min(7, Math.floor(next.currentStepIndex / 3)),
    };

    if (completedStep?.reward) {
      this.applyTutorialReward(completedStep.reward);
    }

    if (enteredStep) {
      this.onEnterTutorialStep(enteredStep);
    }

    AudioService.playClick();
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  private applyTutorialReward(reward: NonNullable<TutorialStepData['reward']>): void {
    const coins = reward.coins ?? 0;
    const gems = reward.gems ?? 0;
    const rp = reward.rp ?? 0;
    const nextOwned = { ...this.state.ownedDecorations };
    let nextPlacedDecor = this.state.placedDecorations;
    let nextPlacedFish = this.state.placedFish;
    const nextVariants = { ...this.state.discoveredVariants };

    if (reward.freeDecorationId) {
      nextOwned[reward.freeDecorationId] = (nextOwned[reward.freeDecorationId] ?? 0) + 1;
      if (DECORATION_BY_ID[reward.freeDecorationId]) {
        nextPlacedDecor = [
          ...nextPlacedDecor,
          {
            instanceId: `tut_reward_${reward.freeDecorationId}_${Date.now()}`,
            decorationId: reward.freeDecorationId,
            habitatId: this.state.activeHabitatId,
            x: 0.62,
            y: 0.86,
          },
        ];
      }
    }

    if (reward.exclusiveFish) {
      const { fishId, variant } = reward.exclusiveFish;
      const now = Date.now();
      nextPlacedFish = [
        ...nextPlacedFish,
        {
          instanceId: `tut_master_${fishId}_${now}`,
          fishId,
          habitatId: this.state.activeHabitatId,
          level: 1,
          placedAt: now,
          ageSec: 45,
          growthStage: 'adult',
          health: 100,
          happiness: 100,
          stressStage: 0,
          hunger: 95,
          starvationSec: 0,
          variant,
          lastBredAt: now,
        },
      ];
      const existingVars = nextVariants[fishId] ?? ['normal'];
      if (!existingVars.includes(variant)) {
        nextVariants[fishId] = [...existingVars, variant];
      }
    }

    this.state = {
      ...this.state,
      coins: this.state.coins + coins,
      totalCoinsEarned: this.state.totalCoinsEarned + coins,
      gems: this.state.gems + gems,
      researchPoints: this.state.researchPoints + rp,
      ownedDecorations: nextOwned,
      placedDecorations: nextPlacedDecor,
      placedFish: nextPlacedFish,
      discoveredVariants: nextVariants,
    };

    if (coins > 0 || gems > 0 || rp > 0) {
      AudioService.playReward();
      this.spawnFlyingCoins(5, 50, 48);
      const parts: string[] = [];
      if (coins > 0) parts.push(`+${formatNumber(coins)}`);
      if (gems > 0) parts.push(`+${gems} Gems`);
      if (rp > 0) parts.push(`+${rp} RP`);
      this.pushPopup(parts.join(' · '), gems > 0 ? 'gem' : 'coin', 50, 38);
    }
    this.syncSimulation();
  }

  private onEnterTutorialStep(step: TutorialStepData): void {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];

    if (step.stepId === 'collect_coin') {
      // Guarantee a bright, easy-to-tap floating Snail coin in the center-bottom
      if (this.simulation.creatureCoins.length === 0) {
        this.simulation.creatureCoins.push({
          id: `tut_coin_${Date.now()}`,
          creatureId: 'pond_snail',
          x: this.simulation.worldWidth * 0.48,
          y: this.simulation.worldHeight * 0.68,
          value: 10,
          phase: 0,
          isPearl: false,
          ageSec: 0,
        });
      }
    } else if (step.stepId === 'buy_first_fish') {
      if (this.state.coins < 150) {
        this.state = { ...this.state, coins: 160 };
      }
    } else if (step.stepId === 'build_school') {
      // Gift enough coins to adopt 2 additional school friends comfortably
      this.state = { ...this.state, coins: this.state.coins + 280 };
    } else if (step.stepId === 'water_quality' && mapState) {
      this.state = {
        ...this.state,
        mapStates: {
          ...this.state.mapStates,
          [habId]: { ...mapState, waterQuality: 95 },
        },
      };
    } else if (step.stepId === 'place_airstone' && mapState) {
      this.state = {
        ...this.state,
        mapStates: {
          ...this.state.mapStates,
          [habId]: { ...mapState, oxygen: 82 },
        },
      };
    } else if (step.stepId === 'growth_milestone') {
      // Advance a baby fish to juvenile right before the player's eyes!
      let grewOne = false;
      const nextFish = this.state.placedFish.map((f) => {
        if (!grewOne && f.habitatId === habId && f.growthStage === 'baby') {
          grewOne = true;
          const def = FISH_BY_ID[f.fishId];
          return {
            ...f,
            ageSec: Math.round((def?.growthTimeSec ?? 75) * 0.45),
            growthStage: 'juvenile' as const,
            health: 100,
            happiness: 100,
          };
        }
        return f;
      });
      this.state = { ...this.state, placedFish: nextFish };
      AudioService.playReward();
      this.simulation.spawnCelebrationBurst(
        this.simulation.worldWidth * 0.5,
        this.simulation.worldHeight * 0.45,
        '#8df5da'
      );
      this.syncSimulation();
    } else if (step.stepId === 'first_breeding') {
      // Lay a visible glowing tutorial egg in the tank ready to hatch!
      const now = Date.now();
      const egg: PlacedEgg = {
        eggId: `tut_egg_${now}`,
        fishId: 'guppy',
        habitatId: habId,
        x: 0.52,
        y: 0.84,
        laidAt: now,
        hatchDurationSec: 45,
        variant: 'normal',
      };
      this.state = {
        ...this.state,
        placedEggs: [...this.state.placedEggs, egg],
      };
      AudioService.playBubble();
    } else if (step.stepId === 'upgrade_aquarium') {
      if (this.state.coins < 300) {
        this.state = { ...this.state, coins: this.state.coins + 320 };
      }
    } else if (step.stepId === 'first_research') {
      if (this.state.researchPoints < 20) {
        this.state = { ...this.state, researchPoints: 25 };
      }
    }
  }

  placePendingTutorialFish(normX = 0.5, normY = 0.48): boolean {
    const fishId = this.state.tutorial.pendingFishToPlaceId;
    if (!fishId || !FISH_BY_ID[fishId]) return false;
    const def = FISH_BY_ID[fishId];
    const now = Date.now();
    const placed: PlacedFish = {
      instanceId: `tut_fish_${fishId}_${now}`,
      fishId,
      habitatId: this.state.activeHabitatId,
      level: 1,
      placedAt: now,
      ageSec: 4,
      growthStage: 'baby',
      health: 98,
      happiness: 98,
      stressStage: 0,
      hunger: 95,
      starvationSec: 0,
      variant: 'normal',
      lastBredAt: now,
    };

    this.state = {
      ...this.state,
      placedFish: [...this.state.placedFish, placed],
      tutorial: {
        ...this.state.tutorial,
        pendingFishToPlaceId: null,
      },
    };

    const wx = Math.max(0.15, Math.min(0.85, normX)) * this.simulation.worldWidth;
    const wy = Math.max(0.25, Math.min(0.75, normY)) * this.simulation.worldHeight;
    this.simulation.addRipple(wx, wy);
    this.simulation.spawnCelebrationBurst(wx, wy, def.palette.accent);
    AudioService.playBubble();
    this.syncSimulation();
    this.notifyTutorialEvent('fish_placed');
    return true;
  }

  performTutorialQuickAction(): void {
    const active = getActiveTutorialStep(
      this.state.tutorial,
      this.state.settings.showTutorial
    );
    if (!active) return;

    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];

    if (active.stepId === 'place_plant') {
      this.state = {
        ...this.state,
        ownedDecorations: {
          ...this.state.ownedDecorations,
          java_fern: (this.state.ownedDecorations['java_fern'] ?? 0) + 1,
        },
        mapStates: mapState
          ? { ...this.state.mapStates, [habId]: { ...mapState, waterQuality: 100 } }
          : this.state.mapStates,
      };
      this.placeDecorationInternal('java_fern', 0.34, 0.85);
      this.notifyTutorialEvent('plant_placed');
      return;
    }

    if (active.stepId === 'place_airstone') {
      this.state = {
        ...this.state,
        ownedDecorations: {
          ...this.state.ownedDecorations,
          air_stone: (this.state.ownedDecorations['air_stone'] ?? 0) + 1,
        },
        mapStates: mapState
          ? { ...this.state.mapStates, [habId]: { ...mapState, oxygen: 100 } }
          : this.state.mapStates,
      };
      this.placeDecorationInternal('air_stone', 0.62, 0.88);
      this.syncSimulation();
      this.notifyTutorialEvent('airstone_placed');
      return;
    }

    if (active.stepId === 'place_shelter') {
      this.state = {
        ...this.state,
        ownedDecorations: {
          ...this.state.ownedDecorations,
          anubias_tuft: (this.state.ownedDecorations['anubias_tuft'] ?? 0) + 1,
        },
      };
      this.placeDecorationInternal('anubias_tuft', 0.72, 0.86);
      this.notifyTutorialEvent('shelter_placed');
      return;
    }

    if (active.stepId === 'first_breeding') {
      const now = Date.now();
      const tutEgg = this.state.placedEggs.find((e) => e.habitatId === habId);
      const fishId = tutEgg?.fishId ?? 'guppy';
      const baby: PlacedFish = {
        instanceId: `tut_baby_${fishId}_${now}`,
        fishId,
        habitatId: habId,
        level: 1,
        placedAt: now,
        ageSec: 0,
        growthStage: 'baby',
        health: 100,
        happiness: 100,
        stressStage: 0,
        hunger: 95,
        starvationSec: 0,
        variant: 'normal',
        lastBredAt: now,
      };
      this.state = {
        ...this.state,
        placedEggs: tutEgg
          ? this.state.placedEggs.filter((e) => e.eggId !== tutEgg.eggId)
          : this.state.placedEggs,
        placedFish: [...this.state.placedFish, baby],
        stats: {
          ...this.state.stats,
          fishBredTotal: this.state.stats.fishBredTotal + 1,
        },
      };
      AudioService.playDiscovery();
      this.simulation.spawnCelebrationBurst(
        this.simulation.worldWidth * 0.52,
        this.simulation.worldHeight * 0.72,
        '#ffe885'
      );
      this.syncSimulation();
      this.notifyTutorialEvent('breeding_hatched');
      return;
    }

    if (active.stepId === 'welcome') {
      this.notifyTutorialEvent('start_clicked');
      return;
    }

    this.notifyTutorialEvent('continue_clicked');
  }

  skipTutorial(): void {
    AudioService.playClick();
    const habId = this.state.activeHabitatId;
    const hasSnail = this.state.placedCreatures.some((c) => c.habitatId === habId);
    const hasPlant = this.state.placedDecorations.some(
      (d) => d.habitatId === habId && d.decorationId === 'java_fern'
    );
    const hasAirStone = this.state.placedDecorations.some(
      (d) => d.habitatId === habId && d.decorationId === 'air_stone'
    );
    const now = Date.now();

    const nextCreatures = hasSnail
      ? this.state.placedCreatures
      : [
          ...this.state.placedCreatures,
          {
            instanceId: `skip_snail_${now}`,
            creatureId: 'pond_snail',
            habitatId: habId,
            level: 1,
            placedAt: now,
          },
        ];

    const nextDecors = [...this.state.placedDecorations];
    if (!hasPlant) {
      nextDecors.push({
        instanceId: `skip_plant_${now}`,
        decorationId: 'java_fern',
        habitatId: habId,
        x: 0.24,
        y: 0.85,
      });
    }
    if (!hasAirStone) {
      nextDecors.push({
        instanceId: `skip_air_${now}`,
        decorationId: 'air_stone',
        habitatId: habId,
        x: 0.5,
        y: 0.88,
      });
    }

    // Also drop any pending tutorial fish into the tank so it's never lost
    const pendingId = this.state.tutorial.pendingFishToPlaceId;
    const nextFish =
      pendingId && FISH_BY_ID[pendingId]
        ? [
            ...this.state.placedFish,
            {
              instanceId: `skip_fish_${pendingId}_${now}`,
              fishId: pendingId,
              habitatId: habId,
              level: 1,
              placedAt: now,
              ageSec: 12,
              growthStage: 'baby' as const,
              health: 96,
              happiness: 95,
              stressStage: 0,
              hunger: 92,
              starvationSec: 0,
              variant: 'normal' as const,
              lastBredAt: now,
            },
          ]
        : this.state.placedFish;

    this.state = {
      ...this.state,
      coins: this.state.coins + 200,
      totalCoinsEarned: this.state.totalCoinsEarned + 200,
      placedFish: nextFish,
      placedCreatures: nextCreatures,
      placedDecorations: nextDecors,
      tutorialStep: 8,
      tutorial: {
        ...this.state.tutorial,
        tutorialStarted: true,
        tutorialCompleted: true,
        skippedTutorial: true,
        currentStepIndex: TUTORIAL_STEPS.length,
        pendingFishToPlaceId: null,
      },
      settings: { ...this.state.settings, showTutorial: true },
    };

    this.syncSimulation();
    SaveManager.save(this.state);
    this.emit();
  }

  replayTutorial(): void {
    AudioService.playClick();
    this.state = {
      ...this.state,
      tutorialStep: 0,
      tutorial: {
        ...createDefaultTutorialSave(),
        contextualHintsShown: this.state.tutorial.contextualHintsShown,
      },
      settings: { ...this.state.settings, showTutorial: true },
    };
    SaveManager.save(this.state);
    this.emit();
  }

  triggerContextualHint(id: ContextualHintId, paramName?: string): void {
    if (this.state.tutorial.contextualHintsShown.includes(id)) return;
    this.state = {
      ...this.state,
      tutorial: markContextualHintShown(this.state.tutorial, id),
    };
    this.activeContextualHint = { id, paramName };
    if (this.contextualHintTimer) window.clearTimeout(this.contextualHintTimer);
    this.contextualHintTimer = window.setTimeout(() => {
      this.activeContextualHint = null;
      this.emit();
    }, 7500);
    SaveManager.save(this.state);
    this.emit();
  }

  dismissContextualHint(): void {
    this.activeContextualHint = null;
    if (this.contextualHintTimer) window.clearTimeout(this.contextualHintTimer);
    this.emit();
  }

  // ==================== OFFLINE EARNINGS 2.0 ====================

  claimOfflineEarnings(doubled = false): void {
    if (!this.offlineReport) return;
    const total = this.offlineReport.coinsEarned * (doubled ? 2 : 1);
    const rp = this.offlineReport.researchPointsEarned * (doubled ? 2 : 1);

    // Apply offline age boost & hunger reflection cleanly
    const ageBoost = Math.min(240, this.offlineReport.cappedSeconds * 0.25);
    const targetAvgHunger = this.offlineReport.avgHungerAtReturn ?? 75;
    const nextFish = this.state.placedFish.map((f) => {
      const def = FISH_BY_ID[f.fishId];
      if (!def) return f;
      const nextAge = f.ageSec + ageBoost;
      const stage =
        nextAge >= def.growthTimeSec
          ? 'breeding_adult'
          : nextAge >= def.growthTimeSec * 0.65
            ? 'adult'
            : nextAge >= def.growthTimeSec * 0.28
              ? 'juvenile'
              : 'baby';
      const nextHunger =
        f.habitatId === this.state.activeHabitatId
          ? Math.max(25, Math.min(100, Math.round(targetAvgHunger)))
          : Math.max(30, Math.min(100, (f.hunger ?? 90) - 8));
      return {
        ...f,
        ageSec: nextAge,
        growthStage: stage as PlacedFish['growthStage'],
        hunger: nextHunger,
        starvationSec: 0,
      };
    });

    const activeHab = this.state.activeHabitatId;
    const activeMap = this.state.mapStates[activeHab];
    const nextMapStates = activeMap
      ? {
          ...this.state.mapStates,
          [activeHab]: {
            ...activeMap,
            foodStored: Math.max(0, activeMap.foodStored - (this.offlineReport.foodUsed ?? 0)),
          },
        }
      : this.state.mapStates;

    this.state = {
      ...this.state,
      coins: this.state.coins + total,
      totalCoinsEarned: this.state.totalCoinsEarned + total,
      researchPoints: this.state.researchPoints + rp,
      placedFish: nextFish,
      mapStates: nextMapStates,
      lastLoginTime: Date.now(),
    };
    this.state = incrementMissionProgress(this.state, 'earn_coins', total);
    this.offlineReport = null;
    this.advanceTutorialIfAt(0);
    AudioService.playReward();
    this.spawnFlyingCoins(7, 50, 52);
    this.pushPopup(
      LocalizationManager.get('POPUP_OFFLINE_CLAIMED', {
        coins: LocalizationManager.formatNumber(total),
        rp: LocalizationManager.formatNumber(rp),
      }),
      'coin',
      50,
      44
    );
    this.syncSimulation();
    SaveManager.save(this.state);
    this.emit();
  }

  claimOfflineDoubledWithAd(): void {
    if (!this.offlineReport) return;
    if (this.state.adRemoved) {
      this.claimOfflineEarnings(true);
      return;
    }
    const rewardAmount = this.offlineReport.coinsEarned * 2;
    AdsService.showRewardedAd({
      placement: 'offline_2x',
      title: LocalizationManager.get('AD_OFFLINE_2X_TITLE'),
      rewardDescription: LocalizationManager.get('AD_OFFLINE_2X_DESC', {
        amount: LocalizationManager.formatNumber(rewardAmount),
      }),
      durationSeconds: 3,
      onReward: () => this.claimOfflineEarnings(true),
    });
  }

  // ==================== FISH & CREATURE SYSTEMS ====================

  buyFish(fishId: string, useGems = false): boolean {
    const def = FISH_BY_ID[fishId];
    if (!def) return false;

    const beauty = calculateBeautyBreakdown(this.state);
    const unlockCheck = isFishUnlocked(def, this.state, beauty.total);
    if (!unlockCheck.unlocked) {
      this.showToast(
        LocalizationManager.get('UNLOCK_REQ_PREFIX', { reason: unlockCheck.reason ?? '' })
      );
      return false;
    }

    const activeCount = this.state.placedFish.filter(
      (f) => f.habitatId === this.state.activeHabitatId
    ).length;
    const maxCap = getMapSpeciesCapacity(this.state, this.state.activeHabitatId);
    const shouldPlaceImmediately = activeCount < maxCap;

    if (useGems) {
      if (!def.gemCost || this.state.gems < def.gemCost) {
        this.showToast(LocalizationManager.get('TOAST_NEED_GEMS'));
        return false;
      }
      this.state = { ...this.state, gems: this.state.gems - def.gemCost };
    } else {
      const cost = getFishPurchaseCost(fishId, this.state);
      if (this.state.coins < cost) {
        this.showToast(LocalizationManager.get('TOAST_NEED_COINS'));
        return false;
      }
      this.state = { ...this.state, coins: this.state.coins - cost };
    }

    const now = Date.now();
    const isNewDiscovery = !this.state.discoveredFishIds.includes(fishId);
    const nextSpeciesLevel = (this.state.fishSpeciesLevels[fishId] ?? 0) + 1;
    const instanceId = `fish_${fishId}_${now}_${Math.random().toString(36).slice(2, 5)}`;

    const newPlaced: PlacedFish = {
      instanceId,
      fishId,
      habitatId: this.state.activeHabitatId,
      level: 1,
      placedAt: now,
      ageSec: Math.round(def.growthTimeSec * 0.2), // Starts as lively young baby/juvenile
      growthStage: 'baby',
      health: 95,
      happiness: 94,
      stressStage: 0,
      hunger: 92,
      starvationSec: 0,
      variant: 'normal',
      lastBredAt: now - 25_000,
    };

    const nextDiscovered = isNewDiscovery
      ? [...this.state.discoveredFishIds, fishId]
      : this.state.discoveredFishIds;

    const nextDiscoveredDates = isNewDiscovery
      ? { ...(this.state.discoveredDates ?? {}), [fishId]: now }
      : this.state.discoveredDates ?? {};

    const nextVariants = { ...this.state.discoveredVariants };
    if (!nextVariants[fishId]) nextVariants[fishId] = ['normal'];

    const activeTut = getActiveTutorialStep(
      this.state.tutorial,
      this.state.settings.showTutorial
    );
    const holdForTutorialPlacement = activeTut?.stepId === 'buy_first_fish';

    const nextPlacedFish =
      shouldPlaceImmediately && !holdForTutorialPlacement
        ? [...this.state.placedFish, newPlaced]
        : this.state.placedFish;

    const nextStoredFish =
      shouldPlaceImmediately || holdForTutorialPlacement
        ? this.state.storedFish
        : [
            ...this.state.storedFish,
            {
              instanceId,
              fishId,
              level: 1,
              ageSec: newPlaced.ageSec,
              growthStage: newPlaced.growthStage,
              variant: newPlaced.variant,
            },
          ];

    this.state = {
      ...this.state,
      discoveredFishIds: nextDiscovered,
      discoveredDates: nextDiscoveredDates,
      discoveredVariants: nextVariants,
      collectionPoints: this.state.collectionPoints + (isNewDiscovery ? 15 : 2),
      fishSpeciesLevels: {
        ...this.state.fishSpeciesLevels,
        [fishId]: nextSpeciesLevel,
      },
      placedFish: nextPlacedFish,
      storedFish: nextStoredFish,
      tutorial: holdForTutorialPlacement
        ? { ...this.state.tutorial, pendingFishToPlaceId: fishId }
        : this.state.tutorial,
      stats: {
        ...this.state.stats,
        fishPurchasedTotal: this.state.stats.fishPurchasedTotal + 1,
      },
    };

    this.state = incrementMissionProgress(this.state, 'buy_fish', 1);
    if (isNewDiscovery && !holdForTutorialPlacement) {
      this.state = incrementMissionProgress(this.state, 'discover_fish', 1);
      const bonusGems =
        def.rarity === 'Legendary' ? 15 : def.rarity === 'Epic' ? 8 : def.rarity === 'Rare' ? 5 : 3;
      const bonusRp =
        def.rarity === 'Legendary' ? 25 : def.rarity === 'Epic' ? 15 : def.rarity === 'Rare' ? 10 : 6;
      this.state = {
        ...this.state,
        gems: this.state.gems + bonusGems,
        researchPoints: this.state.researchPoints + bonusRp,
      };
      this.discoveryModal = {
        fishId,
        variant: 'normal',
        isNewDiscovery: true,
        source: 'purchase',
        bonusCoins: 0,
        bonusGems,
        bonusRp,
      };
      AudioService.playDiscovery();
      this.grantXp(GAME_CONFIG.XP_REWARDS.DISCOVER_NEW_FISH);
    } else {
      AudioService.playBubble();
      this.grantXp(GAME_CONFIG.XP_REWARDS.BUY_FISH);
    }

    this.syncSimulation();
    if (!holdForTutorialPlacement) {
      this.simulation.spawnCelebrationBurst(
        this.simulation.worldWidth * 0.5,
        this.simulation.worldHeight * 0.48,
        def.palette.accent
      );
      const localizedFishName = LocalizationManager.getFishName(def);
      this.pushPopup(
        shouldPlaceImmediately
          ? LocalizationManager.get('POPUP_FISH_ADDED', { name: localizedFishName })
          : LocalizationManager.get('POPUP_FISH_STORED', { name: localizedFishName }),
        'info',
        50,
        42
      );
    }

    // Notify Tutorial Engine for buy_first_fish or build_school
    if (holdForTutorialPlacement) {
      this.notifyTutorialEvent('fish_bought');
    } else if (activeTut?.stepId === 'build_school') {
      const tankFish = this.state.placedFish.filter(
        (f) => f.habitatId === this.state.activeHabitatId
      );
      if (tankFish.length >= 5) {
        this.notifyTutorialEvent('school_reached');
      }
    }

    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  buyCreature(creatureId: string): boolean {
    const def = CREATURE_BY_ID[creatureId];
    if (!def) return false;

    // Habitat compatibility restriction
    if (!isCreatureAllowedInHabitat(def, this.state.activeHabitatId)) {
      this.showToast(LocalizationManager.get('CREATURE_HABITAT_BLOCKED'));
      return false;
    }

    // Tank space check for large creatures
    if (def.spaceRequirement > 0) {
      const eco = calculateEcosystemStatus(this.state, this.state.activeHabitatId);
      if (eco.spaceUsed + def.spaceRequirement > eco.spaceMax) {
        this.showToast(
          LocalizationManager.get('TOAST_NEED_SPACE', { space: def.spaceRequirement })
        );
        return false;
      }
    }

    const cost = getCreaturePurchaseCost(creatureId, this.state);
    if (this.state.coins < cost) {
      this.showToast(LocalizationManager.get('TOAST_NEED_COINS_CREATURE'));
      return false;
    }

    const now = Date.now();
    const isNew = !this.state.discoveredCreatureIds.includes(creatureId);
    const instanceId = `creature_${creatureId}_${now}_${Math.random().toString(36).slice(2, 5)}`;

    this.state = {
      ...this.state,
      coins: this.state.coins - cost,
      researchPoints: this.state.researchPoints + (isNew ? 8 : 2),
      collectionPoints: this.state.collectionPoints + (isNew ? 12 : 2),
      discoveredCreatureIds: isNew
        ? [...this.state.discoveredCreatureIds, creatureId]
        : this.state.discoveredCreatureIds,
      discoveredDates: isNew
        ? { ...(this.state.discoveredDates ?? {}), [creatureId]: now }
        : this.state.discoveredDates ?? {},
      placedCreatures: [
        ...this.state.placedCreatures,
        {
          instanceId,
          creatureId,
          habitatId: this.state.activeHabitatId,
          level: 1,
          placedAt: now,
        },
      ],
    };

    AudioService.playReward();
    this.grantXp(GAME_CONFIG.XP_REWARDS.BUY_CREATURE);
    this.syncSimulation();
    this.pushPopup(
      LocalizationManager.get('POPUP_CREATURE_JOINED', {
        name: LocalizationManager.getCreatureName(def),
      }),
      'beauty',
      50,
      68
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  private awardCreatureCoin(coin: FloatingCreatureCoin, silent = false): void {
    this.state = {
      ...this.state,
      coins: this.state.coins + coin.value,
      totalCoinsEarned: this.state.totalCoinsEarned + coin.value,
      stats: {
        ...this.state.stats,
        creatureCoinsCollected: this.state.stats.creatureCoinsCollected + 1,
      },
    };
    this.state = incrementMissionProgress(this.state, 'earn_coins', coin.value);
    this.state = incrementMissionProgress(this.state, 'collect_creature_coins', 1);

    if (!silent) {
      AudioService.playCoin();
      const pctX = Math.round((coin.x / Math.max(1, this.simulation.worldWidth)) * 100);
      const pctY = Math.round((coin.y / Math.max(1, this.simulation.worldHeight)) * 100);
      this.spawnFlyingCoins(3, pctX, pctY);
      this.pushPopup(
        LocalizationManager.get(coin.isPearl ? 'POPUP_PEARL' : 'POPUP_SHELL', {
          amount: LocalizationManager.formatNumber(coin.value),
        }),
        'coin',
        pctX,
        pctY - 5
      );
      this.notifyTutorialEvent('coin_collected');
    }
    this.emit();
  }

  collectAllCreatureCoins(): void {
    const taken = this.simulation.takeAllCreatureCoins();
    if (taken.length === 0) return;
    let total = 0;
    for (const c of taken) total += c.value;
    this.state = {
      ...this.state,
      coins: this.state.coins + total,
      totalCoinsEarned: this.state.totalCoinsEarned + total,
      stats: {
        ...this.state.stats,
        creatureCoinsCollected: this.state.stats.creatureCoinsCollected + taken.length,
      },
    };
    this.state = incrementMissionProgress(this.state, 'earn_coins', total);
    this.state = incrementMissionProgress(this.state, 'collect_creature_coins', taken.length);
    AudioService.playReward();
    this.spawnFlyingCoins(6, 50, 62);
    this.pushPopup(`+${formatNumber(total)}`, 'coin', 50, 52);
    this.notifyTutorialEvent('coin_collected');
    SaveManager.save(this.state);
    this.emit();
  }

  cleanGlassAlgae(): void {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return;

    const nextAlgae = Math.max(0, mapState.algaeLevel - 45);
    const nextWater = Math.min(100, mapState.waterQuality + 10);

    this.state = {
      ...this.state,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          algaeLevel: nextAlgae,
          waterQuality: nextWater,
        },
      },
      researchPoints: this.state.researchPoints + 2,
      stats: {
        ...this.state.stats,
        algaeCleanedTotal: this.state.stats.algaeCleanedTotal + 1,
      },
    };

    AudioService.playBubble();
    this.grantXp(GAME_CONFIG.XP_REWARDS.CLEAN_ALGAE);
    this.simulation.spawnCelebrationBurst(
      this.simulation.worldWidth * 0.5,
      this.simulation.worldHeight * 0.5,
      '#9bf5d8'
    );
    this.pushPopup(LocalizationManager.get('POPUP_GLASS_CLEAN'), 'beauty', 50, 40);
    SaveManager.save(this.state);
    this.emit();
  }

  placeStoredFish(instanceId: string): boolean {
    const activeCount = this.state.placedFish.filter(
      (f) => f.habitatId === this.state.activeHabitatId
    ).length;
    if (activeCount >= getMapSpeciesCapacity(this.state, this.state.activeHabitatId)) {
      this.showToast(LocalizationManager.get('TOAST_TANK_FULL'));
      return false;
    }

    const found = this.state.storedFish.find((f) => f.instanceId === instanceId);
    if (!found) return false;
    const now = Date.now();

    this.state = {
      ...this.state,
      storedFish: this.state.storedFish.filter((f) => f.instanceId !== instanceId),
      placedFish: [
        ...this.state.placedFish,
        {
          instanceId: found.instanceId,
          fishId: found.fishId,
          habitatId: this.state.activeHabitatId,
          level: found.level,
          placedAt: now,
          ageSec: found.ageSec ?? 45,
          growthStage: found.growthStage ?? 'adult',
          health: 95,
          happiness: 94,
          stressStage: 0,
          hunger: 92,
          starvationSec: 0,
          variant: found.variant ?? 'normal',
          lastBredAt: now - 30_000,
        },
      ],
    };

    this.advanceTutorialIfAt(2);
    AudioService.playBubble();
    this.syncSimulation();
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  storePlacedFish(instanceId: string): boolean {
    const found = this.state.placedFish.find((f) => f.instanceId === instanceId);
    if (!found) return false;

    if (this.state.placedFish.length <= 1) {
      this.showToast(LocalizationManager.get('TOAST_KEEP_ONE_FISH'));
      return false;
    }

    this.state = {
      ...this.state,
      placedFish: this.state.placedFish.filter((f) => f.instanceId !== instanceId),
      storedFish: [
        ...this.state.storedFish,
        {
          instanceId: found.instanceId,
          fishId: found.fishId,
          level: found.level,
          ageSec: found.ageSec,
          growthStage: found.growthStage,
          variant: found.variant,
        },
      ],
    };

    AudioService.playClick();
    this.syncSimulation();
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  // ==================== DECORATION & EQUIPMENT SYSTEM ====================

  buyDecoration(decorationId: string, useGems = false): boolean {
    const def = DECORATION_BY_ID[decorationId];
    if (!def) return false;

    const beauty = calculateBeautyBreakdown(this.state);
    const unlockCheck = isDecorationUnlocked(def, this.state, beauty.total);
    if (!unlockCheck.unlocked) {
      this.showToast(
        LocalizationManager.get('UNLOCK_REQ_PREFIX', { reason: unlockCheck.reason ?? '' })
      );
      return false;
    }

    if (useGems) {
      if (!def.gemCost || this.state.gems < def.gemCost) {
        this.showToast(LocalizationManager.get('TOAST_NEED_GEMS'));
        return false;
      }
      this.state = { ...this.state, gems: this.state.gems - def.gemCost };
    } else {
      if (this.state.coins < def.cost) {
        this.showToast(LocalizationManager.get('TOAST_NEED_COINS_DECOR'));
        return false;
      }
      this.state = { ...this.state, coins: this.state.coins - def.cost };
    }

    const nextOwned = (this.state.ownedDecorations[decorationId] ?? 0) + 1;
    this.state = {
      ...this.state,
      ownedDecorations: {
        ...this.state.ownedDecorations,
        [decorationId]: nextOwned,
      },
    };

    if (def.placementZone === 'substrate') {
      this.state = {
        ...this.state,
        activeSubstrates: {
          ...this.state.activeSubstrates,
          [this.state.activeHabitatId]: decorationId,
        },
      };
      AudioService.playPlaceDecor();
      this.grantXp(GAME_CONFIG.XP_REWARDS.PLACE_DECORATION);
      this.pushPopup(
        LocalizationManager.get('POPUP_DECOR_APPLIED', {
          name: LocalizationManager.getDecorationName(def),
        }),
        'beauty',
        50,
        48
      );
    } else if (def.placementZone === 'background') {
      this.state = {
        ...this.state,
        activeBackgrounds: {
          ...this.state.activeBackgrounds,
          [this.state.activeHabitatId]: decorationId,
        },
      };
      AudioService.playPlaceDecor();
      this.grantXp(GAME_CONFIG.XP_REWARDS.PLACE_DECORATION);
      this.pushPopup(
        LocalizationManager.get('POPUP_DECOR_APPLIED', {
          name: LocalizationManager.getDecorationName(def),
        }),
        'beauty',
        50,
        48
      );
    } else {
      const spotX = this.findPleasingDecorX();
      const spotY = def.placementZone === 'floor' ? 0.85 : 0.55;
      this.placeDecorationInternal(decorationId, spotX, spotY);
    }

    if (def.category === 'Plants') this.advanceTutorialIfAt(3);
    this.advanceTutorialIfAt(4);

    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  private findPleasingDecorX(): number {
    const existing = this.state.placedDecorations.filter(
      (d) => d.habitatId === this.state.activeHabitatId
    );
    const candidates = [0.5, 0.34, 0.66, 0.16, 0.84, 0.42, 0.58, 0.28, 0.76];
    let bestX = 0.5;
    let bestMinDist = -1;
    for (const c of candidates) {
      let minDist = 1;
      for (const e of existing) {
        minDist = Math.min(minDist, Math.abs(e.x - c));
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestX = c;
      }
    }
    return bestX;
  }

  startPlacingDecoration(decorationId: string | null): void {
    this.placingDecorationId = decorationId;
    this.selectedPlacedDecorId = null;
    this.emit();
  }

  selectPlacedDecoration(instanceId: string | null): void {
    this.selectedPlacedDecorId = instanceId;
    this.emit();
  }

  applySurfaceDecoration(decorationId: string): void {
    const def = DECORATION_BY_ID[decorationId];
    if (!def || (this.state.ownedDecorations[decorationId] ?? 0) <= 0) return;

    if (def.placementZone === 'substrate') {
      this.state = {
        ...this.state,
        activeSubstrates: {
          ...this.state.activeSubstrates,
          [this.state.activeHabitatId]: decorationId,
        },
      };
    } else if (def.placementZone === 'background') {
      const current = this.state.activeBackgrounds[this.state.activeHabitatId];
      this.state = {
        ...this.state,
        activeBackgrounds: {
          ...this.state.activeBackgrounds,
          [this.state.activeHabitatId]: current === decorationId ? undefined : decorationId,
        },
      };
    }
    AudioService.playPlaceDecor();
    SaveManager.save(this.state);
    this.emit();
  }

  placeOwnedDecorationAt(decorationId: string, normX: number, normY: number): boolean {
    const owned = this.state.ownedDecorations[decorationId] ?? 0;
    const currentlyPlaced = this.state.placedDecorations.filter(
      (d) => d.decorationId === decorationId
    ).length;
    if (owned <= currentlyPlaced) {
      this.showToast(LocalizationManager.get('TOAST_ALL_DECOR_PLACED'));
      this.placingDecorationId = null;
      this.emit();
      return false;
    }

    const def = DECORATION_BY_ID[decorationId];
    const clampedX = Math.max(0.08, Math.min(0.92, normX));
    const clampedY =
      def?.placementZone === 'floor'
        ? Math.max(0.76, Math.min(0.89, normY))
        : Math.max(0.24, Math.min(0.86, normY));

    this.placeDecorationInternal(decorationId, clampedX, clampedY);
    this.placingDecorationId = null;
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  private placeDecorationInternal(decorationId: string, x: number, y: number): void {
    const def = DECORATION_BY_ID[decorationId];
    if (!def) return;
    const prevBeauty = calculateBeautyBreakdown(this.state).total;
    const instanceId = `decor_${decorationId}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

    this.state = {
      ...this.state,
      placedDecorations: [
        ...this.state.placedDecorations,
        {
          instanceId,
          decorationId,
          habitatId: this.state.activeHabitatId,
          x,
          y,
        },
      ],
      stats: {
        ...this.state.stats,
        decorationsPlacedTotal: this.state.stats.decorationsPlacedTotal + 1,
      },
    };

    this.state = incrementMissionProgress(this.state, 'place_decoration', 1);
    const nextBeauty = calculateBeautyBreakdown(this.state).total;
    const deltaBeauty = nextBeauty - prevBeauty;

    AudioService.playPlaceDecor();
    this.grantXp(GAME_CONFIG.XP_REWARDS.PLACE_DECORATION);
    this.simulation.spawnCelebrationBurst(
      x * this.simulation.worldWidth,
      y * this.simulation.worldHeight,
      '#9bf5d8'
    );
    this.pushPopup(
      deltaBeauty > 0
        ? LocalizationManager.get('POPUP_BEAUTY_GAIN', { amount: deltaBeauty })
        : LocalizationManager.get('POPUP_DECOR_PLACED', {
            name: LocalizationManager.getDecorationName(def),
          }),
      'beauty',
      Math.round(x * 100),
      Math.round(y * 100) - 10
    );
  }

  movePlacedDecoration(instanceId: string, normX: number, normY: number): void {
    const existing = this.state.placedDecorations.find((d) => d.instanceId === instanceId);
    if (!existing) return;
    const def = DECORATION_BY_ID[existing.decorationId];
    const x = Math.max(0.07, Math.min(0.93, normX));
    const y =
      def?.placementZone === 'floor'
        ? Math.max(0.76, Math.min(0.89, normY))
        : Math.max(0.22, Math.min(0.88, normY));

    this.state = {
      ...this.state,
      placedDecorations: this.state.placedDecorations.map((d) =>
        d.instanceId === instanceId ? { ...d, x, y } : d
      ),
    };
    this.emit();
  }

  finishMovingDecoration(): void {
    AudioService.playPlaceDecor();
    SaveManager.save(this.state);
    this.emit();
  }

  flipPlacedDecoration(instanceId: string): void {
    this.state = {
      ...this.state,
      placedDecorations: this.state.placedDecorations.map((d) =>
        d.instanceId === instanceId ? { ...d, flipped: !d.flipped } : d
      ),
    };
    AudioService.playClick();
    SaveManager.save(this.state);
    this.emit();
  }

  removePlacedDecoration(instanceId: string): void {
    this.state = {
      ...this.state,
      placedDecorations: this.state.placedDecorations.filter((d) => d.instanceId !== instanceId),
    };
    if (this.selectedPlacedDecorId === instanceId) {
      this.selectedPlacedDecorId = null;
    }
    AudioService.playClick();
    SaveManager.save(this.state);
    this.emit();
  }

  // ==================== GLOBAL & LOCAL MAP UPGRADES ====================

  buyUpgrade(upgradeId: UpgradeId): boolean {
    const def = UPGRADE_BY_ID[upgradeId];
    if (!def) return false;
    const level = this.state.upgradeLevels[upgradeId] ?? 0;
    if (level >= def.maxLevel) {
      this.showToast(
        LocalizationManager.get('TOAST_ALREADY_MAXED', {
          name: LocalizationManager.getGlobalUpgradeName(def),
        })
      );
      return false;
    }

    const cost = getUpgradeCost(upgradeId, level);
    if (this.state.coins < cost) {
      this.showToast(LocalizationManager.get('TOAST_NEED_COINS_UPGRADE'));
      return false;
    }

    this.state = {
      ...this.state,
      coins: this.state.coins - cost,
      upgradeLevels: {
        ...this.state.upgradeLevels,
        [upgradeId]: level + 1,
      },
    };

    this.state = incrementMissionProgress(this.state, 'buy_upgrade', 1);
    AudioService.playReward();
    this.grantXp(GAME_CONFIG.XP_REWARDS.BUY_UPGRADE);
    this.pushPopup(
      `${LocalizationManager.getGlobalUpgradeName(def)} ${LocalizationManager.get('UI_LEVEL_SHORT')}${level + 1}`,
      'info',
      50,
      38
    );
    this.notifyTutorialEvent('upgrade_bought');
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  buyLocalUpgrade(upgradeId: LocalUpgradeId): boolean {
    const def = LOCAL_UPGRADE_BY_ID[upgradeId];
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!def || !mapState) return false;

    const level = mapState.localUpgrades[upgradeId] ?? 0;
    if (level >= def.maxLevel) {
      this.showToast(
        LocalizationManager.get('TOAST_MAXED_IN_MAP', {
          name: LocalizationManager.getLocalUpgradeName(def),
          habitat: LocalizationManager.getHabitatName(habId),
        })
      );
      return false;
    }

    const cost = getLocalUpgradeCost(upgradeId, level, habId);
    if (this.state.coins < cost) {
      this.showToast(LocalizationManager.get('TOAST_NEED_COINS_UPGRADE'));
      return false;
    }

    this.state = {
      ...this.state,
      coins: this.state.coins - cost,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          localUpgrades: {
            ...mapState.localUpgrades,
            [upgradeId]: level + 1,
          },
        },
      },
    };

    this.state = incrementMissionProgress(this.state, 'buy_upgrade', 1);
    AudioService.playReward();
    this.grantXp(GAME_CONFIG.XP_REWARDS.BUY_UPGRADE);
    this.pushPopup(
      `${LocalizationManager.getHabitatName(habId)}: ${LocalizationManager.getLocalUpgradeName(def)} ${LocalizationManager.get('UI_LEVEL_SHORT')}${level + 1}`,
      'info',
      50,
      38
    );
    this.notifyTutorialEvent('upgrade_bought');
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  // ==================== RESEARCH, SPECIALISTS & CONSERVATION ====================

  buyResearch(researchId: string): boolean {
    const node = RESEARCH_BY_ID[researchId];
    if (!node) return false;
    const level = this.state.researchLevels[researchId] ?? 0;
    if (level >= node.maxLevel) {
      this.showToast(
        LocalizationManager.get('TOAST_ALREADY_MAXED', {
          name: LocalizationManager.getResearchName(node),
        })
      );
      return false;
    }
    if (node.requiresId && (this.state.researchLevels[node.requiresId] ?? 0) <= 0) {
      const reqName = LocalizationManager.getResearchName(node.requiresId);
      this.showToast(LocalizationManager.get('TOAST_RESEARCH_REQ', { name: reqName }));
      return false;
    }

    const cost = Math.round(node.rpCost * Math.pow(1.45, level));
    if (this.state.researchPoints < cost) {
      this.showToast(
        LocalizationManager.get('TOAST_NEED_RP', {
          cost: LocalizationManager.formatNumber(cost),
        })
      );
      return false;
    }

    this.state = {
      ...this.state,
      researchPoints: this.state.researchPoints - cost,
      researchLevels: {
        ...this.state.researchLevels,
        [researchId]: level + 1,
      },
    };

    this.state = incrementMissionProgress(this.state, 'complete_research', 1);
    AudioService.playDiscovery();
    this.syncSimulation();
    this.pushPopup(
      `${LocalizationManager.getResearchName(node)} ${LocalizationManager.get('UI_LEVEL_SHORT')}${level + 1}`,
      'rp',
      50,
      40
    );
    this.notifyTutorialEvent('research_bought');
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  unlockOrUpgradeSpecialist(specialistId: string): boolean {
    const spec = SPECIALIST_BY_ID[specialistId];
    if (!spec) return false;
    const currentLv = this.state.unlockedSpecialists[specialistId] ?? 0;
    if (currentLv >= spec.maxLevel) {
      this.showToast(
        LocalizationManager.get('TOAST_ALREADY_MAXED', {
          name: LocalizationManager.getSpecialistName(spec),
        })
      );
      return false;
    }
    const cost =
      currentLv === 0
        ? spec.unlockRpCost
        : Math.round(spec.upgradeRpBase * Math.pow(1.4, currentLv - 1));
    if (this.state.researchPoints < cost) {
      this.showToast(
        LocalizationManager.get('TOAST_NEED_RP', {
          cost: LocalizationManager.formatNumber(cost),
        })
      );
      return false;
    }

    const nextUnlocked = {
      ...this.state.unlockedSpecialists,
      [specialistId]: currentLv + 1,
    };

    // Auto-assign to active map if a slot is open when first unlocked
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    let nextAssigned = mapState?.assignedSpecialistIds ?? [];
    if (
      currentLv === 0 &&
      nextAssigned.length < GAME_CONFIG.MAX_SPECIALISTS_PER_MAP &&
      !nextAssigned.includes(specialistId)
    ) {
      nextAssigned = [...nextAssigned, specialistId];
    }

    this.state = {
      ...this.state,
      researchPoints: this.state.researchPoints - cost,
      unlockedSpecialists: nextUnlocked,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          assignedSpecialistIds: nextAssigned,
        },
      },
    };

    AudioService.playReward();
    const specName = LocalizationManager.getSpecialistName(spec);
    this.pushPopup(
      currentLv === 0
        ? LocalizationManager.get('POPUP_HIRED_SPEC', { name: specName })
        : `${specName} ${LocalizationManager.get('UI_LEVEL_SHORT')}${currentLv + 1}`,
      'rp',
      50,
      40
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  toggleAssignSpecialist(specialistId: string): void {
    if ((this.state.unlockedSpecialists[specialistId] ?? 0) <= 0) return;
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return;

    const current = mapState.assignedSpecialistIds;
    let next: string[];
    if (current.includes(specialistId)) {
      next = current.filter((id) => id !== specialistId);
    } else if (current.length < GAME_CONFIG.MAX_SPECIALISTS_PER_MAP) {
      next = [...current, specialistId];
    } else {
      next = [current[1], specialistId];
    }

    this.state = {
      ...this.state,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          assignedSpecialistIds: next,
        },
      },
    };
    AudioService.playClick();
    SaveManager.save(this.state);
    this.emit();
  }

  contributeConservation(projectId: string): boolean {
    const proj = CONSERVATION_CATALOG.find((p) => p.id === projectId);
    if (!proj || this.state.completedConservationIds.includes(projectId)) return false;

    if (this.state.discoveredFishIds.length < proj.minDiscoveredSpecies) {
      this.showToast(
        LocalizationManager.get('TOAST_DISCOVER_SPECIES_FIRST', {
          count: proj.minDiscoveredSpecies,
        })
      );
      return false;
    }
    if (this.state.coins < proj.coinCost || this.state.researchPoints < proj.rpCost) {
      this.showToast(LocalizationManager.get('TOAST_NEED_COINS_OR_RP'));
      return false;
    }

    this.state = {
      ...this.state,
      coins: this.state.coins - proj.coinCost,
      researchPoints: this.state.researchPoints - proj.rpCost,
      completedConservationIds: [...this.state.completedConservationIds, projectId],
      gems: this.state.gems + 25,
    };

    AudioService.playLevelUp();
    this.simulation.spawnCelebrationBurst(
      this.simulation.worldWidth * 0.5,
      this.simulation.worldHeight * 0.45,
      '#7be3d4'
    );
    this.pushPopup(
      LocalizationManager.get('POPUP_COMPLETE', {
        name: LocalizationManager.getConservationName(proj),
      }),
      'beauty',
      50,
      42
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  claimMapMastery(habitatId: HabitatId, tier: number): boolean {
    const mapState = this.state.mapStates[habitatId];
    if (!mapState || mapState.claimedMasteryTiers.includes(tier)) return false;
    const speciesIdx = getMapSpeciesIndex(this.state, habitatId);
    const legacyMastery = getMapMasteryPercent(this.state, habitatId);
    const progressPct = Math.max(speciesIdx.percent, legacyMastery);
    if (progressPct < tier) return false;

    const rpReward =
      tier >= 100 ? 75 : tier >= 90 ? 50 : tier >= 75 ? 35 : tier >= 50 ? 20 : 12;
    const gemReward =
      tier >= 100 ? 35 : tier >= 90 ? 22 : tier >= 75 ? 15 : tier >= 50 ? 10 : 5;
    const tokenReward =
      tier >= 100 ? 18 : tier >= 90 ? 12 : tier >= 75 ? 8 : 5;

    this.state = {
      ...this.state,
      gems: this.state.gems + gemReward,
      researchPoints: this.state.researchPoints + rpReward,
      mapStates: {
        ...this.state.mapStates,
        [habitatId]: {
          ...mapState,
          mapTokens: mapState.mapTokens + tokenReward,
          claimedMasteryTiers: [...mapState.claimedMasteryTiers, tier],
        },
      },
    };

    AudioService.playReward();
    this.pushPopup(
      tier >= 100
        ? LocalizationManager.get('POPUP_MAP_MASTER_100', { rp: rpReward, gems: gemReward })
        : LocalizationManager.get('POPUP_MAP_INDEX_PCT', {
            tier,
            rp: rpReward,
            gems: gemReward,
          }),
      'gem',
      50,
      42
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  claimWeeklyEvent(): boolean {
    const activeEvent = EVENT_CATALOG.find((e) => e.active);
    if (!activeEvent || this.state.weeklyEventClaimed) return false;
    if (this.state.weeklyEventProgress < activeEvent.target) return false;

    this.state = {
      ...this.state,
      coins: this.state.coins + 1800,
      totalCoinsEarned: this.state.totalCoinsEarned + 1800,
      researchPoints: this.state.researchPoints + 40,
      gems: this.state.gems + 15,
      weeklyEventClaimed: true,
    };

    AudioService.playLevelUp();
    this.spawnFlyingCoins(7, 50, 48);
    this.pushPopup(
      LocalizationManager.get('POPUP_EVENT_COMPLETE', {
        name: LocalizationManager.getEventName(activeEvent),
      }),
      'gem',
      50,
      42
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  // ==================== FEEDING, FOOD STORAGE & AUTO FEEDER ====================

  buyFoodPack(): boolean {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return false;

    const info = getMapFoodInfo(habId);
    const cap = getFoodStorageCapacity(mapState.foodStorageLevel, mapState.masteryLevel);
    if (mapState.foodStored >= cap) {
      this.showToast(LocalizationManager.get('TOAST_FOOD_STORAGE_FULL'));
      return false;
    }

    const packSize = Math.max(info.buyPackAmount, Math.round(cap * 0.25));
    const cost = Math.round(info.buyPackCoinCost * (packSize / Math.max(1, info.buyPackAmount)));
    if (this.state.coins < cost) {
      this.showToast(LocalizationManager.get('TOAST_NEED_COINS'));
      return false;
    }

    const added = Math.min(packSize, cap - mapState.foodStored);
    this.state = {
      ...this.state,
      coins: this.state.coins - cost,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          foodStored: Math.min(cap, mapState.foodStored + added),
        },
      },
    };

    AudioService.playCoin();
    this.pushPopup(
      `+${Math.round(added)} ${LocalizationManager.getMapFoodName(habId)}`,
      'info',
      50,
      40
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  upgradeFoodStorage(): boolean {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return false;
    if (mapState.foodStorageLevel >= MAX_FOOD_STORAGE_LEVEL) {
      this.showToast(
        LocalizationManager.get('TOAST_ALREADY_MAXED', {
          name: LocalizationManager.get('FEED_STORAGE'),
        })
      );
      return false;
    }

    const cost = getFoodStorageUpgradeCost(mapState.foodStorageLevel, habId);
    if (this.state.coins < cost) {
      this.showToast(LocalizationManager.get('TOAST_NEED_COINS_UPGRADE'));
      return false;
    }

    const nextLv = mapState.foodStorageLevel + 1;
    const nextCap = getFoodStorageCapacity(nextLv, mapState.masteryLevel);
    this.state = {
      ...this.state,
      coins: this.state.coins - cost,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          foodStorageLevel: nextLv,
          foodStored: Math.min(nextCap, mapState.foodStored + 25),
        },
      },
    };

    AudioService.playReward();
    this.grantXp(GAME_CONFIG.XP_REWARDS.BUY_UPGRADE);
    this.pushPopup(
      LocalizationManager.get('POPUP_FOOD_STORAGE_LV', {
        lv: nextLv,
        cap: LocalizationManager.formatNumber(nextCap),
      }),
      'info',
      50,
      38
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  upgradeFoodFactory(): boolean {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return false;
    if (mapState.foodFactoryLevel >= MAX_FOOD_FACTORY_LEVEL) {
      this.showToast(
        LocalizationManager.get('TOAST_ALREADY_MAXED', {
          name: LocalizationManager.get('FEED_FACTORY'),
        })
      );
      return false;
    }

    const cost = getFoodFactoryUpgradeCost(mapState.foodFactoryLevel, habId);
    if (this.state.coins < cost) {
      this.showToast(LocalizationManager.get('TOAST_NEED_COINS_UPGRADE'));
      return false;
    }

    const nextLv = mapState.foodFactoryLevel + 1;
    this.state = {
      ...this.state,
      coins: this.state.coins - cost,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          foodFactoryLevel: nextLv,
        },
      },
    };

    AudioService.playReward();
    this.grantXp(GAME_CONFIG.XP_REWARDS.BUY_UPGRADE);
    this.pushPopup(
      LocalizationManager.get('POPUP_FOOD_FACTORY_LV', { lv: nextLv }),
      'info',
      50,
      38
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  upgradeAutoFeeder(): boolean {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return false;
    if (mapState.autoFeederLevel >= MAX_AUTO_FEEDER_LEVEL) {
      this.showToast(
        LocalizationManager.get('TOAST_ALREADY_MAXED', {
          name: LocalizationManager.get('FEED_AUTO_FEEDER'),
        })
      );
      return false;
    }

    const cost = getAutoFeederLevelCost(mapState.autoFeederLevel, habId);
    if (this.state.coins < cost.coins) {
      this.showToast(LocalizationManager.get('TOAST_NEED_COINS_UPGRADE'));
      return false;
    }
    if (cost.tokens > 0 && mapState.mapTokens < cost.tokens) {
      this.showToast(LocalizationManager.get('TOAST_NEED_TOKENS', { count: cost.tokens }));
      return false;
    }

    const nextLv = mapState.autoFeederLevel + 1;
    this.state = {
      ...this.state,
      coins: this.state.coins - cost.coins,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          mapTokens: mapState.mapTokens - cost.tokens,
          autoFeederLevel: nextLv,
          autoFeederLastRunMs: 0,
        },
      },
    };

    AudioService.playLevelUp();
    this.grantXp(GAME_CONFIG.XP_REWARDS.BUY_UPGRADE);
    this.pushPopup(
      nextLv === 1
        ? LocalizationManager.get('POPUP_AUTO_FEEDER_UNLOCKED')
        : `${LocalizationManager.get('FEED_AUTO_FEEDER')} ${LocalizationManager.get('UI_LEVEL_SHORT')}${nextLv}`,
      'beauty',
      50,
      38
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  upgradeAutoFeederTree(upgradeId: AutoFeederUpgradeId): boolean {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    const def = AUTO_FEEDER_TREE_BY_ID[upgradeId];
    if (!mapState || !def) return false;

    if (mapState.autoFeederLevel < def.minAutoFeederLevel) {
      this.showToast(
        LocalizationManager.get('FEED_AUTO_REQUIRES', { level: def.minAutoFeederLevel })
      );
      return false;
    }

    const currentLv = mapState.autoFeederUpgrades[upgradeId] ?? 0;
    if (currentLv >= def.maxLevel) {
      this.showToast(
        LocalizationManager.get('TOAST_ALREADY_MAXED', {
          name: LocalizationManager.getAutoFeederNodeName(upgradeId),
        })
      );
      return false;
    }

    const cost = getAutoFeederTreeCost(upgradeId, currentLv, habId);
    if (this.state.coins < cost.coins) {
      this.showToast(LocalizationManager.get('TOAST_NEED_COINS_UPGRADE'));
      return false;
    }
    if (cost.tokens > 0 && mapState.mapTokens < cost.tokens) {
      this.showToast(LocalizationManager.get('TOAST_NEED_TOKENS', { count: cost.tokens }));
      return false;
    }

    this.state = {
      ...this.state,
      coins: this.state.coins - cost.coins,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          mapTokens: mapState.mapTokens - cost.tokens,
          autoFeederUpgrades: {
            ...mapState.autoFeederUpgrades,
            [upgradeId]: currentLv + 1,
          },
        },
      },
    };

    AudioService.playReward();
    this.pushPopup(
      `${LocalizationManager.getAutoFeederNodeName(upgradeId)} ${LocalizationManager.get('UI_LEVEL_SHORT')}${currentLv + 1}`,
      'info',
      50,
      38
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  // ==================== MILESTONES, MAP MASTERY & EXPANSIONS ====================

  claimMilestone(milestoneId: string): boolean {
    const ms = MILESTONE_BY_ID[milestoneId];
    if (!ms || !isMilestoneClaimable(this.state, ms)) return false;

    const r = ms.reward;
    this.state = {
      ...this.state,
      coins: this.state.coins + (r.coins ?? 0),
      totalCoinsEarned: this.state.totalCoinsEarned + (r.coins ?? 0),
      gems: this.state.gems + (r.gems ?? 0),
      researchPoints: this.state.researchPoints + (r.researchPoints ?? 0),
      claimedMilestoneIds: [...(this.state.claimedMilestoneIds ?? []), milestoneId],
    };

    AudioService.playLevelUp();
    this.spawnFlyingCoins(6, 50, 48);
    this.pushPopup(
      `${LocalizationManager.getMilestoneTitle(ms)}: ${LocalizationManager.getMilestoneBadge(ms)}`,
      'gem',
      50,
      40
    );
    if (r.retroactiveMapExpansion) {
      const targetHab = LocalizationManager.getHabitatName(r.retroactiveMapExpansion.habitatId);
      this.showToast(LocalizationManager.get('TOAST_EXPANSION_UNLOCKED', { habitat: targetHab }));
    }
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  upgradeMapMastery(habitatId: HabitatId): boolean {
    const mapState = this.state.mapStates[habitatId];
    if (!mapState) return false;
    const currentLv = mapState.masteryLevel ?? 1;
    if (currentLv >= MAX_MAP_MASTERY_LEVEL) {
      this.showToast(LocalizationManager.get('TOAST_MAP_MASTERY_MAX'));
      return false;
    }

    const cost = getMapMasteryUpgradeCost(currentLv, habitatId);
    if (this.state.coins < cost.coins) {
      this.showToast(LocalizationManager.get('TOAST_NEED_COINS_UPGRADE'));
      return false;
    }
    if (mapState.mapTokens < cost.tokens) {
      this.showToast(LocalizationManager.get('TOAST_NEED_TOKENS', { count: cost.tokens }));
      return false;
    }

    const nextLv = currentLv + 1;
    this.state = {
      ...this.state,
      coins: this.state.coins - cost.coins,
      mapStates: {
        ...this.state.mapStates,
        [habitatId]: {
          ...mapState,
          mapTokens: mapState.mapTokens - cost.tokens,
          masteryLevel: nextLv,
        },
      },
    };

    AudioService.playLevelUp();
    this.pushPopup(
      LocalizationManager.get('POPUP_MASTERY_LV', {
        habitat: LocalizationManager.getHabitatName(habitatId),
        lv: nextLv,
      }),
      'beauty',
      50,
      40
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  unlockMapExpansion(habitatId: HabitatId): boolean {
    const mapState = this.state.mapStates[habitatId];
    if (!mapState) return false;

    const check = canUnlockNextMapExpansion(this.state, habitatId);
    if (!check.available) {
      this.showToast(LocalizationManager.get('TOAST_EXPANSION_LOCKED'));
      return false;
    }
    if (this.state.coins < check.cost.coins) {
      this.showToast(LocalizationManager.get('TOAST_NEED_COINS_UPGRADE'));
      return false;
    }
    if (mapState.mapTokens < check.cost.tokens) {
      this.showToast(LocalizationManager.get('TOAST_NEED_TOKENS', { count: check.cost.tokens }));
      return false;
    }

    const capAfter = check.nextTier >= 2 ? 100 : 75;
    this.state = {
      ...this.state,
      coins: this.state.coins - check.cost.coins,
      mapStates: {
        ...this.state.mapStates,
        [habitatId]: {
          ...mapState,
          mapTokens: mapState.mapTokens - check.cost.tokens,
          expansionTier: check.nextTier,
        },
      },
    };

    AudioService.playLevelUp();
    this.pushPopup(
      LocalizationManager.get('POPUP_MAP_EXPANDED', {
        habitat: LocalizationManager.getHabitatName(habitatId),
        cap: capAfter,
      }),
      'gem',
      50,
      40
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  // ==================== ACTIVE INTERACTIONS ====================

  feedFish(): boolean {
    const now = Date.now();
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    const activeTut = getActiveTutorialStep(
      this.state.tutorial,
      this.state.settings.showTutorial
    );
    const isTutorialFeed = activeTut?.stepId === 'first_feed';

    if (!isTutorialFeed && now - this.lastFeedAtMs < GAME_CONFIG.FEED_COOLDOWN_MS) return false;

    if (mapState) {
      syncManualFeedCharges(mapState, now);
      if (!isTutorialFeed && mapState.manualFeedCharges <= 0) {
        const waitSec = getNextChargeCountdownSec(mapState, now);
        this.showToast(LocalizationManager.get('TOAST_FEED_RECHARGING', { sec: waitSec }));
        return false;
      }
    }

    this.lastFeedAtMs = now;
    const bonusCoins = Math.max(
      14,
      Math.floor(calculateIncomeBreakdown(this.state, now).totalPerSecond * 4)
    );

    const milestoneBonuses = getGlobalMilestoneBonuses(this.state);
    const clonedFish = this.state.placedFish.map((f) => ({ ...f }));
    const clonedMapState = mapState ? { ...mapState } : undefined;
    const tempState: SaveGameState = {
      ...this.state,
      placedFish: clonedFish,
      mapStates: clonedMapState
        ? { ...this.state.mapStates, [habId]: clonedMapState }
        : this.state.mapStates,
    };

    const feedRes = performManualFeed(tempState, habId, milestoneBonuses.food_efficiency_pct);
    if (clonedMapState && !isTutorialFeed) {
      clonedMapState.manualFeedCharges = Math.max(0, clonedMapState.manualFeedCharges - 1);
      if (clonedMapState.manualFeedCharges === 4) {
        clonedMapState.manualFeedLastRechargeMs = now;
      }
    }

    this.state = {
      ...tempState,
      coins: this.state.coins + bonusCoins,
      totalCoinsEarned: this.state.totalCoinsEarned + bonusCoins,
      feedBoostEndsAt: now + GAME_CONFIG.FEED_BOOST_DURATION_MS,
      stats: {
        ...this.state.stats,
        timesFed: this.state.stats.timesFed + 1,
      },
    };
    this.state = incrementMissionProgress(this.state, 'feed_fish', 1);
    this.state = incrementMissionProgress(this.state, 'earn_coins', bonusCoins);

    const foodInfo = getMapFoodInfo(habId);
    this.simulation.dropFood(GAME_CONFIG.FEED_PELLETS_COUNT, foodInfo.pelletColor, false);
    AudioService.playFeed();
    this.grantXp(GAME_CONFIG.XP_REWARDS.FEED_FISH + feedRes.xpBonus);
    this.spawnFlyingCoins(4, 50, 34);
    const feedMsg = feedRes.usedEmergencyCrumbs
      ? LocalizationManager.get('POPUP_HAND_CRUMBS', {
          coins: LocalizationManager.formatNumber(bonusCoins),
        })
      : LocalizationManager.get('POPUP_FEED_BOOST', {
          food: feedRes.foodConsumed,
          coins: LocalizationManager.formatNumber(bonusCoins),
        });
    this.pushPopup(feedMsg, 'coin', 50, 30);
    this.notifyTutorialEvent('fish_fed');

    this.syncSimulation();
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  handleCanvasTap(
    worldX: number,
    worldY: number,
    pctX: number,
    pctY: number,
    worldScale = 2
  ): void {
    const activeTut = getActiveTutorialStep(
      this.state.tutorial,
      this.state.settings.showTutorial
    );

    // Interactive tutorial placement steps respond directly to tapping the glowing aquarium!
    if (activeTut?.stepId === 'place_first_fish' && this.state.tutorial.pendingFishToPlaceId) {
      this.placePendingTutorialFish(pctX / 100, pctY / 100);
      return;
    }
    if (
      activeTut?.stepId === 'place_plant' ||
      activeTut?.stepId === 'place_airstone' ||
      activeTut?.stepId === 'place_shelter'
    ) {
      this.performTutorialQuickAction();
      return;
    }

    // 1. Floating Creature Shell Coin / Pearl (>=48 CSS px hitbox)
    const tappedCoin = this.simulation.hitTestCreatureCoin(worldX, worldY, worldScale);
    if (tappedCoin) {
      this.awardCreatureCoin(tappedCoin, false);
      return;
    }

    if (activeTut?.stepId === 'inspect_aquarium') {
      this.simulation.addRipple(worldX, worldY);
      AudioService.playBubble();
      this.notifyTutorialEvent('aquarium_tapped');
      return;
    }

    // 2. Shimmering Rare Visitor (>=48 CSS px hitbox)
    const visitor = this.simulation.hitTestRareVisitor(worldX, worldY, worldScale);
    if (visitor) {
      this.collectRareVisitor(visitor.fishId, pctX, pctY);
      return;
    }

    // 3. Swimming Fish Tap (nearest fish within >=44×44 CSS px hitbox)
    const tappedFish = this.simulation.hitTestFish(worldX, worldY, worldScale);
    if (tappedFish) {
      const def = FISH_BY_ID[tappedFish.fishId];
      const tip = Math.max(3, Math.ceil((def?.baseIncome ?? 5) * 0.6));
      this.state = {
        ...this.state,
        coins: this.state.coins + tip,
        totalCoinsEarned: this.state.totalCoinsEarned + tip,
      };
      this.state = incrementMissionProgress(this.state, 'earn_coins', tip);
      AudioService.playCoin();
      this.spawnFlyingCoins(2, pctX, pctY);
      this.pushPopup(`+${formatNumber(tip)}`, 'coin', pctX, pctY - 4);
      this.emit();
      return;
    }

    // 4. Gentle water ripple
    this.simulation.addRipple(worldX, worldY);
    AudioService.playBubble();
  }

  private collectRareVisitor(fishId: string, pctX: number, pctY: number): void {
    const def = FISH_BY_ID[fishId];
    if (!def) return;

    const isNew = !this.state.discoveredFishIds.includes(fishId);
    const bonusCoins = Math.max(
      180,
      Math.floor(calculateIncomeBreakdown(this.state).totalPerSecond * 18)
    );
    const bonusGems = isNew ? 10 : 4;
    const bonusRp = isNew ? 16 : 6;

    this.state = {
      ...this.state,
      coins: this.state.coins + bonusCoins,
      totalCoinsEarned: this.state.totalCoinsEarned + bonusCoins,
      gems: this.state.gems + bonusGems,
      researchPoints: this.state.researchPoints + bonusRp,
      discoveredFishIds: isNew
        ? [...this.state.discoveredFishIds, fishId]
        : this.state.discoveredFishIds,
      discoveredDates: isNew
        ? { ...(this.state.discoveredDates ?? {}), [fishId]: Date.now() }
        : this.state.discoveredDates ?? {},
      stats: {
        ...this.state.stats,
        rareVisitorsTapped: this.state.stats.rareVisitorsTapped + 1,
      },
    };

    this.state = incrementMissionProgress(this.state, 'tap_rare_visitor', 1);
    if (isNew) {
      this.state = incrementMissionProgress(this.state, 'discover_fish', 1);
      this.advanceTutorialIfAt(6);
    }

    AudioService.playDiscovery();
    this.grantXp(GAME_CONFIG.XP_REWARDS.TAP_RARE_VISITOR);
    this.spawnFlyingCoins(6, pctX, pctY);
    this.discoveryModal = {
      fishId,
      isNewDiscovery: isNew,
      source: 'rare_visitor',
      bonusCoins,
      bonusGems,
      bonusRp,
    };

    SaveManager.save(this.state);
    this.emit();
  }

  // ==================== COLLECTION, BEAUTY & MISSIONS ====================

  claimCollectionReward(milestoneId: string): boolean {
    const milestone = COLLECTION_REWARDS.find((m) => m.id === milestoneId);
    if (!milestone) return false;
    const status = getCollectionMilestoneProgress(milestone, this.state);
    if (!status.isReady) return false;

    const r = milestone.reward;
    const nextOwned = { ...this.state.ownedDecorations };
    if (r.unlockDecorationId) {
      nextOwned[r.unlockDecorationId] = (nextOwned[r.unlockDecorationId] ?? 0) + 1;
    }

    this.state = {
      ...this.state,
      coins: this.state.coins + (r.coins ?? 0),
      totalCoinsEarned: this.state.totalCoinsEarned + (r.coins ?? 0),
      gems: this.state.gems + (r.gems ?? 0),
      researchPoints: this.state.researchPoints + (r.researchPoints ?? 0),
      ownedDecorations: nextOwned,
      claimedCollectionRewards: [...this.state.claimedCollectionRewards, milestoneId],
    };

    AudioService.playReward();
    this.spawnFlyingCoins(6, 50, 50);
    this.pushPopup(LocalizationManager.getCollectionRewardLabel(milestoneId), 'gem', 50, 42);
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  claimBeautyMilestone(scoreThreshold: number): boolean {
    const milestone = GAME_CONFIG.BEAUTY_MILESTONES.find((m) => m.score === scoreThreshold);
    if (!milestone) return false;
    if (this.state.claimedBeautyMilestones.includes(scoreThreshold)) return false;

    const beauty = calculateBeautyBreakdown(this.state);
    if (beauty.total < scoreThreshold) return false;

    this.state = {
      ...this.state,
      coins: this.state.coins + milestone.coins,
      totalCoinsEarned: this.state.totalCoinsEarned + milestone.coins,
      gems: this.state.gems + milestone.gems,
      researchPoints: this.state.researchPoints + milestone.rp,
      claimedBeautyMilestones: [...this.state.claimedBeautyMilestones, scoreThreshold],
    };

    AudioService.playReward();
    this.spawnFlyingCoins(6, 50, 48);
    this.pushPopup(
      `${LocalizationManager.getBeautyMilestoneTitle(milestone.score)}: ${LocalizationManager.getBeautyMilestoneReward(milestone.score)}`,
      'beauty',
      50,
      42
    );
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  claimMission(missionId: string): boolean {
    const active = this.state.dailyMissions.find((m) => m.missionId === missionId);
    const def = MISSION_BY_ID[missionId];
    if (!active || !def || active.claimed || active.progress < def.target) return false;

    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];

    this.state = {
      ...this.state,
      coins: this.state.coins + (def.reward.coins ?? 0),
      totalCoinsEarned: this.state.totalCoinsEarned + (def.reward.coins ?? 0),
      gems: this.state.gems + (def.reward.gems ?? 0),
      researchPoints: this.state.researchPoints + (def.reward.researchPoints ?? 0),
      mapStates: mapState
        ? {
            ...this.state.mapStates,
            [habId]: {
              ...mapState,
              mapTokens: mapState.mapTokens + (def.reward.mapTokens ?? 2),
            },
          }
        : this.state.mapStates,
      dailyMissions: this.state.dailyMissions.map((m) =>
        m.missionId === missionId ? { ...m, claimed: true } : m
      ),
    };

    AudioService.playReward();
    if (def.reward.xp) this.grantXp(def.reward.xp);
    this.spawnFlyingCoins(5, 50, 50);
    this.pushPopup(LocalizationManager.getMissionReward(def), 'coin', 50, 44);
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  // ==================== 8-MAP WORLD HABITATS ====================

  switchHabitat(habitatId: HabitatId): boolean {
    if (!this.state.unlockedHabitats.includes(habitatId)) return false;
    this.state = { ...this.state, activeHabitatId: habitatId };
    this.selectedPlacedDecorId = null;
    this.placingDecorationId = null;
    this.syncSimulation();
    AudioService.playBubble();
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  unlockHabitat(habitatId: HabitatId): boolean {
    const habitat = HABITAT_BY_ID[habitatId];
    if (!habitat) return false;
    if (this.state.unlockedHabitats.includes(habitatId)) {
      return this.switchHabitat(habitatId);
    }

    const check = canUnlockHabitat(habitat, this.state);
    if (!check.canUnlock) {
      this.showToast(
        LocalizationManager.get('TOAST_MISSING_REQS', { reasons: check.reasons.join(' · ') })
      );
      return false;
    }

    // Starter gift creature or fish when unlocking a new world map
    const mapFish = FISH_CATALOG.find((f) => f.preferredHabitat === habitatId);
    const now = Date.now();
    const bonusFish: PlacedFish[] = mapFish
      ? [
          {
            instanceId: `welcome_${mapFish.id}_${now}`,
            fishId: mapFish.id,
            habitatId,
            level: 1,
            placedAt: now,
            ageSec: Math.round(mapFish.growthTimeSec * 0.4),
            growthStage: 'juvenile',
            health: 96,
            happiness: 95,
            stressStage: 0,
            hunger: 92,
            starvationSec: 0,
            variant: 'normal',
            lastBredAt: now,
          },
        ]
      : [];

    const isNewWelcomeFish = mapFish && !this.state.discoveredFishIds.includes(mapFish.id);
    this.state = {
      ...this.state,
      coins: this.state.coins - habitat.unlockRequirement.coinCost,
      unlockedHabitats: [...this.state.unlockedHabitats, habitatId],
      activeHabitatId: habitatId,
      placedFish: [...this.state.placedFish, ...bonusFish],
      discoveredFishIds: isNewWelcomeFish
        ? [...this.state.discoveredFishIds, mapFish.id]
        : this.state.discoveredFishIds,
      discoveredDates: isNewWelcomeFish
        ? { ...(this.state.discoveredDates ?? {}), [mapFish.id]: now }
        : this.state.discoveredDates ?? {},
    };

    this.syncSimulation();
    AudioService.playLevelUp();
    this.showToast(`${LocalizationManager.getHabitatName(habitat)}!`);
    if (this.state.tutorial.tutorialCompleted) {
      this.triggerContextualHint('new_habitat_unlocked', habitat.id);
    }
    SaveManager.save(this.state);
    this.emit();
    return true;
  }

  // ==================== ADS & IAP PLACEHOLDERS ====================

  triggerIncomeBoostAd(): void {
    const grant = () => {
      const now = Date.now();
      const base = Math.max(now, this.state.adBoostEndsAt);
      this.state = {
        ...this.state,
        adBoostEndsAt: base + GAME_CONFIG.AD_BOOST_DURATION_MS,
      };
      AudioService.playReward();
      this.pushPopup(LocalizationManager.get('POPUP_BOOST_2X'), 'coin', 50, 42);
      SaveManager.save(this.state);
      this.emit();
    };

    if (this.state.adRemoved) {
      grant();
      return;
    }

    AdsService.showRewardedAd({
      placement: 'income_boost_30m',
      title: LocalizationManager.get('AD_BOOST_30M_TITLE'),
      rewardDescription: LocalizationManager.get('AD_BOOST_30M_DESC'),
      durationSeconds: 3,
      onReward: grant,
    });
  }

  triggerRareDiscoverAd(): void {
    const grant = () => {
      const undiscovered = FISH_CATALOG.filter(
        (f) => !this.state.discoveredFishIds.includes(f.id)
      );
      const pick =
        undiscovered[Math.floor(Math.random() * undiscovered.length)] ??
        FISH_CATALOG[FISH_CATALOG.length - 1];
      this.collectRareVisitor(pick.id, 50, 45);
    };

    if (this.state.adRemoved) {
      grant();
      return;
    }

    AdsService.showRewardedAd({
      placement: 'rare_discover',
      title: LocalizationManager.get('AD_RARE_FISH_TITLE'),
      rewardDescription: LocalizationManager.get('AD_RARE_FISH_DESC'),
      durationSeconds: 3,
      onReward: grant,
    });
  }

  triggerBonusCoinsAd(): void {
    const bonus = Math.max(
      400,
      Math.floor(calculateIncomeBreakdown(this.state).totalPerSecond * 180)
    );
    const grant = () => {
      this.state = {
        ...this.state,
        coins: this.state.coins + bonus,
        totalCoinsEarned: this.state.totalCoinsEarned + bonus,
      };
      this.state = incrementMissionProgress(this.state, 'earn_coins', bonus);
      AudioService.playReward();
      this.spawnFlyingCoins(7, 50, 50);
      this.pushPopup(
        LocalizationManager.get('POPUP_BONUS_COINS', {
          amount: LocalizationManager.formatNumber(bonus),
        }),
        'coin',
        50,
        44
      );
      SaveManager.save(this.state);
      this.emit();
    };

    if (this.state.adRemoved) {
      grant();
      return;
    }

    AdsService.showRewardedAd({
      placement: 'bonus_offline_coins',
      title: LocalizationManager.get('AD_BONUS_COINS_TITLE'),
      rewardDescription: LocalizationManager.get('AD_BONUS_COINS_DESC', {
        amount: LocalizationManager.formatNumber(bonus),
      }),
      durationSeconds: 3,
      onReward: grant,
    });
  }

  async purchaseIAP(productId: string): Promise<void> {
    const product = IAPService.getProducts().find((p) => p.id === productId);
    if (!product) return;
    const result = await IAPService.purchaseProduct(productId);
    if (!result.success) {
      this.showToast(result.message);
      return;
    }

    const nextOwned = { ...this.state.ownedDecorations };
    if (product.unlockDecorationId) {
      nextOwned[product.unlockDecorationId] = (nextOwned[product.unlockDecorationId] ?? 0) + 1;
    }

    this.state = {
      ...this.state,
      coins: this.state.coins + product.coinsGranted,
      totalCoinsEarned: this.state.totalCoinsEarned + product.coinsGranted,
      gems: this.state.gems + product.gemsGranted,
      adRemoved: this.state.adRemoved || Boolean(product.removesAds),
      ownedDecorations: nextOwned,
    };

    AudioService.playLevelUp();
    this.spawnFlyingCoins(8, 50, 50);
    this.showToast(result.message);
    SaveManager.save(this.state);
    this.emit();
  }

  // ==================== SETTINGS & MODALS ====================

  updateSettings(partial: Partial<SaveGameState['settings']>): void {
    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        ...partial,
      },
    };
    AudioService.setEnabled(this.state.settings.soundEnabled);
    AudioService.setAmbientEnabled(this.state.settings.ambientEnabled);
    SaveManager.save(this.state);
    this.emit();
  }

  closeLevelUpModal(): void {
    AudioService.playClick();
    this.levelUpModal = null;
    this.emit();
  }

  closeDiscoveryModal(): void {
    AudioService.playClick();
    this.discoveryModal = null;
    this.emit();
  }

  // ==================== EXPANDED DEVELOPER DEBUG PANEL ====================

  debugAddCoins(amount = 5000): void {
    this.state = {
      ...this.state,
      coins: this.state.coins + amount,
      totalCoinsEarned: this.state.totalCoinsEarned + amount,
    };
    AudioService.playCoin();
    this.spawnFlyingCoins(5, 50, 50);
    this.pushPopup(`+${formatNumber(amount)} Coins`, 'coin', 50, 44);
    SaveManager.save(this.state);
    this.emit();
  }

  debugAddGems(amount = 100): void {
    this.state = { ...this.state, gems: this.state.gems + amount };
    AudioService.playReward();
    this.pushPopup(`+${amount} Gems`, 'gem', 50, 44);
    SaveManager.save(this.state);
    this.emit();
  }

  debugAddRp(amount = 100): void {
    this.state = { ...this.state, researchPoints: this.state.researchPoints + amount };
    AudioService.playReward();
    this.pushPopup(`+${amount} RP`, 'rp', 50, 44);
    SaveManager.save(this.state);
    this.emit();
  }

  debugLevelUp(): void {
    const needed = Math.max(
      1,
      Math.floor(
        GAME_CONFIG.BASE_XP_REQUIRED *
          Math.pow(GAME_CONFIG.XP_GROWTH_FACTOR, this.state.aquariumLevel - 1)
      ) - this.state.aquariumXp
    );
    this.grantXp(needed);
    SaveManager.save(this.state);
    this.emit();
  }

  debugUnlockAllFish(): void {
    this.state = {
      ...this.state,
      discoveredFishIds: FISH_CATALOG.map((f) => f.id),
    };
    AudioService.playDiscovery();
    this.showToast(`All ${FISH_CATALOG.length} fish species discovered!`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugUnlockAllHabitats(): void {
    this.state = {
      ...this.state,
      unlockedHabitats: HABITAT_CATALOG.map((h) => h.id),
    };
    AudioService.playLevelUp();
    this.showToast(`All ${HABITAT_CATALOG.length} world maps unlocked!`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugSpawnFish(): void {
    const habId = this.state.activeHabitatId;
    const mapFish = FISH_CATALOG.filter((f) => f.preferredHabitat === habId);
    const pick = mapFish[Math.floor(Math.random() * mapFish.length)] ?? FISH_CATALOG[0];
    const now = Date.now();
    const variant = rollGeneticVariant(this.state, habId);
    const spawned: PlacedFish = {
      instanceId: `dbg_fish_${pick.id}_${now}_${Math.random().toString(36).slice(2, 5)}`,
      fishId: pick.id,
      habitatId: habId,
      level: 1,
      placedAt: now,
      ageSec: pick.growthTimeSec * 0.65,
      growthStage: 'adult',
      health: 98,
      happiness: 98,
      stressStage: 0,
      hunger: 92,
      starvationSec: 0,
      variant,
      lastBredAt: now - 60_000,
    };
    this.state = {
      ...this.state,
      placedFish: [...this.state.placedFish, spawned],
      discoveredFishIds: this.state.discoveredFishIds.includes(pick.id)
        ? this.state.discoveredFishIds
        : [...this.state.discoveredFishIds, pick.id],
    };
    this.syncSimulation();
    this.showToast(
      `Spawned ${variant !== 'normal' ? LocalizationManager.getVariantLabel(variant) + ' ' : ''}${LocalizationManager.getFishName(pick)}`
    );
    SaveManager.save(this.state);
    this.emit();
  }

  debugGrowAllFish(): void {
    const habId = this.state.activeHabitatId;
    this.state = {
      ...this.state,
      placedFish: this.state.placedFish.map((f) => {
        if (f.habitatId !== habId) return f;
        const def = FISH_BY_ID[f.fishId];
        return {
          ...f,
          ageSec: (def?.growthTimeSec ?? 90) + 10,
          growthStage: 'breeding_adult',
          health: 100,
          happiness: 100,
          stressStage: 0,
          hunger: 100,
          starvationSec: 0,
        };
      }),
    };
    this.syncSimulation();
    AudioService.playReward();
    this.showToast('All fish grown to Breeding Adult!');
    SaveManager.save(this.state);
    this.emit();
  }

  debugTriggerBreeding(): void {
    const habId = this.state.activeHabitatId;
    const activeFish = this.state.placedFish.find((f) => f.habitatId === habId);
    const fishId = activeFish?.fishId ?? 'guppy';
    const now = Date.now();
    const variant = rollGeneticVariant(this.state, habId);
    const egg: PlacedEgg = {
      eggId: `dbg_egg_${now}`,
      fishId,
      habitatId: habId,
      x: 0.25 + Math.random() * 0.5,
      y: 0.83,
      laidAt: now,
      hatchDurationSec: 8,
      variant,
    };
    this.state = {
      ...this.state,
      placedEggs: [...this.state.placedEggs, egg],
    };
    AudioService.playBubble();
    const eggFishDef = FISH_BY_ID[fishId];
    const eggFishName = eggFishDef
      ? LocalizationManager.getFishName(eggFishDef)
      : LocalizationManager.get('UI_FISH');
    this.showToast(`Laid a ${LocalizationManager.getVariantLabel(variant)} ${eggFishName} egg (hatches in 8s)!`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugSetWaterQuality(value: number): void {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return;
    this.state = {
      ...this.state,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          waterQuality: Math.max(0, Math.min(100, value)),
          algaeLevel: value < 50 ? 68 : 4,
        },
      },
    };
    this.showToast(`Water Quality set to ${value}%`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugSetOxygen(value: number): void {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return;
    this.state = {
      ...this.state,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          oxygen: Math.max(0, Math.min(100, value)),
        },
      },
    };
    this.syncSimulation();
    this.showToast(`Oxygen set to ${value}%`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugAddCreature(): void {
    const habId = this.state.activeHabitatId;
    const mapCreatures = CREATURE_CATALOG.filter((c) => c.habitatId === habId);
    const pick = mapCreatures[Math.floor(Math.random() * mapCreatures.length)] ?? CREATURE_CATALOG[0];
    const now = Date.now();
    this.state = {
      ...this.state,
      placedCreatures: [
        ...this.state.placedCreatures,
        {
          instanceId: `dbg_cr_${pick.id}_${now}`,
          creatureId: pick.id,
          habitatId: habId,
          level: 1,
          placedAt: now,
        },
      ],
      discoveredCreatureIds: this.state.discoveredCreatureIds.includes(pick.id)
        ? this.state.discoveredCreatureIds
        : [...this.state.discoveredCreatureIds, pick.id],
    };
    this.syncSimulation();
    this.showToast(
      LocalizationManager.get('POPUP_CREATURE_JOINED', {
        name: LocalizationManager.getCreatureName(pick),
      })
    );
    SaveManager.save(this.state);
    this.emit();
  }

  debugSimulateOfflineHours(hours = 2): void {
    const report = calculateOfflineEarnings(this.state, Date.now(), hours * 3600);
    if (report) {
      this.offlineReport = report;
      this.emit();
    }
  }

  debugSpawnRareVisitor(): void {
    this.simulation.spawnRareVisitorNow();
    this.showToast('A shimmering Rare Fish is swimming across the tank!');
    this.emit();
  }

  debugCompleteMission(): void {
    let completedOne = false;
    this.state = {
      ...this.state,
      dailyMissions: this.state.dailyMissions.map((m) => {
        if (!completedOne && !m.claimed) {
          const def = MISSION_BY_ID[m.missionId];
          if (def && m.progress < def.target) {
            completedOne = true;
            return { ...m, progress: def.target };
          }
        }
        return m;
      }),
    };
    this.showToast(completedOne ? 'Daily mission completed!' : 'All active missions already ready.');
    SaveManager.save(this.state);
    this.emit();
  }

  debugResetCurrentMap(): void {
    const habId = this.state.activeHabitatId;
    const freshMap = createDefaultMapState(habId);
    const defaultFish = FISH_CATALOG.find((f) => f.preferredHabitat === habId) ?? FISH_CATALOG[0];
    const now = Date.now();
    this.state = {
      ...this.state,
      mapStates: {
        ...this.state.mapStates,
        [habId]: freshMap,
      },
      placedFish: [
        ...this.state.placedFish.filter((f) => f.habitatId !== habId),
        {
          instanceId: `reset_${defaultFish.id}_${now}`,
          fishId: defaultFish.id,
          habitatId: habId,
          level: 1,
          placedAt: now,
          ageSec: 40,
          growthStage: 'adult',
          health: 96,
          happiness: 95,
          stressStage: 0,
          hunger: 95,
          starvationSec: 0,
          variant: 'normal',
          lastBredAt: now,
        },
      ],
      placedEggs: this.state.placedEggs.filter((e) => e.habitatId !== habId),
      placedCreatures: this.state.placedCreatures.filter((c) => c.habitatId !== habId),
      placedDecorations: this.state.placedDecorations.filter((d) => d.habitatId !== habId),
    };
    this.syncSimulation();
    this.showToast(`Reset ${HABITAT_BY_ID[habId].name} aquarium.`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugAddFood(amount = 500): void {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return;
    const cap = getFoodStorageCapacity(mapState.foodStorageLevel, mapState.masteryLevel);
    this.state = {
      ...this.state,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          foodStored: Math.min(cap, mapState.foodStored + amount),
        },
      },
    };
    this.showToast(`Added +${amount} Food (capped at ${formatNumber(cap)})`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugRemoveFood(amount = 500): void {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return;
    this.state = {
      ...this.state,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          foodStored: Math.max(0, mapState.foodStored - amount),
        },
      },
    };
    this.showToast(`Removed Food (now ${Math.round(Math.max(0, mapState.foodStored - amount))})`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugSetFishHunger(value: number): void {
    const habId = this.state.activeHabitatId;
    const clamped = Math.max(0, Math.min(100, value));
    this.state = {
      ...this.state,
      placedFish: this.state.placedFish.map((f) =>
        f.habitatId === habId
          ? { ...f, hunger: clamped, starvationSec: clamped === 0 ? 55 : 0 }
          : f
      ),
    };
    this.syncSimulation();
    this.showToast(`Set fish hunger to ${clamped}%`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugKillStarvingFish(): void {
    const habId = this.state.activeHabitatId;
    const target = this.state.placedFish.find((f) => f.habitatId === habId);
    if (!target) return;
    this.simulation.triggerFishDeathAnimation(target.instanceId);
    this.state = {
      ...this.state,
      placedFish: this.state.placedFish.filter((f) => f.instanceId !== target.instanceId),
      stats: {
        ...this.state.stats,
        fishDiedStarvation: (this.state.stats.fishDiedStarvation ?? 0) + 1,
      },
    };
    this.syncSimulation();
    this.showToast(`${FISH_BY_ID[target.fishId]?.name ?? 'Fish'} starved (debug).`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugUpgradeAutoFeeder(): void {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return;
    const nextLv = Math.min(MAX_AUTO_FEEDER_LEVEL, (mapState.autoFeederLevel ?? 0) + 1);
    this.state = {
      ...this.state,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          autoFeederLevel: nextLv,
          autoFeederLastRunMs: 0,
        },
      },
    };
    this.showToast(`Auto Feeder set to Lv.${nextLv}`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugUpgradeFoodStorage(): void {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return;
    const nextLv = Math.min(MAX_FOOD_STORAGE_LEVEL, (mapState.foodStorageLevel ?? 1) + 5);
    const cap = getFoodStorageCapacity(nextLv, mapState.masteryLevel);
    this.state = {
      ...this.state,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          foodStorageLevel: nextLv,
          foodStored: cap,
        },
      },
    };
    this.showToast(`Food Storage Lv.${nextLv} (${formatNumber(cap)})`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugCompleteEncyclopedia(): void {
    const now = Date.now();
    const dates: Record<string, number> = { ...(this.state.discoveredDates ?? {}) };
    for (const f of FISH_CATALOG) {
      if (!dates[f.id]) dates[f.id] = now;
    }
    for (const c of CREATURE_CATALOG) {
      if (!dates[c.id]) dates[c.id] = now;
    }
    this.state = {
      ...this.state,
      discoveredFishIds: FISH_CATALOG.map((f) => f.id),
      discoveredCreatureIds: CREATURE_CATALOG.map((c) => c.id),
      discoveredDates: dates,
    };
    AudioService.playDiscovery();
    this.showToast(
      `Encyclopedia 100%! (${FISH_CATALOG.length} Fish + ${CREATURE_CATALOG.length} Creatures)`
    );
    SaveManager.save(this.state);
    this.emit();
  }

  debugCompleteNextMilestone(): void {
    const unclaimed = MILESTONE_CATALOG.find(
      (m) => !(this.state.claimedMilestoneIds ?? []).includes(m.id)
    );
    if (!unclaimed) {
      this.showToast('All 29 Milestones already claimed!');
      return;
    }
    const r = unclaimed.reward;
    this.state = {
      ...this.state,
      coins: this.state.coins + (r.coins ?? 0),
      totalCoinsEarned: this.state.totalCoinsEarned + (r.coins ?? 0),
      gems: this.state.gems + (r.gems ?? 0),
      researchPoints: this.state.researchPoints + (r.researchPoints ?? 0),
      claimedMilestoneIds: [...(this.state.claimedMilestoneIds ?? []), unclaimed.id],
    };
    AudioService.playLevelUp();
    this.showToast(`Completed Milestone: ${unclaimed.title}`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugIncreaseMapMastery(): void {
    const habId = this.state.activeHabitatId;
    const mapState = this.state.mapStates[habId];
    if (!mapState) return;
    const nextLv = Math.min(MAX_MAP_MASTERY_LEVEL, (mapState.masteryLevel ?? 1) + 1);
    this.state = {
      ...this.state,
      mapStates: {
        ...this.state.mapStates,
        [habId]: {
          ...mapState,
          masteryLevel: nextLv,
          mapTokens: mapState.mapTokens + 15,
        },
      },
    };
    AudioService.playReward();
    this.showToast(`${HABITAT_BY_ID[habId]?.name} Mastery Lv.${nextLv} (+15 Tokens)`);
    SaveManager.save(this.state);
    this.emit();
  }

  debugResetSave(): void {
    this.state = SaveManager.reset();
    this.offlineReport = null;
    this.levelUpModal = null;
    this.discoveryModal = null;
    this.visitorRemark = null;
    this.placingDecorationId = null;
    this.selectedPlacedDecorId = null;
    this.syncSimulation();
    this.showToast('Full save reset to fresh Little Pond!');
    this.emit();
  }
}
