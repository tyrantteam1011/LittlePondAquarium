import React from 'react';
import { ActivePanelId } from '../game/core/types';
import { EngineSnapshot, GameEngine } from '../game/core/GameEngine';
import { getXpForNextLevel } from '../game/core/GameConfig';
import { useLocalization } from '../game/localization/LocalizationManager';
import { getUnclaimedCollectionRewardCount } from '../game/progression/CollectionManager';
import { getClaimableMilestonesCount } from '../game/progression/MilestoneSystem';
import { getClaimableMissionCount } from '../game/progression/MissionManager';
import { getMaxManualFeedCharges } from '../game/feeding/FeedingSystem';
import {
  Fish,
  Sprout,
  FlaskConical,
  BookOpen,
  ArrowUpCircle,
  Gift,
  Sparkles,
  Utensils,
  Droplets,
  Wind,
  Bot,
  Package,
} from 'lucide-react';

interface BottomBarProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
  activePanel: ActivePanelId;
  onTogglePanel: (panel: ActivePanelId) => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  engine,
  snapshot,
  activePanel,
  onTogglePanel,
}) => {
  const { t, formatNumber, formatPercent } = useLocalization();
  const {
    state,
    beauty,
    ecosystem,
    activeMapState,
    feedCooldownRemainingMs,
    activeHabitatFishCount,
    maxCapacity,
  } = snapshot;
  const xpNeeded = getXpForNextLevel(state.aquariumLevel);
  const xpPct = Math.min(100, Math.round((state.aquariumXp / xpNeeded) * 100));

  const unclaimedCollection =
    getUnclaimedCollectionRewardCount(state) + getClaimableMilestonesCount(state);
  const unclaimedMissions = getClaimableMissionCount(state);
  const maxCharges = getMaxManualFeedCharges(activeMapState);
  const hasCharges = activeMapState.manualFeedCharges > 0;
  const feedReady = feedCooldownRemainingMs <= 0 && hasCharges;
  const feedBoostSec = Math.max(0, Math.ceil((state.feedBoostEndsAt - Date.now()) / 1000));
  const hasHungerAlert =
    ecosystem.starvingFishCount > 0 || ecosystem.criticalFishCount > 0 || ecosystem.avgHunger < 50;

  const waterColor =
    ecosystem.waterQuality >= 80
      ? 'text-[#8df5da]'
      : ecosystem.waterQuality >= 60
        ? 'text-[#ffe494]'
        : 'text-[#ff9b9b]';

  const oxygenColor =
    ecosystem.oxygen >= 75
      ? 'text-[#9be7ff]'
      : ecosystem.oxygen >= 55
        ? 'text-[#ffe494]'
        : 'text-[#ff9b9b]';

  const navItems: {
    id: ActivePanelId;
    label: string;
    icon: React.FC<{ className?: string }>;
    badgeCount?: number;
    tutorialTarget?: string;
  }[] = [
    { id: 'fish', label: t('UI_FISH'), icon: Fish, tutorialTarget: 'nav-fish' },
    { id: 'decor', label: t('UI_DECOR'), icon: Sprout, tutorialTarget: 'nav-decor' },
    { id: 'research', label: t('UI_LAB'), icon: FlaskConical, tutorialTarget: 'nav-research' },
    { id: 'collection', label: t('UI_JOURNAL'), icon: BookOpen, badgeCount: unclaimedCollection },
    { id: 'upgrades', label: t('UI_UPGRADES'), icon: ArrowUpCircle, tutorialTarget: 'nav-upgrades' },
    { id: 'missions', label: t('UI_QUESTS'), icon: Gift, badgeCount: unclaimedMissions },
  ];

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 px-2 pb-2 sm:px-5 sm:pb-3">
      <div className="mx-auto max-w-2xl">
        {/* Compact Ecosystem Health & Feed Row */}
        <div className="mb-1.5 flex items-end justify-between gap-2">
          <button
            type="button"
            onClick={() => onTogglePanel(activePanel === 'decor' ? null : 'decor')}
            className="pointer-events-auto glass-panel flex min-w-0 items-center gap-3 rounded-xl border border-[#72c4d6]/35 px-3 py-1.5 text-left hover:brightness-110"
            title={t('PANEL_DECOR')}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs font-semibold text-[#e4f7fc]">
                <span className="font-pixel text-[#9be7ff] tabular-nums">
                  {t('UI_LEVEL_SHORT')}{state.aquariumLevel}
                </span>
                <span aria-hidden="true" className="text-[#5d96a8]">·</span>
                <span className="tabular-nums text-[#ffe394] whitespace-nowrap">
                  {t('UI_BEAUTY')} {beauty.total}
                </span>
                <span aria-hidden="true" className="text-[#5d96a8]">·</span>
                <span className={`inline-flex items-center gap-0.5 tabular-nums ${waterColor}`}>
                  <Droplets className="h-3 w-3 shrink-0" />
                  {formatPercent(ecosystem.waterQuality)}
                </span>
                <span className={`inline-flex items-center gap-0.5 tabular-nums ${oxygenColor}`}>
                  <Wind className="h-3 w-3 shrink-0" />
                  {formatPercent(ecosystem.oxygen)}
                </span>
                <span className="hidden sm:inline tabular-nums text-[#a5d2e0] whitespace-nowrap">
                  · {activeHabitatFishCount}/{maxCapacity} {t('UI_FISH')}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 w-28 sm:w-44 overflow-hidden rounded-full bg-[#173c52]">
                  <div
                    className="h-full bg-[#5bd4c0] transition-all duration-300"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#96c4d4] tabular-nums whitespace-nowrap">
                  {t('UI_SPACE')} {ecosystem.spaceUsed}/{ecosystem.spaceMax}
                </span>
              </div>
            </div>
          </button>

          {/* Right Action Cluster: Local Food Supply / Auto Feeder & Active Feed Button */}
          <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTogglePanel(activePanel === 'feeding' ? null : 'feeding')}
              className={`glass-panel relative min-h-[44px] flex items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold tabular-nums whitespace-nowrap hover:brightness-110 ${
                activePanel === 'feeding'
                  ? 'border-[#8df5da] bg-[#1a5263]/90 text-white'
                  : hasHungerAlert
                    ? 'border-[#ff9b9b]/70 bg-[#471f27]/85 text-[#ffd4d4]'
                    : 'border-[#72c4d6]/40 text-[#d8f3fc]'
              }`}
              title={t('PANEL_FEEDING')}
            >
              {ecosystem.autoFeederActive ? (
                <Bot className="h-3.5 w-3.5 text-[#8df5da] shrink-0" />
              ) : (
                <Package className="h-3.5 w-3.5 text-[#ffe394] shrink-0" />
              )}
              <span>{formatNumber(Math.round(ecosystem.foodStored))}</span>
              {hasHungerAlert && (
                <span className="h-2 w-2 rounded-full bg-[#ff6b6b] animate-pulse" />
              )}
            </button>

            <button
              type="button"
              data-tutorial-target="nav-feed"
              onClick={() => engine.feedFish()}
              disabled={!feedReady}
              className={`pixel-btn min-h-[44px] flex shrink-0 items-center gap-1.5 rounded-xl border-2 px-3 sm:px-3.5 text-xs sm:text-sm font-bold whitespace-nowrap ${
                feedReady
                  ? 'border-[#ffe28a] bg-[#d98c2b] text-[#fffdf5] hover:bg-[#e89b38]'
                  : 'border-[#548394]/40 bg-[#143447]/80 text-[#96bcc9] cursor-default backdrop-blur-sm'
              }`}
            >
              {feedBoostSec > 0 ? (
                <Sparkles className="h-4 w-4 text-[#ffe394] shrink-0" />
              ) : (
                <Utensils className="h-4 w-4 shrink-0" />
              )}
              <span>
                {feedReady
                  ? `${t('UI_FEED')} ${activeMapState.manualFeedCharges}/${maxCharges}`
                  : feedBoostSec > 0
                    ? `+15% (${feedBoostSec}s)`
                    : !hasCharges
                      ? `0/${maxCharges}`
                      : `${Math.ceil(feedCooldownRemainingMs / 1000)}s`}
              </span>
            </button>
          </div>
        </div>

        {/* Thumb-Friendly 6-Tab Primary Navigation */}
        <nav
          aria-label="Aquarium controls"
          className="pointer-events-auto glass-panel grid grid-cols-6 gap-1 rounded-2xl border border-[#72c4d6]/40 p-1"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-tutorial-target={item.tutorialTarget}
                onClick={() => onTogglePanel(isActive ? null : item.id)}
                className={`relative min-h-[48px] min-w-0 flex flex-col items-center justify-center rounded-xl px-0.5 py-1 transition-colors ${
                  isActive
                    ? 'bg-[#1e5c6b]/90 text-white'
                    : 'text-[#a8d4e3] hover:bg-[#163f54]/70 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${isActive ? 'text-[#8df5da]' : ''}`} />
                <span className="mt-0.5 max-w-full truncate px-0.5 text-[10px] sm:text-[11px] font-semibold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="absolute top-1 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e86a58] px-1 text-[10px] font-bold text-white tabular-nums">
                    {item.badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
