import React, { useMemo, useState } from 'react';
import { EncyclopediaCategory } from '../../game/core/types';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { HABITAT_CATALOG } from '../../game/data/habitatCatalog';
import { COLLECTION_REWARDS } from '../../game/data/collectionRewards';
import { MILESTONE_CATALOG } from '../../game/data/milestoneCatalog';
import { getCollectionMilestoneProgress } from '../../game/progression/CollectionManager';
import {
  ENCYCLOPEDIA_CATEGORIES,
  getAllEncyclopediaEntries,
  getMapSpeciesIndex,
  getTotalDiscoveredSpeciesCount,
  getTotalEncyclopediaSpeciesCount,
  MAP_COMPLETION_TIERS,
} from '../../game/progression/EncyclopediaSystem';
import {
  getGlobalMilestoneBonuses,
  getMilestoneProgress,
  isMilestoneClaimable,
} from '../../game/progression/MilestoneSystem';
import { useLocalization } from '../../game/localization/LocalizationManager';
import { SpritePreview } from '../SpritePreview';
import { Award, Check, Sparkles } from 'lucide-react';

interface CollectionPanelProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

const RARITY_COLOR: Record<string, string> = {
  Common: 'text-[#b7dce8]',
  Rare: 'text-[#7ce8ff]',
  Epic: 'text-[#d9b8ff]',
  Legendary: 'text-[#ffe484]',
};

export const CollectionPanel: React.FC<CollectionPanelProps> = ({ engine, snapshot }) => {
  const [subTab, setSubTab] = useState<'encyclopedia' | 'maps' | 'milestones'>('encyclopedia');
  const [categoryFilter, setCategoryFilter] = useState<'All' | EncyclopediaCategory>('All');
  const {
    locale,
    t,
    getHabitatName,
    getRarityLabel,
    getVariantLabel,
    getFishName,
    getFishDescription,
    getFishNote,
    getFishDiet,
    getFishBehavior,
    getFishDepth,
    getCreatureName,
    getCreatureDescription,
    getCreatureAbility,
    getEncyclopediaCategoryLabel,
  } = useLocalization();
  const { state } = snapshot;

  const allEntries = useMemo(() => getAllEncyclopediaEntries(state), [state]);
  const filteredEntries = useMemo(
    () =>
      categoryFilter === 'All'
        ? allEntries
        : allEntries.filter((e) => e.category === categoryFilter),
    [allEntries, categoryFilter]
  );

  const totalDiscovered = getTotalDiscoveredSpeciesCount(state);
  const totalSpecies = getTotalEncyclopediaSpeciesCount();
  const totalPct = Math.round((totalDiscovered / Math.max(1, totalSpecies)) * 100);
  const globalBonuses = getGlobalMilestoneBonuses(state);

  const totalVariantsFound = Object.values(state.discoveredVariants).reduce(
    (sum, list) => sum + list.filter((v) => v !== 'normal').length,
    0
  );

  return (
    <div className="space-y-3">
      {/* Permanent Encyclopedia Overview Header */}
      <div className="rounded-xl border border-[#72c4d6]/30 bg-[#0d2a3b]/70 p-3">
        <div className="flex items-center justify-between text-xs font-bold text-white tabular-nums">
          <span>
            {t('ENCYCLOPEDIA_TITLE')}: {totalDiscovered}/{totalSpecies} ({totalPct}%)
          </span>
          <span className="text-[#8df5da]">{state.collectionPoints} CP</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#081c28]">
          <div
            className="h-full bg-[#6fe3c8] transition-all duration-300"
            style={{ width: `${totalPct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#9ecbd9] tabular-nums">
          <span>
            {t('UI_MORPHS')}: {totalVariantsFound}
          </span>
          <span className="text-[#ffe694]">
            {t('MILESTONES_TAB')}: {(state.claimedMilestoneIds ?? []).length}/
            {MILESTONE_CATALOG.length}
          </span>
        </div>
      </div>

      {/* 3 Sub-Tabs: Encyclopedia / 20-Map Index / Milestones */}
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#091c29]/75 p-1">
        <button
          type="button"
          onClick={() => setSubTab('encyclopedia')}
          className={`min-h-[36px] rounded-lg px-1 text-xs font-semibold truncate ${
            subTab === 'encyclopedia' ? 'bg-[#1e5c6b] text-white' : 'text-[#9ecbd9] hover:text-white'
          }`}
        >
          {t('ENCYCLOPEDIA_TAB')}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('maps')}
          className={`min-h-[36px] rounded-lg px-1 text-xs font-semibold truncate ${
            subTab === 'maps' ? 'bg-[#1e5c6b] text-white' : 'text-[#9ecbd9] hover:text-white'
          }`}
        >
          {t('MAP_INDEX_TAB')}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('milestones')}
          className={`min-h-[36px] rounded-lg px-1 text-xs font-semibold truncate ${
            subTab === 'milestones' ? 'bg-[#1e5c6b] text-white' : 'text-[#9ecbd9] hover:text-white'
          }`}
        >
          {t('MILESTONES_TAB')}
        </button>
      </div>

      {/* TAB 1: UNIFIED FISH & CREATURE ENCYCLOPEDIA */}
      {subTab === 'encyclopedia' && (
        <div className="space-y-2.5">
          {/* Category Filter Strip */}
          <div className="flex flex-wrap gap-1">
            {(['All', ...ENCYCLOPEDIA_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#2a7d91] text-white'
                    : 'bg-[#0b2332] text-[#9ecbd9] hover:text-white'
                }`}
              >
                {getEncyclopediaCategoryLabel(cat)}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredEntries.map((entry) => {
              const variants =
                entry.kind === 'fish'
                  ? (state.discoveredVariants[entry.id] ?? []).filter((v) => v !== 'normal')
                  : [];
              const dateLabel = entry.discoveredAt
                ? new Date(entry.discoveredAt).toLocaleDateString(locale)
                : null;

              const localizedName =
                entry.kind === 'fish' && entry.fishData
                  ? getFishName(entry.fishData)
                  : entry.creatureData
                    ? getCreatureName(entry.creatureData)
                    : t(entry.nameKey);

              const localizedDesc =
                entry.kind === 'fish' && entry.fishData
                  ? getFishDescription(entry.fishData)
                  : entry.creatureData
                    ? getCreatureDescription(entry.creatureData)
                    : t(entry.descriptionKey);

              const localizedNoteOrAbility =
                entry.kind === 'fish' && entry.fishData
                  ? getFishNote(entry.fishData)
                  : entry.creatureData
                    ? getCreatureAbility(entry.creatureData)
                    : t(entry.noteOrAbilityKey);

              return (
                <div
                  key={`${entry.kind}_${entry.id}`}
                  className={`flex items-start gap-2.5 rounded-xl border p-2.5 ${
                    entry.discovered
                      ? 'border-[#5ba6ba]/30 bg-[#103044]/68'
                      : 'border-[#3c6575]/20 bg-[#0a212e]/55 opacity-75'
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#081d2b]/80 border border-[#4a8fa3]/20">
                    <SpritePreview
                      kind={entry.kind}
                      id={entry.id}
                      size={38}
                      silhouette={!entry.discovered}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-white">
                        {entry.discovered ? localizedName : '???'}
                      </span>
                      <span className={`shrink-0 text-[10px] font-bold ${RARITY_COLOR[entry.rarity]}`}>
                        {entry.discovered ? getRarityLabel(entry.rarity) : '???'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#8df5da] truncate">
                      {getEncyclopediaCategoryLabel(entry.category)} ·{' '}
                      {getHabitatName(entry.habitatId)}
                      {dateLabel ? ` · ${dateLabel}` : ''}
                    </div>
                    {entry.discovered ? (
                      <>
                        <div className="mt-0.5 text-[10px] text-[#9ecbd9] tabular-nums">
                          {t('UI_DIET')}: {getFishDiet(entry.diet)} · {t('UI_FOOD')}{' '}
                          {entry.foodRequirement} · +{entry.beautyValue} {t('UI_BEAUTY')}
                          {entry.preferredDepth
                            ? ` · ${t('UI_DEPTH')}: ${getFishDepth(entry.preferredDepth)}`
                            : ''}
                          {entry.behavior ? ` · ${getFishBehavior(entry.behavior)}` : ''}
                        </div>
                        <p className="mt-0.5 text-[10px] leading-snug text-[#a9d5e3]">
                          {localizedDesc}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-snug text-[#7fb2c2]">
                          {entry.kind === 'fish' ? `${t('UI_NOTE')}: ` : ''}
                          {localizedNoteOrAbility}
                        </p>
                        {variants.length > 0 && (
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-[#ffe694]">
                            <Sparkles className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">
                              {variants.map((v) => getVariantLabel(v)).join(', ')}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="mt-0.5 text-[10px] text-[#7ca3b3]">
                        {t('UI_UNDISCOVERED_HINT', { habitat: getHabitatName(entry.habitatId) })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: 20-MAP SPECIES INDEX & 5 COMPLETION TIERS */}
      {subTab === 'maps' && (
        <div className="space-y-2.5">
          {HABITAT_CATALOG.map((habitat) => {
            const idx = getMapSpeciesIndex(state, habitat.id);
            const mapState = state.mapStates[habitat.id];
            const numLabel = String(habitat.mapNumber).padStart(2, '0');

            return (
              <div
                key={habitat.id}
                className="rounded-xl border border-[#5ba6ba]/30 bg-[#103044]/68 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-pixel text-[#8df5da]">{numLabel}</span>
                    <span className="truncate font-bold text-white">
                      {getHabitatName(habitat)}
                    </span>
                    {idx.isComplete && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-[#216158] px-1.5 py-0.5 text-[9px] font-bold text-[#c7ffef]">
                        <Award className="h-2.5 w-2.5" />
                        {t('UI_MASTER_BADGE')}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 font-bold text-[#ffe694] tabular-nums">
                    {idx.percent}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#9ecbd9] tabular-nums">
                  <span>
                    {t('UI_FISH')} {idx.fishDiscovered}/{idx.fishTotal} · {t('UI_CREATURES_LABEL')}{' '}
                    {idx.creaturesDiscovered}/{idx.creaturesTotal}
                  </span>
                  <span>
                    {idx.totalDiscovered}/{idx.totalSpecies}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#081c28]">
                  <div
                    className="h-full bg-[#ffd86b]"
                    style={{ width: `${idx.percent}%` }}
                  />
                </div>

                {mapState && (
                  <div className="grid grid-cols-5 gap-1">
                    {MAP_COMPLETION_TIERS.map((tier) => {
                      const claimed = mapState.claimedMasteryTiers.includes(tier);
                      const ready = !claimed && idx.percent >= tier;
                      return (
                        <button
                          key={tier}
                          type="button"
                          disabled={!ready}
                          onClick={() => engine.claimMapMastery(habitat.id, tier)}
                          className={`min-h-[28px] flex items-center justify-center gap-0.5 rounded-lg text-[10px] font-bold tabular-nums ${
                            claimed
                              ? 'bg-[#17403a] text-[#8df5da]'
                              : ready
                                ? 'bg-[#d98c2b] text-white hover:bg-[#eb9c38]'
                                : 'bg-[#0b2332] text-[#6d94a3]'
                          }`}
                        >
                          {claimed ? <Check className="h-2.5 w-2.5" /> : null}
                          <span>{tier}%</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: 29 LONG-TERM MILESTONES + GLOBAL PERMANENT BONUSES */}
      {subTab === 'milestones' && (
        <div className="space-y-3">
          {/* Permanent Global Bonuses Summary */}
          <div className="rounded-xl border border-[#7adbc4]/30 bg-[#0d2f3e]/75 p-2.5">
            <div className="text-[11px] font-bold text-[#8df5da]">
              {t('MILESTONE_GLOBAL_BONUSES')}
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-[#cbeaf5] tabular-nums">
              <span>
                {t('UI_GROWTH')}: +{globalBonuses.growth_pct}%
              </span>
              <span>
                {t('UI_BREEDING')}: +{globalBonuses.breeding_pct}%
              </span>
              <span>
                {t('UI_OFFLINE')}: +{globalBonuses.offline_pct}%
              </span>
              <span>
                {t('UI_FOOD_EFF')}: +{globalBonuses.food_efficiency_pct}%
              </span>
            </div>
          </div>

          {/* 29 Expansion Milestones */}
          <div className="space-y-2">
            {MILESTONE_CATALOG.map((ms) => {
              const current = Math.floor(getMilestoneProgress(state, ms));
              const claimed = (state.claimedMilestoneIds ?? []).includes(ms.id);
              const ready = isMilestoneClaimable(state, ms);
              const pct = Math.min(100, Math.round((current / Math.max(1, ms.target)) * 100));

              return (
                <div
                  key={ms.id}
                  className="rounded-xl border border-[#5ba6ba]/30 bg-[#103044]/68 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-white">{ms.title}</span>
                        <span className="text-[9px] uppercase text-[#8df5da] shrink-0">
                          {ms.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#9ecbd9]">{ms.description}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-[#ffe694]">
                        {ms.reward.badgeLabel}
                      </div>
                    </div>

                    {claimed ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-[#8df5da] shrink-0">
                        <Check className="h-3.5 w-3.5" />
                        {t('UI_DONE')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => engine.claimMilestone(ms.id)}
                        className={`pixel-btn min-h-[34px] shrink-0 rounded-lg px-2.5 text-xs font-bold tabular-nums ${
                          ready
                            ? 'bg-[#d98c2b] text-white hover:bg-[#eb9c38]'
                            : 'bg-[#173645] text-[#7ca3b3] cursor-not-allowed'
                        }`}
                      >
                        {ready ? t('UI_CLAIM') : `${current}/${ms.target}`}
                      </button>
                    )}
                  </div>

                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#0a212e]">
                    <div
                      className="h-full bg-[#5bd4c0]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Original Collection Rewards preserved below */}
          <div className="space-y-2 border-t border-[#5ba6ba]/20 pt-2">
            <div className="text-xs font-bold text-[#9be7ff]">{t('UI_COLLECTION_REWARDS')}</div>
            {COLLECTION_REWARDS.map((milestone) => {
              const prog = getCollectionMilestoneProgress(milestone, state);
              const pct = Math.min(100, Math.round((prog.current / prog.required) * 100));

              return (
                <div
                  key={milestone.id}
                  className="rounded-xl border border-[#5ba6ba]/25 bg-[#0d2738]/65 p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white">{milestone.title}</div>
                      <div className="text-[11px] font-semibold text-[#ffe694]">
                        {milestone.reward.label}
                      </div>
                    </div>

                    {prog.isClaimed ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-[#8df5da]">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!prog.isReady}
                        onClick={() => engine.claimCollectionReward(milestone.id)}
                        className={`pixel-btn min-h-[32px] shrink-0 rounded-lg px-2.5 text-xs font-bold tabular-nums ${
                          prog.isReady
                            ? 'bg-[#d98c2b] text-white hover:bg-[#eb9c38]'
                            : 'bg-[#173645] text-[#7ca3b3] cursor-not-allowed'
                        }`}
                      >
                        {prog.isReady ? t('UI_CLAIM') : `${prog.current}/${prog.required}`}
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#0a212e]">
                    <div className="h-full bg-[#5bd4c0]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
