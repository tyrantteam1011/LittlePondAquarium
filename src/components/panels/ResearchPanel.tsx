import React, { useState } from 'react';
import { ResearchCategory } from '../../game/core/types';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { RESEARCH_BY_ID, RESEARCH_CATALOG } from '../../game/data/researchCatalog';
import { SPECIALIST_CATALOG } from '../../game/data/specialistCatalog';
import { CONSERVATION_CATALOG } from '../../game/data/conservationCatalog';
import { HABITAT_BY_ID } from '../../game/data/habitatCatalog';
import { GAME_CONFIG } from '../../game/core/GameConfig';
import { useLocalization } from '../../game/localization/LocalizationManager';
import { FlaskConical, Users, Globe2, Lock, Check } from 'lucide-react';

interface ResearchPanelProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

// Water Science appears first so Bio-Media Filtration Lv.1 is immediately spotlighted in the tutorial.
const RESEARCH_CATEGORIES: ResearchCategory[] = [
  'Water Science',
  'Automation',
  'Biology',
  'Aquaculture',
  'Decoration',
  'Exploration',
];

export const ResearchPanel: React.FC<ResearchPanelProps> = ({ engine, snapshot }) => {
  const [subTab, setSubTab] = useState<'research' | 'specialists' | 'conservation'>('research');
  const { t, formatNumber, getHabitatName, getRarityLabel } = useLocalization();
  const { state, activeMapState } = snapshot;
  const activeHabitat = HABITAT_BY_ID[state.activeHabitatId] ?? HABITAT_BY_ID.pond;
  const activeHabitatLabel = getHabitatName(activeHabitat);

  return (
    <div className="space-y-3">
      {/* RP Balance Banner */}
      <div className="flex items-center justify-between rounded-xl border border-[#7adbc4]/35 bg-[#0d2d3b]/70 px-3 py-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-[#a9f0c8]" />
          <span className="text-xs font-semibold text-[#c9ffe0]">{t('UI_RESEARCH_TAB')}</span>
        </div>
        <span className="font-pixel text-sm font-bold text-[#c9ffe0] tabular-nums">
          {formatNumber(state.researchPoints)} {t('UI_RP')}
        </span>
      </div>

      {/* 3 Sub-Tabs: Research Center / Specialists / Ocean Conservation */}
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#091c29]/75 p-1">
        <button
          type="button"
          onClick={() => setSubTab('research')}
          className={`min-h-[38px] flex items-center justify-center gap-1 rounded-lg px-1.5 text-xs font-semibold truncate ${
            subTab === 'research' ? 'bg-[#1e5c6b] text-white' : 'text-[#9ecbd9] hover:text-white'
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{t('UI_RESEARCH_TAB')}</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('specialists')}
          className={`min-h-[38px] flex items-center justify-center gap-1 rounded-lg px-1.5 text-xs font-semibold truncate ${
            subTab === 'specialists'
              ? 'bg-[#1e5c6b] text-white'
              : 'text-[#9ecbd9] hover:text-white'
          }`}
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{t('UI_STAFF_TAB')}</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('conservation')}
          className={`min-h-[38px] flex items-center justify-center gap-1 rounded-lg px-1.5 text-xs font-semibold truncate ${
            subTab === 'conservation'
              ? 'bg-[#1e5c6b] text-white'
              : 'text-[#9ecbd9] hover:text-white'
          }`}
        >
          <Globe2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{t('UI_OCEAN_TAB')}</span>
        </button>
      </div>

      {/* TAB 1: AQUARIUM RESEARCH CENTER */}
      {subTab === 'research' && (
        <div className="space-y-4">
          {RESEARCH_CATEGORIES.map((category) => {
            const nodes = RESEARCH_CATALOG.filter((n) => n.category === category);
            return (
              <div key={category} className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#8df5da]">
                  {category}
                </div>
                {nodes.map((node) => {
                  const lv = state.researchLevels[node.id] ?? 0;
                  const isMax = lv >= node.maxLevel;
                  const reqMet =
                    !node.requiresId || (state.researchLevels[node.requiresId] ?? 0) > 0;
                  const cost = Math.round(node.rpCost * Math.pow(1.45, lv));
                  const canAfford = !isMax && reqMet && state.researchPoints >= cost;

                  return (
                    <div
                      key={node.id}
                      className={`rounded-xl border p-3 ${
                        reqMet
                          ? 'border-[#5ba6ba]/30 bg-[#103044]/68'
                          : 'border-[#3c6575]/20 bg-[#0a212e]/55 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold text-white">{node.name}</span>
                            <span className="shrink-0 text-[11px] font-semibold text-[#a9f0c8] tabular-nums">
                              {t('UI_LEVEL_SHORT')}{lv}/{node.maxLevel}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-[#94c2d1]">
                            {node.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#ffe394] tabular-nums">
                          {lv > 0
                            ? `+${lv * node.effectPerLevel} ${node.effectUnit}`
                            : `+${node.effectPerLevel} ${node.effectUnit}`}
                        </span>

                        {!reqMet ? (
                          <span className="flex items-center gap-1 text-[11px] text-[#8db6c4]">
                            <Lock className="h-3 w-3 shrink-0" />
                            <span className="truncate">{RESEARCH_BY_ID[node.requiresId!]?.name}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            data-tutorial-target={node.id === 'water_filtration' ? 'research-water' : undefined}
                            onClick={() => engine.buyResearch(node.id)}
                            disabled={!canAfford}
                            className={`pixel-btn min-h-[36px] rounded-lg px-3.5 text-xs font-bold tabular-nums whitespace-nowrap ${
                              isMax
                                ? 'bg-[#1d4d46] text-[#9effdf] cursor-default'
                                : canAfford
                                  ? 'bg-[#2b8779] text-white hover:bg-[#35a190]'
                                  : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                            }`}
                          >
                            {isMax ? t('UI_DONE') : `${formatNumber(cost)} ${t('UI_RP')}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: COLLECTIBLE AQUARIUM SPECIALISTS */}
      {subTab === 'specialists' && (
        <div className="space-y-2.5">
          <div className="rounded-xl border border-[#72c4d6]/30 bg-[#0d2a3b]/65 px-3 py-2 text-xs text-[#bde3ef]">
            <strong className="text-[#8df5da]">{activeHabitatLabel}</strong> (
            {activeMapState.assignedSpecialistIds.length}/{GAME_CONFIG.MAX_SPECIALISTS_PER_MAP})
          </div>

          {SPECIALIST_CATALOG.map((spec) => {
            const lv = state.unlockedSpecialists[spec.id] ?? 0;
            const isUnlocked = lv > 0;
            const isMax = lv >= spec.maxLevel;
            const isAssigned = activeMapState.assignedSpecialistIds.includes(spec.id);
            const cost =
              lv === 0 ? spec.unlockRpCost : Math.round(spec.upgradeRpBase * Math.pow(1.4, lv - 1));
            const canAfford = !isMax && state.researchPoints >= cost;
            const currentBonus =
              lv === 0 ? spec.baseBonusPct : spec.baseBonusPct + (lv - 1) * spec.bonusPerLevelPct;

            return (
              <div
                key={spec.id}
                className={`rounded-xl border p-3 ${
                  isAssigned
                    ? 'border-[#8df5da]/55 bg-[#123c4d]/75'
                    : 'border-[#5ba6ba]/30 bg-[#103044]/68'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 font-pixel text-sm font-bold text-white"
                    style={{
                      backgroundColor: spec.avatarColor,
                      borderColor: spec.accentColor,
                    }}
                  >
                    {spec.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-white">{spec.name}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-[#9be7ff]">
                        {isUnlocked ? `${t('UI_LEVEL_SHORT')}${lv}/${spec.maxLevel}` : getRarityLabel(spec.rarity)}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-[#8df5da]">
                      {spec.role} · +{currentBonus}% {spec.specialty}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#94c2d1]">
                      {spec.description}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-end gap-2">
                  {isUnlocked && (
                    <button
                      type="button"
                      onClick={() => engine.toggleAssignSpecialist(spec.id)}
                      className={`min-h-[36px] flex items-center gap-1 rounded-lg px-3 text-xs font-bold whitespace-nowrap ${
                        isAssigned
                          ? 'bg-[#25695e] text-[#c9ffef]'
                          : 'bg-[#1a4c61] text-white hover:bg-[#23637d]'
                      }`}
                    >
                      {isAssigned && <Check className="h-3.5 w-3.5" />}
                      <span>{isAssigned ? t('UI_DONE') : t('UI_PLACE')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => engine.unlockOrUpgradeSpecialist(spec.id)}
                    disabled={!canAfford}
                    className={`pixel-btn min-h-[36px] rounded-lg px-3.5 text-xs font-bold tabular-nums whitespace-nowrap ${
                      isMax
                        ? 'bg-[#1d4d46] text-[#9effdf] cursor-default'
                        : canAfford
                          ? 'bg-[#2b8779] text-white hover:bg-[#35a190]'
                          : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                    }`}
                  >
                    {isMax
                      ? t('UI_MAXED')
                      : isUnlocked
                        ? `${t('UI_UPGRADE')} · ${formatNumber(cost)} ${t('UI_RP')}`
                        : `${formatNumber(cost)} ${t('UI_RP')}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: OCEAN CONSERVATION PROJECT (SOFT PRESTIGE — NO RESET!) */}
      {subTab === 'conservation' && (
        <div className="space-y-2.5">
          {CONSERVATION_CATALOG.map((proj) => {
            const done = state.completedConservationIds.includes(proj.id);
            const hasSpecies = state.discoveredFishIds.length >= proj.minDiscoveredSpecies;
            const canAfford =
              !done &&
              hasSpecies &&
              state.coins >= proj.coinCost &&
              state.researchPoints >= proj.rpCost;

            return (
              <div
                key={proj.id}
                className={`rounded-xl border p-3 ${
                  done
                    ? 'border-[#8df5da]/50 bg-[#143d3e]/70'
                    : 'border-[#5ba6ba]/30 bg-[#103044]/68'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-white">{proj.name}</div>
                    <div className="mt-0.5 text-xs font-semibold text-[#ffe484]">
                      {proj.permanentBonusLabel}
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-[#94c2d1]">
                      {proj.description}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#9ecbd9] tabular-nums">
                    {t('UI_FISH')}: {state.discoveredFishIds.length}/{proj.minDiscoveredSpecies}
                  </span>

                  {done ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-[#8df5da]">
                      <Check className="h-4 w-4" />
                      {t('UI_DONE')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => engine.contributeConservation(proj.id)}
                      disabled={!canAfford}
                      className={`pixel-btn min-h-[36px] rounded-lg px-3 text-xs font-bold tabular-nums whitespace-nowrap ${
                        canAfford
                          ? 'bg-[#2b8779] text-white hover:bg-[#35a190]'
                          : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                      }`}
                    >
                      {formatNumber(proj.coinCost)} {t('UI_COINS')} · {formatNumber(proj.rpCost)}{' '}
                      {t('UI_RP')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
