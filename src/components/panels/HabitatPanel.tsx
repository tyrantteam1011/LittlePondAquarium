import React from 'react';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { HABITAT_CATALOG } from '../../game/data/habitatCatalog';
import { canUnlockHabitat } from '../../game/progression/ProgressionManager';
import { getMapSpeciesIndex, MAP_COMPLETION_TIERS } from '../../game/progression/EncyclopediaSystem';
import {
  canUnlockNextMapExpansion,
  getMapExpansionBonus,
  getMapMasteryBonuses,
  getMapMasteryUpgradeCost,
  MAX_MAP_MASTERY_LEVEL,
} from '../../game/progression/MapMasterySystem';
import { useLocalization } from '../../game/localization/LocalizationManager';
import { Award, Check, Expand, Lock, Sparkles, TrendingUp } from 'lucide-react';

interface HabitatPanelProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export const HabitatPanel: React.FC<HabitatPanelProps> = ({ engine, snapshot }) => {
  const { state, beauty } = snapshot;
  const {
    t,
    formatNumber,
    formatPercent,
    getHabitatName,
    getHabitatSpec,
    getHabitatMechanic,
    getHabitatToken,
  } = useLocalization();

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#72c4d6]/30 bg-[#0d2a3b]/70 px-3 py-2 text-xs text-[#bfe3ee] flex items-center justify-between">
        <span className="font-bold text-white">
          {t('MAP_UNLOCKED_COUNT', {
            cur: state.unlockedHabitats.length,
            total: HABITAT_CATALOG.length,
          })}
        </span>
        <span className="text-[11px] text-[#8df5da]">{t('MAP_NO_RESET_NOTE')}</span>
      </div>

      <div className="space-y-2.5">
        {HABITAT_CATALOG.map((habitat) => {
          const isUnlocked = state.unlockedHabitats.includes(habitat.id);
          const isActive = state.activeHabitatId === habitat.id;
          const unlockCheck = canUnlockHabitat(habitat, state, beauty.total);
          const mapState = state.mapStates[habitat.id];
          const speciesIdx = getMapSpeciesIndex(state, habitat.id);
          const fishCount = state.placedFish.filter((f) => f.habitatId === habitat.id).length;
          const creatureCount = state.placedCreatures.filter(
            (c) => c.habitatId === habitat.id
          ).length;
          const numLabel = String(habitat.mapNumber).padStart(2, '0');

          const masteryBonuses = mapState ? getMapMasteryBonuses(mapState) : null;
          const masteryLv = mapState?.masteryLevel ?? 1;
          const masteryMaxed = masteryLv >= MAX_MAP_MASTERY_LEVEL;
          const masteryCost = getMapMasteryUpgradeCost(masteryLv, habitat.id);
          const canUpgradeMastery =
            Boolean(mapState) &&
            !masteryMaxed &&
            state.coins >= masteryCost.coins &&
            (mapState?.mapTokens ?? 0) >= masteryCost.tokens;

          const expBonus = mapState ? getMapExpansionBonus(mapState) : null;
          const expCheck = canUnlockNextMapExpansion(state, habitat.id);
          const canBuyExpansion =
            Boolean(mapState) &&
            expCheck.available &&
            state.coins >= expCheck.cost.coins &&
            (mapState?.mapTokens ?? 0) >= expCheck.cost.tokens;

          return (
            <div
              key={habitat.id}
              className={`overflow-hidden rounded-xl border transition-colors ${
                isActive
                  ? 'border-[#8df5da] bg-[#11394a]/80'
                  : isUnlocked
                    ? 'border-[#5ba6ba]/35 bg-[#103044]/68'
                    : 'border-[#3c6575]/25 bg-[#0a212e]/55'
              }`}
            >
              {/* Habitat Color Swatch Strip */}
              <div
                className="h-2 w-full"
                style={{
                  background: `linear-gradient(90deg, ${habitat.palette.waterTop}, ${habitat.palette.waterMid}, ${habitat.palette.sandTop})`,
                }}
              />

              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-xs font-bold text-[#8df5da]">
                        {numLabel}
                      </span>
                      <h3 className="truncate text-sm font-bold text-white">
                        {getHabitatName(habitat)}
                      </h3>
                      {speciesIdx.isComplete && (
                        <Award className="h-3.5 w-3.5 shrink-0 text-[#ffe484]" />
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[#ffe394]">
                      {getHabitatSpec(habitat)} · {habitat.incomeMultiplier}×
                    </div>
                  </div>

                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => engine.switchHabitat(habitat.id)}
                      disabled={isActive}
                      className={`pixel-btn min-h-[36px] shrink-0 rounded-lg px-3 text-xs font-bold whitespace-nowrap ${
                        isActive
                          ? 'bg-[#216158] text-[#c7ffef] cursor-default'
                          : 'bg-[#2b8779] text-white hover:bg-[#35a190]'
                      }`}
                    >
                      {isActive ? t('UI_ACTIVE_MAP') : t('UI_VISIT_MAP')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => engine.unlockHabitat(habitat.id)}
                      disabled={!unlockCheck.canUnlock}
                      className={`pixel-btn min-h-[36px] shrink-0 flex items-center gap-1 rounded-lg px-3 text-xs font-bold whitespace-nowrap ${
                        unlockCheck.canUnlock
                          ? 'bg-[#d98c2b] text-white hover:bg-[#eb9c38]'
                          : 'bg-[#173645] text-[#789fad] cursor-not-allowed'
                      }`}
                    >
                      {!unlockCheck.canUnlock && <Lock className="h-3 w-3 shrink-0" />}
                      <span>
                        {unlockCheck.canUnlock
                          ? `${t('UI_UNLOCK')} · ${formatNumber(habitat.unlockRequirement.coinCost)}`
                          : t('UI_LOCKED')}
                      </span>
                    </button>
                  )}
                </div>

                <p className="mt-1.5 text-[11px] leading-snug text-[#9bc7d6]">
                  {getHabitatMechanic(habitat)}
                </p>

                {isUnlocked && mapState && masteryBonuses && expBonus ? (
                  <div className="mt-2.5 space-y-2.5 border-t border-[#5ba6ba]/20 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#bfe3ee] tabular-nums">
                      <span>
                        {fishCount} {t('UI_FISH')} · {creatureCount} 🐚 · {t('UI_FOOD')}{' '}
                        {formatNumber(Math.round(mapState.foodStored))} · {t('UI_AUTO')}{' '}
                        {mapState.autoFeederLevel > 0
                          ? `${t('UI_LEVEL_SHORT')}${mapState.autoFeederLevel}`
                          : t('UI_OFF')}
                      </span>
                      <span className="font-semibold text-[#9be7ff]">
                        {formatNumber(mapState.mapTokens)} {getHabitatToken(habitat)}
                      </span>
                    </div>

                    {/* Long-Term Map Mastery Lv.1..20 (No Reset!) */}
                    <div className="rounded-lg bg-[#092130]/70 p-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[#8df5da]">
                          <TrendingUp className="h-3 w-3 shrink-0" />
                          <span>
                            {t('MAP_MASTERY_LABEL')} {t('UI_LEVEL_SHORT')}{masteryLv}/{MAX_MAP_MASTERY_LEVEL}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#9ecbd9] tabular-nums">
                          {t('MAP_MASTERY_BONUS_SUMMARY', {
                            slots: masteryBonuses.extraFishSlots,
                            coins: masteryBonuses.incomeBonusPct,
                            food: masteryBonuses.foodCapacityBonusPct,
                          })}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!canUpgradeMastery}
                        onClick={() => engine.upgradeMapMastery(habitat.id)}
                        className={`pixel-btn min-h-[32px] shrink-0 rounded-lg px-2.5 text-[11px] font-bold tabular-nums whitespace-nowrap ${
                          masteryMaxed
                            ? 'bg-[#17403a] text-[#8df5da] cursor-default'
                            : canUpgradeMastery
                              ? 'bg-[#2a7d91] text-white hover:bg-[#3393ab]'
                              : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                        }`}
                      >
                        {masteryMaxed
                          ? t('UI_MAXED')
                          : `${formatNumber(masteryCost.coins)} + ${masteryCost.tokens}${t('UI_TOKEN_SHORT')}`}
                      </button>
                    </div>

                    {/* Retroactive Map Expansion (50 -> 75 -> 100 Cap) */}
                    {expBonus.tier < 2 && (
                      <div className="rounded-lg bg-[#092130]/70 p-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#ffe694]">
                            <Expand className="h-3 w-3 shrink-0" />
                            <span>
                              {t('MAP_EXPANSION_LABEL')} (
                              {t('MAP_EXPANSION_CAP', {
                                cur: expBonus.maxFishCeiling,
                                next: expCheck.nextTier >= 2 ? 100 : 75,
                              })}
                              )
                            </span>
                          </div>
                          <div className="text-[10px] text-[#9ecbd9]">
                            {expCheck.available
                              ? t('MAP_EXPANSION_READY')
                              : t('MAP_EXPANSION_LOCKED_HINT')}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!canBuyExpansion}
                          onClick={() => engine.unlockMapExpansion(habitat.id)}
                          className={`pixel-btn min-h-[32px] shrink-0 rounded-lg px-2.5 text-[11px] font-bold tabular-nums whitespace-nowrap ${
                            canBuyExpansion
                              ? 'bg-[#d98c2b] text-white hover:bg-[#eb9c38]'
                              : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                          }`}
                        >
                          {expCheck.available
                            ? `${formatNumber(expCheck.cost.coins)} + ${expCheck.cost.tokens}${t('UI_TOKEN_SHORT')}`
                            : t('UI_LOCKED')}
                        </button>
                      </div>
                    )}

                    {/* Species Index 5-Tier Rewards */}
                    <div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#9ecbd9]">
                          {t('MAP_SPECIES_PROGRESS', {
                            cur: speciesIdx.totalDiscovered,
                            total: speciesIdx.totalSpecies,
                          })}
                        </span>
                        <span className="font-bold text-[#ffe694] tabular-nums">
                          {formatPercent(speciesIdx.percent)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#0a212e]">
                        <div
                          className="h-full bg-[#ffd86b]"
                          style={{ width: `${speciesIdx.percent}%` }}
                        />
                      </div>

                      <div className="mt-2 grid grid-cols-5 gap-1">
                        {MAP_COMPLETION_TIERS.map((tier) => {
                          const claimed = mapState.claimedMasteryTiers.includes(tier);
                          const ready = !claimed && speciesIdx.percent >= tier;
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
                              {claimed ? (
                                <Check className="h-2.5 w-2.5" />
                              ) : ready ? (
                                <Sparkles className="h-2.5 w-2.5" />
                              ) : null}
                              <span>{tier}%</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-[#89b3c2] tabular-nums">
                    {t('UI_LEVEL_SHORT')}{habitat.unlockRequirement.aquariumLevel} ·{' '}
                    {habitat.unlockRequirement.discoveredFishCount} {t('UI_FISH')} ·{' '}
                    {t('UI_BEAUTY')} {formatNumber(habitat.unlockRequirement.beautyScore)} ·{' '}
                    {formatNumber(habitat.unlockRequirement.coinCost)} {t('UI_COINS')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
