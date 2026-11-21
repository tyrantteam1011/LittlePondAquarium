import React from 'react';
import { ActivePanelId } from '../game/core/types';
import { EngineSnapshot, GameEngine } from '../game/core/GameEngine';
import { useLocalization } from '../game/localization/LocalizationManager';
import { HABITAT_BY_ID } from '../game/data/habitatCatalog';
import { Settings, Volume2, VolumeX, Compass, Wrench, FlaskConical } from 'lucide-react';

interface TopHudProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
  activePanel: ActivePanelId;
  onTogglePanel: (panel: ActivePanelId) => void;
  showDebug: boolean;
  onToggleDebug: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  engine,
  snapshot,
  activePanel,
  onTogglePanel,
  showDebug,
  onToggleDebug,
}) => {
  const { t, formatNumber, getHabitatName } = useLocalization();
  const { state, income, activeMapState } = snapshot;
  const habitat = HABITAT_BY_ID[state.activeHabitatId] ?? HABITAT_BY_ID.pond;
  const isBoosted = state.adBoostEndsAt > Date.now() || state.feedBoostEndsAt > Date.now();

  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-30 px-2.5 pt-2 sm:px-5 sm:pt-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        {/* Currencies Strip: Coins, Gems & Research Points */}
        <div className="pointer-events-auto glass-panel flex items-center gap-2.5 sm:gap-4 rounded-xl border border-[#72c4d6]/40 px-2.5 py-1.5 sm:px-3.5">
          {/* Coins */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className="inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-sm border border-[#734a12] bg-[#f7c948] shadow-inner shrink-0"
              aria-hidden="true"
            />
            <div className="leading-tight">
              <div className="font-pixel text-xs sm:text-base font-bold text-[#ffe694] tabular-nums">
                {formatNumber(state.coins)}
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-[#9ecbd9] tabular-nums whitespace-nowrap">
                +{formatNumber(income.totalPerSecond)}/s
                {isBoosted && (
                  <span className="ml-1 text-[#8ff5d4]">
                    ({state.adBoostEndsAt > Date.now() ? '2×' : '+15%'})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-[#5ba4b8]/25" aria-hidden="true" />

          {/* Gems */}
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 sm:h-3.5 sm:w-3.5 rotate-45 border border-[#1d5e69] bg-[#64e8f5] shrink-0"
              aria-hidden="true"
            />
            <span className="font-pixel text-xs sm:text-sm font-bold text-[#b8f7ff] tabular-nums">
              {formatNumber(state.gems)}
            </span>
          </div>

          <div className="h-6 w-px bg-[#5ba4b8]/25" aria-hidden="true" />

          {/* Research Points */}
          <button
            type="button"
            onClick={() => onTogglePanel(activePanel === 'research' ? null : 'research')}
            className="flex items-center gap-1 text-left hover:brightness-115"
            title={t('PANEL_RESEARCH')}
          >
            <FlaskConical className="h-3.5 w-3.5 text-[#a9f0c8] shrink-0" />
            <span className="font-pixel text-xs sm:text-sm font-bold text-[#c9ffe0] tabular-nums">
              {formatNumber(state.researchPoints)}
            </span>
            <span className="hidden sm:inline text-[10px] font-semibold text-[#8ed4b4]">
              {t('UI_RP')}
            </span>
          </button>
        </div>

        {/* Right: World Map Switcher & Compact Utilities */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            data-tutorial-target="top-world-map"
            onClick={() => onTogglePanel(activePanel === 'habitats' ? null : 'habitats')}
            className={`pixel-btn glass-panel min-h-[42px] flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs sm:text-sm font-semibold whitespace-nowrap ${
              activePanel === 'habitats'
                ? 'border-[#8df0d7] bg-[#1e5c6b]/85 text-white'
                : 'border-[#72c4d6]/40 text-[#dff6fc] hover:brightness-110'
            }`}
            aria-label={t('PANEL_HABITATS')}
          >
            <Compass className="h-4 w-4 text-[#7fe3cf] shrink-0" />
            <span className="max-w-[96px] sm:max-w-none truncate">{getHabitatName(habitat)}</span>
            <span className="hidden md:inline text-[11px] font-normal text-[#96ccdb] tabular-nums">
              · {t('UI_LEVEL_SHORT')}{activeMapState.mapLevel}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              engine.updateSettings({ soundEnabled: !state.settings.soundEnabled })
            }
            className="pixel-btn glass-panel min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border border-[#72c4d6]/35 text-[#c7eaf5] hover:brightness-110"
            aria-label={t('SETTINGS_SOUND')}
            title={t('SETTINGS_SOUND')}
          >
            {state.settings.soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4 text-[#8aa4b0]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTogglePanel(activePanel === 'settings' ? null : 'settings')}
            className={`pixel-btn glass-panel min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border ${
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
              className={`pixel-btn glass-panel min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border ${
                showDebug
                  ? 'border-[#f7c948] bg-[#4a3918]/85 text-[#ffe694]'
                  : 'border-[#72c4d6]/35 text-[#9ecbd9] hover:brightness-110'
              }`}
              aria-label="Developer Debug Tools"
              title="Developer Debug Tools"
            >
              <Wrench className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
