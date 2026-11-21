import React, { useState } from 'react';
import { DecorationCategory } from '../../game/core/types';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { DECORATION_CATALOG } from '../../game/data/decorationCatalog';
import { isDecorationUnlocked } from '../../game/progression/ProgressionManager';
import { GAME_CONFIG } from '../../game/core/GameConfig';
import { useLocalization } from '../../game/localization/LocalizationManager';
import { SpritePreview } from '../SpritePreview';
import { Lock, Check, Sparkles } from 'lucide-react';

interface DecorPanelProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
  onCloseForPlacement: () => void;
}

const CATEGORIES: ('All' | DecorationCategory)[] = [
  'All',
  'Equipment',
  'Plants',
  'Rocks',
  'Coral',
  'Wood',
  'Structures',
  'Substrate',
  'Special',
  'Background',
];

export const DecorPanel: React.FC<DecorPanelProps> = ({
  engine,
  snapshot,
  onCloseForPlacement,
}) => {
  const [category, setCategory] = useState<'All' | DecorationCategory>('All');
  const {
    t,
    formatNumber,
    getDecorationName,
    getDecorationDescription,
    getDecorationEffect,
    getDecorationCategory,
    getWaterStateLabel,
  } = useLocalization();

  const { state, beauty, ecosystem } = snapshot;

  const filtered =
    category === 'All'
      ? DECORATION_CATALOG
      : DECORATION_CATALOG.filter((d) => d.category === category);

  const nextMilestone = GAME_CONFIG.BEAUTY_MILESTONES.find(
    (m) => !state.claimedBeautyMilestones.includes(m.score)
  );
  const milestoneReady = Boolean(nextMilestone && beauty.total >= nextMilestone.score);

  return (
    <div className="space-y-3">
      {/* Ecosystem & Beauty 2.0 Summary Card */}
      <div className="rounded-xl border border-[#68c7ba]/35 bg-[#0d2c3d]/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-[#ffe694]">
              {t('DECOR_BEAUTY_SCORE', { score: beauty.total })}
            </div>
            <div className="mt-0.5 text-[11px] text-[#9ecbd9] tabular-nums">
              {t('BEAUTY_WATER')} {ecosystem.waterQuality}% ({getWaterStateLabel(ecosystem.waterState)}) ·{' '}
              {t('UI_OXYGEN')} {ecosystem.oxygen}% · {t('UI_SHELTER')} {ecosystem.totalShelter} ·{' '}
              {ecosystem.temperature}°C
            </div>
          </div>
          {nextMilestone && milestoneReady && (
            <button
              type="button"
              onClick={() => engine.claimBeautyMilestone(nextMilestone.score)}
              className="pixel-btn min-h-[34px] rounded-lg bg-[#d98c2b] px-3 text-xs font-bold text-white hover:bg-[#e89b38] whitespace-nowrap"
            >
              {t('DECOR_CLAIM_MILESTONE', { score: nextMilestone.score })}
            </button>
          )}
        </div>

        {/* 8-Factor Beauty 2.0 Breakdown */}
        <div className="mt-2 grid grid-cols-4 gap-1.5 text-[10px] text-[#bfe3ee] tabular-nums">
          <div className="rounded-lg bg-[#081f2d]/70 px-2 py-1 truncate">
            {t('BEAUTY_FISH')} {beauty.fishVariety}/20
          </div>
          <div className="rounded-lg bg-[#081f2d]/70 px-2 py-1 truncate">
            {t('BEAUTY_PLANTS')} {beauty.plantVariety}/15
          </div>
          <div className="rounded-lg bg-[#081f2d]/70 px-2 py-1 truncate">
            {t('BEAUTY_DECOR')} {beauty.decorationScore}/15
          </div>
          <div className="rounded-lg bg-[#081f2d]/70 px-2 py-1 truncate">
            {t('BEAUTY_RARITY')} {beauty.rarityScore}/15
          </div>
          <div className="rounded-lg bg-[#081f2d]/70 px-2 py-1 truncate">
            {t('BEAUTY_BALANCE')} {beauty.balanceScore}/10
          </div>
          <div className="rounded-lg bg-[#081f2d]/70 px-2 py-1 truncate">
            {t('BEAUTY_WATER')} {beauty.waterQualityScore}/10
          </div>
          <div className="rounded-lg bg-[#081f2d]/70 px-2 py-1 truncate">
            {t('BEAUTY_SCHOOLS')} {beauty.schoolingActivity}/8
          </div>
          <div className="rounded-lg bg-[#081f2d]/70 px-2 py-1 truncate">
            {t('BEAUTY_CRITTERS')} {beauty.creatureBonus}/7
          </div>
        </div>

        {nextMilestone && !milestoneReady && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#94d8cc]">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t('DECOR_NEXT_MILESTONE', {
                score: nextMilestone.score,
                reward: `+${formatNumber(nextMilestone.gems)} ${t('UI_GEMS')}, +${formatNumber(nextMilestone.coins)} ${t('UI_COINS')}`,
              })}
            </span>
          </div>
        )}
      </div>

      {/* Category Filter Strip */}
      <div className="cozy-scroll flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`min-h-[34px] shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
              category === cat
                ? 'bg-[#1e5c6b] text-white'
                : 'bg-[#0b2332]/75 text-[#9ecbd9] hover:text-white'
            }`}
          >
            {getDecorationCategory(cat)}
          </button>
        ))}
      </div>

      {/* Functional Decorations & Equipment Grid */}
      <div className="space-y-2.5">
        {filtered.map((decor) => {
          const unlock = isDecorationUnlocked(decor, state, beauty.total);
          const owned = state.ownedDecorations[decor.id] ?? 0;
          const placedCount = state.placedDecorations.filter(
            (p) => p.decorationId === decor.id
          ).length;
          const unplaced = Math.max(0, owned - placedCount);
          const isSurface =
            decor.placementZone === 'substrate' || decor.placementZone === 'background';
          const isActiveSurface =
            state.activeSubstrates[state.activeHabitatId] === decor.id ||
            state.activeBackgrounds[state.activeHabitatId] === decor.id;

          const canAffordCoins = state.coins >= decor.cost;
          const canAffordGems = Boolean(decor.gemCost && state.gems >= decor.gemCost);
          const effectStr = getDecorationEffect(decor);

          return (
            <div
              key={decor.id}
              className={`rounded-xl border p-3 ${
                unlock.unlocked
                  ? 'border-[#5ba6ba]/30 bg-[#103044]/68'
                  : 'border-[#3c6575]/25 bg-[#0a212e]/55 opacity-80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#081d2b]/80 border border-[#4a8fa3]/25">
                  <SpritePreview
                    kind="decoration"
                    id={decor.id}
                    size={44}
                    silhouette={!unlock.unlocked}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-sm text-white">
                      {getDecorationName(decor)}
                    </span>
                    <span className="text-[11px] font-bold text-[#ffe394] shrink-0">
                      +{decor.beautyValue} {t('UI_BEAUTY')}
                    </span>
                  </div>
                  {effectStr && (
                    <div className="mt-0.5 text-[11px] font-medium text-[#8ef0d8]">
                      {effectStr}
                    </div>
                  )}
                  <p className="mt-0.5 text-[11px] leading-snug text-[#8bb6c4]">
                    {unlock.unlocked
                      ? getDecorationDescription(decor)
                      : t('UNLOCK_REQ_PREFIX', { reason: unlock.reason ?? '' })}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#8db8c7] tabular-nums">
                  {owned > 0
                    ? t('DECOR_OWNED', { count: owned })
                    : getDecorationCategory(decor.category)}
                </span>

                <div className="flex items-center gap-2">
                  {!unlock.unlocked ? (
                    <span className="flex items-center gap-1 text-xs text-[#8bb6c4]">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>{unlock.reason}</span>
                    </span>
                  ) : (
                    <>
                      {isSurface && owned > 0 && (
                        <button
                          type="button"
                          onClick={() => engine.applySurfaceDecoration(decor.id)}
                          className={`min-h-[36px] flex items-center gap-1 rounded-lg px-3 text-xs font-bold whitespace-nowrap ${
                            isActiveSurface
                              ? 'bg-[#25695e] text-[#c9ffef]'
                              : 'bg-[#1a4c61] text-white hover:bg-[#23637d]'
                          }`}
                        >
                          {isActiveSurface && <Check className="h-3.5 w-3.5" />}
                          <span>{isActiveSurface ? t('DECOR_ACTIVE') : t('DECOR_APPLY')}</span>
                        </button>
                      )}

                      {!isSurface && unplaced > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            engine.startPlacingDecoration(decor.id);
                            onCloseForPlacement();
                          }}
                          className="pixel-btn min-h-[36px] rounded-lg bg-[#27788a] px-3 text-xs font-bold text-white hover:bg-[#3190a6] whitespace-nowrap"
                        >
                          {t('DECOR_PLACE_COUNT', { count: unplaced })}
                        </button>
                      )}

                      {decor.gemCost && (
                        <button
                          type="button"
                          onClick={() => engine.buyDecoration(decor.id, true)}
                          disabled={!canAffordGems}
                          className={`pixel-btn min-h-[36px] rounded-lg px-3 text-xs font-bold tabular-nums whitespace-nowrap ${
                            canAffordGems
                              ? 'bg-[#2a7d91] text-[#e0fcff] hover:bg-[#3393ab]'
                              : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                          }`}
                        >
                          {formatNumber(decor.gemCost)} {t('UI_GEMS')}
                        </button>
                      )}

                      {(!isSurface || owned === 0) && (
                        <button
                          type="button"
                          onClick={() => engine.buyDecoration(decor.id, false)}
                          disabled={!canAffordCoins}
                          className={`pixel-btn min-h-[36px] rounded-lg px-3.5 text-xs font-bold tabular-nums whitespace-nowrap ${
                            canAffordCoins
                              ? 'bg-[#2d8c7c] text-white hover:bg-[#37a391]'
                              : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                          }`}
                        >
                          {t('UI_BUY')} · {formatNumber(decor.cost)} {t('UI_COINS')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
