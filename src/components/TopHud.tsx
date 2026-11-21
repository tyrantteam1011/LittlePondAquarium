import React, { useEffect, useRef } from 'react';
import { ActivePanelId } from '../game/core/types';
import { EngineSnapshot, GameEngine } from '../game/core/GameEngine';
import { useLocalization } from '../game/localization/LocalizationManager';
import { HABITAT_BY_ID } from '../game/data/habitatCatalog';
import { ViewportMetrics } from '../game/layout/layoutConfig';
import { Settings, Volume2, VolumeX, Compass, Wrench, FlaskConical } from 'lucide-react';

interface TopHudProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
  viewport: ViewportMetrics;
  activePanel: ActivePanelId;
  onTogglePanel: (panel: ActivePanelId) => void;
  showDebug: boolean;
  onToggleDebug: () => void;
  onHeightChange?: (heightPx: number) => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  engine,
  snapshot,
  viewport,
  activePanel,
  onTogglePanel,
  showDebug,
  onToggleDebug,
  onHeightChange,
}) => {
  const { t, formatNumber, getHabitatName } = useLocalization();
  const headerRef = useRef<HTMLElement | null>(null);
  const { state, income, activeMapState } = snapshot;
  const habitat = HABITAT_BY_ID[state.activeHabitatId] ?? HABITAT_BY_ID.pond;
  const isBoosted = state.adBoostEndsAt > Date.now() || state.feedBoostEndsAt > Date.now();

  const isNarrowXs = viewport.viewportWidth <= 360;
  const isShortLandscape = viewport.isLandscape && viewport.viewportHeight <= 440;
  const isCompact = viewport.isCompactHud;

  useEffect(() => {
    const el = headerRef.current;
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

  return (
    <header
      ref={headerRef}
      className="pointer-events-none fixed top-0 left-0 right-0 z-30"
      style={{
        paddingTop: `max(${isCompact ? '6px' : '10px'}, env(safe-area-inset-top, 0px))`,
        paddingLeft: `max(${isNarrowXs ? '8px' : '12px'}, env(safe-area-inset-left, 0px))`,
        paddingRight: `max(${isNarrowXs ? '8px' : '12px'}, env(safe-area-inset-right, 0px))`,
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-1.5 sm:gap-2">
        {/* Currencies Strip: Coins, Gems & Research Points */}
        <div
          className={`pointer-events-auto glass-panel flex min-w-0 items-center rounded-xl border border-[#72c4d6]/40 ${
            isNarrowXs
              ? 'gap-1.5 px-2 py-1'
              : isShortLandscape
                ? 'gap-2.5 px-2.5 py-1'
                : 'gap-2.5 sm:gap-4 px-2.5 py-1.5 sm:px-3.5'
          }`}
        >
          {/* Coins */}
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <span
              className={`inline-block rounded-sm border border-[#734a12] bg-[#f7c948] shadow-inner shrink-0 ${
                isNarrowXs ? 'h-3 w-3' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'
              }`}
              aria-hidden="true"
            />
            <div className="min-w-0 leading-tight">
              <div
                className={`font-pixel font-bold text-[#ffe694] tabular-nums truncate ${
                  isNarrowXs ? 'text-[11px]' : 'text-xs sm:text-base'
                }`}
              >
                {formatNumber(state.coins)}
              </div>
              <div
                className={`font-medium text-[#9ecbd9] tabular-nums whitespace-nowrap ${
                  isNarrowXs ? 'text-[9px]' : 'text-[10px] sm:text-[11px]'
                }`}
              >
                +{formatNumber(income.totalPerSecond)}
                {t('UI_PER_SEC')}
                {isBoosted && (
                  <span className="ml-0.5 text-[#8ff5d4]">
                    ({state.adBoostEndsAt > Date.now() ? '2×' : '+15%'})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="h-5 w-px shrink-0 bg-[#5ba4b8]/25" aria-hidden="true" />

          {/* Gems */}
          <div className="flex shrink-0 items-center gap-1">
            <span
              className={`inline-block rotate-45 border border-[#1d5e69] bg-[#64e8f5] shrink-0 ${
                isNarrowXs ? 'h-2.5 w-2.5' : 'h-3 w-3 sm:h-3.5 sm:w-3.5'
              }`}
              aria-hidden="true"
            />
            <span
              className={`font-pixel font-bold text-[#b8f7ff] tabular-nums ${
                isNarrowXs ? 'text-[11px]' : 'text-xs sm:text-sm'
              }`}
            >
              {formatNumber(state.gems)}
            </span>
          </div>

          <div className="h-5 w-px shrink-0 bg-[#5ba4b8]/25" aria-hidden="true" />

          {/* Research Points */}
          <button
            type="button"
            onClick={() => onTogglePanel(activePanel === 'research' ? null : 'research')}
            className="flex min-h-[36px] shrink-0 items-center gap-1 text-left hover:brightness-115"
            title={t('PANEL_RESEARCH')}
          >
            <FlaskConical
              className={`text-[#a9f0c8] shrink-0 ${isNarrowXs ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}
            />
            <span
              className={`font-pixel font-bold text-[#c9ffe0] tabular-nums ${
                isNarrowXs ? 'text-[11px]' : 'text-xs sm:text-sm'
              }`}
            >
              {formatNumber(state.researchPoints)}
            </span>
            {!isCompact && (
              <span className="hidden sm:inline text-[10px] font-semibold text-[#8ed4b4]">
                {t('UI_RP')}
              </span>
            )}
          </button>
        </div>

        {/* Right: World Map Switcher & Compact Utilities */}
        <div className="pointer-events-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            data-tutorial-target="top-world-map"
            onClick={() => onTogglePanel(activePanel === 'habitats' ? null : 'habitats')}
            className={`pixel-btn glass-panel min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap ${
              isNarrowXs ? 'min-w-[44px] px-2' : 'px-2.5 sm:px-3'
            } ${
              activePanel === 'habitats'
                ? 'border-[#8df0d7] bg-[#1e5c6b]/85 text-white'
                : 'border-[#72c4d6]/40 text-[#dff6fc] hover:brightness-110'
            }`}
            aria-label={t('PANEL_HABITATS')}
            title={getHabitatName(habitat)}
          >
            <Compass className="h-4 w-4 text-[#7fe3cf] shrink-0" />
            {viewport.viewportWidth >= 350 && (
              <span
                className={`truncate ${
                  isNarrowXs
                    ? 'max-w-[44px] text-[11px]'
                    : isShortLandscape
                      ? 'max-w-[110px]'
                      : 'max-w-[92px] sm:max-w-[180px]'
                }`}
              >
                {getHabitatName(habitat)}
              </span>
            )}
            {!isCompact && (
              <span className="hidden md:inline text-[11px] font-normal text-[#96ccdb] tabular-nums">
                · {t('UI_LEVEL_SHORT')}
                {activeMapState.mapLevel}
              </span>
            )}
          </button>

          {/* On XS <=360px phones, Sound toggle lives inside Settings so header never overflows */}
          {!isNarrowXs && (
            <button
              type="button"
              onClick={() =>
                engine.updateSettings({ soundEnabled: !state.settings.soundEnabled })
              }
              className="pixel-btn glass-panel min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#72c4d6]/35 text-[#c7eaf5] hover:brightness-110"
              aria-label={t('SETTINGS_SOUND')}
              title={t('SETTINGS_SOUND')}
            >
              {state.settings.soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4 text-[#8aa4b0]" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => onTogglePanel(activePanel === 'settings' ? null : 'settings')}
            className={`pixel-btn glass-panel min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border ${
              activePanel === 'settings'
                ? 'border-[#8df0d7] bg-[#1e5c6b]/85 text-white'
                : 'border-[#72c4d6]/35 text-[#c7eaf5] hover:brightness-110'
            }`}
            aria-label={t('UI_SETTINGS')}
            title={t('UI_SETTINGS')}
          >
            <Settings className="h-4 w-4" />
          </button>

          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={onToggleDebug}
              className={`pixel-btn glass-panel min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border ${
                showDebug
                  ? 'border-[#f7c948] bg-[#4a3918]/85 text-[#ffe694]'
                  : 'border-[#72c4d6]/35 text-[#9ecbd9] hover:brightness-110'
              }`}
              aria-label={t('DEBUG_TITLE')}
              title={t('DEBUG_TITLE')}
            >
              <Wrench className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
