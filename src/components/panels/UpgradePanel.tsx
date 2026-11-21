import React, { useState } from 'react';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { LOCAL_UPGRADE_CATALOG, UPGRADE_CATALOG } from '../../game/data/upgradeCatalog';
import { HABITAT_BY_ID } from '../../game/data/habitatCatalog';
import {
  formatUpgradeValue,
  getLocalUpgradeCost,
  getLocalUpgradeValue,
  getUpgradeCost,
} from '../../game/economy/UpgradeSystem';
import { useLocalization } from '../../game/localization/LocalizationManager';

interface UpgradePanelProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export const UpgradePanel: React.FC<UpgradePanelProps> = ({ engine, snapshot }) => {
  const [scope, setScope] = useState<'local' | 'global'>('local');
  const { t, formatNumber, getHabitatName } = useLocalization();
  const { state, activeMapState } = snapshot;
  const activeHabitat = HABITAT_BY_ID[state.activeHabitatId] ?? HABITAT_BY_ID.pond;
  const activeHabitatLabel = getHabitatName(activeHabitat);

  return (
    <div className="space-y-3">
      {/* Scope Switch: Local Map Upgrades vs Global Upgrades */}
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#091c29]/75 p-1">
        <button
          type="button"
          onClick={() => setScope('local')}
          className={`min-h-[38px] rounded-lg px-2 text-xs font-semibold transition-colors truncate ${
            scope === 'local' ? 'bg-[#1e5c6b] text-white' : 'text-[#9ecbd9] hover:text-white'
          }`}
        >
          {t('UI_LOCAL_TAB', { name: activeHabitatLabel })}
        </button>
        <button
          type="button"
          onClick={() => setScope('global')}
          className={`min-h-[38px] rounded-lg px-2 text-xs font-semibold transition-colors truncate ${
            scope === 'global' ? 'bg-[#1e5c6b] text-white' : 'text-[#9ecbd9] hover:text-white'
          }`}
        >
          {t('UI_GLOBAL_TAB')}
        </button>
      </div>

      {scope === 'local' && (
        <div className="space-y-2.5">
          <div className="rounded-xl border border-[#72c4d6]/30 bg-[#0d2a3b]/65 px-3 py-2 text-xs text-[#bde3ef]">
            <span className="font-bold text-[#8df5da]">{activeHabitatLabel}</span> — {t('UI_CAPACITY')} 10 → 50
          </div>

          {LOCAL_UPGRADE_CATALOG.map((u) => {
            const level = activeMapState.localUpgrades[u.id] ?? 0;
            const isMax = level >= u.maxLevel;
            const cost = getLocalUpgradeCost(u.id, level, state.activeHabitatId);
            const canAfford = !isMax && state.coins >= cost;
            const currentVal = getLocalUpgradeValue(u.id, level);
            const nextVal = getLocalUpgradeValue(u.id, Math.min(u.maxLevel, level + 1));

            return (
              <div
                key={u.id}
                className="rounded-xl border border-[#5ba6ba]/30 bg-[#103044]/68 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-white">{u.name}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-[#8df5da] tabular-nums">
                        {t('UI_LEVEL_SHORT')}{level}/{u.maxLevel}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#94c2d1]">
                      {u.description}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[#ffe394] tabular-nums">
                    {currentVal} {u.unit}
                    {!isMax && <span className="text-[#8df5da]"> → {nextVal}</span>}
                  </div>

                  <button
                    type="button"
                    data-tutorial-target={u.id === 'species_capacity' ? 'upgrade-capacity' : undefined}
                    onClick={() => engine.buyLocalUpgrade(u.id)}
                    disabled={!canAfford}
                    className={`pixel-btn min-h-[38px] rounded-lg px-3.5 text-xs font-bold tabular-nums whitespace-nowrap ${
                      isMax
                        ? 'bg-[#1d4d46] text-[#9effdf] cursor-default'
                        : canAfford
                          ? 'bg-[#2d8c7c] text-white hover:bg-[#37a391]'
                          : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                    }`}
                  >
                    {isMax ? t('UI_MAXED') : `${formatNumber(cost)} ${t('UI_COINS')}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {scope === 'global' && (
        <div className="space-y-2.5">
          {UPGRADE_CATALOG.map((u) => {
            const level = state.upgradeLevels[u.id] ?? 0;
            const isMax = level >= u.maxLevel;
            const cost = getUpgradeCost(u.id, level);
            const canAfford = !isMax && state.coins >= cost;

            return (
              <div
                key={u.id}
                className="rounded-xl border border-[#5ba6ba]/30 bg-[#103044]/68 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-white">{u.name}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-[#9be7ff] tabular-nums">
                        {t('UI_LEVEL_SHORT')}{level}/{u.maxLevel}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#94c2d1]">
                      {u.description}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[#ffe394] tabular-nums">
                    {formatUpgradeValue(u, level)} {u.unit}
                    {!isMax && (
                      <span className="text-[#8df5da]">
                        {' '}
                        → {formatUpgradeValue(u, level + 1)}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => engine.buyUpgrade(u.id)}
                    disabled={!canAfford}
                    className={`pixel-btn min-h-[38px] rounded-lg px-3.5 text-xs font-bold tabular-nums whitespace-nowrap ${
                      isMax
                        ? 'bg-[#1d4d46] text-[#9effdf] cursor-default'
                        : canAfford
                          ? 'bg-[#2d8c7c] text-white hover:bg-[#37a391]'
                          : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                    }`}
                  >
                    {isMax ? t('UI_MAXED') : `${formatNumber(cost)} ${t('UI_COINS')}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
