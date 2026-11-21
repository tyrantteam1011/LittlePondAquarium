import React, { useEffect, useRef } from 'react';
import { ActivePanelId } from '../game/core/types';
import { EngineSnapshot, GameEngine } from '../game/core/GameEngine';
import { getXpForNextLevel } from '../game/core/GameConfig';
import { useLocalization } from '../game/localization/LocalizationManager';
import { getUnclaimedCollectionRewardCount } from '../game/progression/CollectionManager';
import { getClaimableMilestonesCount } from '../game/progression/MilestoneSystem';
import { getClaimableMissionCount } from '../game/progression/MissionManager';
import { getMaxManualFeedCharges } from '../game/feeding/FeedingSystem';
import { ViewportMetrics } from '../game/layout/layoutConfig';
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
  viewport: ViewportMetrics;
  activePanel: ActivePanelId;
  onTogglePanel: (panel: ActivePanelId) => void;
  onHeightChange?: (heightPx: number) => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  engine,
  snapshot,
  viewport,
  activePanel,
  onTogglePanel,
  onHeightChange,
}) => {
  const { t, formatNumber, formatPercent } = useLocalization();
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  const isNarrowXs = viewport.viewportWidth <= 360;
  const isShortLandscape = viewport.isLandscape && viewport.viewportHeight <= 440;
  const isCompact = viewport.isCompactHud;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onHeightChange) return;
    const report = () => {
      onHeightChange(Math.ceil(el.getBoundingClientRect().height));
    };
    report();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(report);
      ro.observe(el);
      return () => ro.disconnect();
    }
    return undefined;
  }, [onHeightChange, isCompact, isNarrowXs, isShortLandscape]);

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
    <div
      ref={containerRef}
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-30"
      style={{
        paddingBottom: `max(${isShortLandscape ? '4px' : '8px'}, env(safe-area-inset-bottom, 0px))`,
        paddingLeft: `max(${isNarrowXs ? '6px' : '10px'}, env(safe-area-inset-left, 0px))`,
        paddingRight: `max(${isNarrowXs ? '6px' : '10px'}, env(safe-area-inset-right, 0px))`,
      }}
    >
      <div className={`mx-auto ${isShortLandscape ? 'max-w-4xl' : 'max-w-2xl'}`}>
        {/* Compact Ecosystem Health & Feed Row */}
        <div
          className={`flex items-end justify-between gap-1.5 sm:gap-2 ${
            isShortLandscape ? 'mb-1' : 'mb-1.5'
          }`}
        >
          <button
            type="button"
            onClick={() => onTogglePanel(activePanel === 'decor' ? null : 'decor')}
            className={`pointer-events-auto glass-panel flex min-w-0 items-center rounded-xl border border-[#72c4d6]/35 text-left hover:brightness-110 ${
              isShortLandscape
                ? 'min-h-[38px] px-2.5 py-1'
                : isNarrowXs
                  ? 'min-h-[44px] px-2 py-1'
                  : 'min-h-[44px] px-3 py-1.5'
            }`}
            title={t('PANEL_DECOR')}
          >
            <div className="min-w-0">
              <div
                className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-semibold text-[#e4f7fc] ${
                  isNarrowXs ? 'text-[10px]' : 'text-[11px] sm:text-xs'
                }`}
              >
                <span className="font-pixel text-[#9be7ff] tabular-nums whitespace-nowrap">
                  {t('UI_LEVEL_SHORT')}
                  {state.aquariumLevel}
                </span>
                <span aria-hidden="true" className="text-[#5d96a8]">
                  ·
                </span>
                <span className="tabular-nums text-[#ffe394] whitespace-nowrap">
                  {isNarrowXs ? `${beauty.total}` : `${t('UI_BEAUTY')} ${beauty.total}`}
                </span>
                <span aria-hidden="true" className="text-[#5d96a8]">
                  ·
                </span>
                <span className={`inline-flex items-center gap-0.5 tabular-nums ${waterColor}`}>
                  <Droplets className="h-3 w-3 shrink-0" />
                  {formatPercent(ecosystem.waterQuality)}
                </span>
                <span className={`inline-flex items-center gap-0.5 tabular-nums ${oxygenColor}`}>
                  <Wind className="h-3 w-3 shrink-0" />
                  {formatPercent(ecosystem.oxygen)}
                </span>
                {!isShortLandscape && (
                  <span className="hidden sm:inline tabular-nums text-[#a5d2e0] whitespace-nowrap">
                    · {activeHabitatFishCount}/{maxCapacity} {t('UI_FISH')}
                  </span>
                )}
              </div>
              {!isShortLandscape && (
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className={`h-1.5 overflow-hidden rounded-full bg-[#173c52] ${
                      isNarrowXs ? 'w-16' : 'w-24 sm:w-44'
                    }`}
                  >
                    <div
                      className="h-full bg-[#5bd4c0] transition-all duration-300"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#96c4d4] tabular-nums whitespace-nowrap">
                    {isNarrowXs
                      ? `${ecosystem.spaceUsed}/${ecosystem.spaceMax}`
                      : `${t('UI_SPACE')} ${ecosystem.spaceUsed}/${ecosystem.spaceMax}`}
                  </span>
                </div>
              )}
            </div>
          </button>

          {/* Right Action Cluster: Local Food Supply / Auto Feeder & Active Feed Button */}
          <div className="pointer-events-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => onTogglePanel(activePanel === 'feeding' ? null : 'feeding')}
              className={`glass-panel relative min-h-[44px] flex items-center gap-1 rounded-xl border font-bold tabular-nums whitespace-nowrap hover:brightness-110 ${
                isNarrowXs ? 'px-2 text-[11px]' : 'px-2.5 text-xs'
              } ${
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
              className={`pixel-btn min-h-[44px] flex shrink-0 items-center gap-1 rounded-xl border-2 font-bold whitespace-nowrap ${
                isNarrowXs ? 'px-2 text-[11px]' : 'px-3 sm:px-3.5 text-xs sm:text-sm'
              } ${
                feedReady
                  ? 'border-[#ffe28a] bg-[#d98c2b] text-[#fffdf5] hover:bg-[#e89b38]'
                  : 'border-[#548394]/40 bg-[#143447]/80 text-[#96bcc9] cursor-default backdrop-blur-sm'
              }`}
            >
              {feedBoostSec > 0 ? (
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#ffe394] shrink-0" />
              ) : (
                <Utensils className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              )}
              <span>
                {feedReady
                  ? isNarrowXs
                    ? `${activeMapState.manualFeedCharges}/${maxCharges}`
                    : `${t('UI_FEED')} ${activeMapState.manualFeedCharges}/${maxCharges}`
                  : feedBoostSec > 0
                    ? `+15% (${t('UI_SEC_SHORT', { sec: feedBoostSec })})`
                    : !hasCharges
                      ? `0/${maxCharges}`
                      : t('UI_SEC_SHORT', { sec: Math.ceil(feedCooldownRemainingMs / 1000) })}
              </span>
            </button>
          </div>
        </div>

        {/* Thumb-Friendly 6-Tab Primary Navigation */}
        <nav
          aria-label={t('ARIA_AQUARIUM_CONTROLS')}
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
                className={`relative min-w-0 flex items-center justify-center rounded-xl transition-colors ${
                  isShortLandscape
                    ? 'min-h-[44px] flex-row gap-1.5 px-1.5 py-1'
                    : 'min-h-[46px] flex-col px-0.5 py-1'
                } ${
                  isActive
                    ? 'bg-[#1e5c6b]/90 text-white'
                    : 'text-[#a8d4e3] hover:bg-[#163f54]/70 hover:text-white'
                }`}
              >
                <Icon
                  className={`shrink-0 ${
                    isShortLandscape ? 'h-4 w-4' : 'h-4 w-4 sm:h-5 sm:w-5'
                  } ${isActive ? 'text-[#8df5da]' : ''}`}
                />
                <span
                  className={`max-w-full truncate font-semibold tracking-tight whitespace-nowrap ${
                    isShortLandscape
                      ? 'text-[11px]'
                      : isNarrowXs
                        ? 'mt-0.5 px-0.5 text-[9.5px]'
                        : 'mt-0.5 px-0.5 text-[10px] sm:text-[11px]'
                  }`}
                >
                  {item.label}
                </span>
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e86a58] px-1 text-[10px] font-bold text-white tabular-nums">
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
