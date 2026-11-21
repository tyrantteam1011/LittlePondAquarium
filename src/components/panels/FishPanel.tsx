import React, { useState } from 'react';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { FISH_BY_ID, FISH_CATALOG } from '../../game/data/fishCatalog';
import { CREATURE_CATALOG, isCreatureAllowedInHabitat } from '../../game/data/creatureCatalog';
import { HABITAT_BY_ID } from '../../game/data/habitatCatalog';
import { getFishPurchaseCost } from '../../game/economy/IncomeSystem';
import { getCreaturePurchaseCost } from '../../game/economy/UpgradeSystem';
import {
  getFishFoodRequirement,
  getHungerBand,
  getHungerBandColor,
} from '../../game/feeding/HungerSystem';
import { isFishUnlocked } from '../../game/progression/ProgressionManager';
import { useLocalization } from '../../game/localization/LocalizationManager';
import { SpritePreview } from '../SpritePreview';
import { Lock, AlertTriangle, Sparkles, Ban } from 'lucide-react';

interface FishPanelProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

const RARITY_COLOR: Record<string, string> = {
  Common: 'text-[#b7dce8]',
  Rare: 'text-[#7ce8ff]',
  Epic: 'text-[#d9b8ff]',
  Legendary: 'text-[#ffe484]',
};

export const FishPanel: React.FC<FishPanelProps> = ({ engine, snapshot }) => {
  const [subTab, setSubTab] = useState<'adopt' | 'creatures' | 'tank'>('adopt');
  const [showAllMaps, setShowAllMaps] = useState(false);
  const {
    t,
    tPlural,
    formatNumber,
    formatDuration,
    getFishName,
    getFishDescription,
    getFishNote,
    getFishDiet,
    getCreatureName,
    getCreatureDescription,
    getCreatureAbility,
    getHabitatName,
    getRarityLabel,
    getStageLabel,
    getVariantLabel,
  } = useLocalization();

  const { state, beauty, ecosystem, activeHabitatFishCount, maxCapacity } = snapshot;
  const activeHabitat = HABITAT_BY_ID[state.activeHabitatId] ?? HABITAT_BY_ID.pond;
  const activeHabitatLabel = getHabitatName(activeHabitat);

  const activeFish = state.placedFish.filter((f) => f.habitatId === state.activeHabitatId);
  const activeEggs = state.placedEggs.filter((e) => e.habitatId === state.activeHabitatId);
  const activeCreatures = state.placedCreatures.filter(
    (c) => c.habitatId === state.activeHabitatId
  );

  // Count how many of each species are currently in the active tank (for schooling guidance)
  const speciesCounts: Record<string, number> = {};
  for (const f of activeFish) {
    speciesCounts[f.fishId] = (speciesCounts[f.fishId] ?? 0) + 1;
  }

  const visibleCatalog = showAllMaps
    ? FISH_CATALOG
    : FISH_CATALOG.filter((f) => f.preferredHabitat === state.activeHabitatId);

  const mapCreatures = CREATURE_CATALOG.filter((c) => c.habitatId === state.activeHabitatId);
  const otherCreatures = CREATURE_CATALOG.filter((c) => c.habitatId !== state.activeHabitatId);

  return (
    <div className="space-y-3">
      {/* Compact Sub-Tabs */}
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#091c29]/75 p-1">
        <button
          type="button"
          onClick={() => setSubTab('adopt')}
          className={`min-h-[38px] rounded-lg px-1.5 text-xs font-semibold transition-colors truncate ${
            subTab === 'adopt'
              ? 'bg-[#1e5c6b] text-white'
              : 'text-[#9ecbd9] hover:text-white'
          }`}
        >
          {t('FISH_TAB_ADOPT')}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('creatures')}
          className={`min-h-[38px] rounded-lg px-1.5 text-xs font-semibold transition-colors truncate ${
            subTab === 'creatures'
              ? 'bg-[#1e5c6b] text-white'
              : 'text-[#9ecbd9] hover:text-white'
          }`}
        >
          {t('FISH_TAB_CREATURES', { count: activeCreatures.length })}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('tank')}
          className={`min-h-[38px] rounded-lg px-1.5 text-xs font-semibold transition-colors truncate ${
            subTab === 'tank'
              ? 'bg-[#1e5c6b] text-white'
              : 'text-[#9ecbd9] hover:text-white'
          }`}
        >
          {t('FISH_TAB_TANK', { cur: activeHabitatFishCount, max: maxCapacity })}
        </button>
      </div>

      {/* Live Ecosystem Warnings Banner (if any) */}
      {ecosystem.warnings.length > 0 && (
        <div className="rounded-xl border border-[#f5c869]/45 bg-[#362b14]/55 px-3 py-2 text-xs text-[#ffe7a8]">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#ffd36b]" />
            <span>{activeHabitatLabel}</span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-[#f7e6bd]">
            {ecosystem.warnings[0]}
          </p>
        </div>
      )}

      {/* TAB 1: ADOPT FISH */}
      {subTab === 'adopt' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs text-[#a3d0de]">
            <span className="truncate">
              {showAllMaps ? `${FISH_CATALOG.length} ${t('UI_FISH')}` : activeHabitatLabel}
            </span>
            <button
              type="button"
              onClick={() => setShowAllMaps((v) => !v)}
              className="shrink-0 text-xs font-semibold text-[#7ee8d4] hover:underline"
            >
              {showAllMaps ? activeHabitatLabel : `${FISH_CATALOG.length} ${t('UI_FISH')}`}
            </button>
          </div>

          {visibleCatalog.map((fish) => {
            const unlock = isFishUnlocked(fish, state, beauty.total);
            const coinCost = getFishPurchaseCost(fish.id, state);
            const canAffordCoins = state.coins >= coinCost;
            const canAffordGems = Boolean(fish.gemCost && state.gems >= fish.gemCost);
            const inTankCount = speciesCounts[fish.id] ?? 0;
            const needsSchool = inTankCount > 0 && inTankCount < fish.minimumSchoolSize;
            const isTutorialTargetFish = fish.id === 'neon_tetra';

            return (
              <div
                key={fish.id}
                className={`rounded-xl border p-3 transition-colors ${
                  unlock.unlocked
                    ? 'border-[#5ba6ba]/30 bg-[#103044]/68'
                    : 'border-[#3c6575]/25 bg-[#0a212e]/55 opacity-80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#081d2b]/80 border border-[#4a8fa3]/25">
                    <SpritePreview
                      kind="fish"
                      id={fish.id}
                      size={46}
                      silhouette={!unlock.unlocked}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-sm text-white">
                        {getFishName(fish)}
                      </span>
                      <span className={`text-[11px] font-bold shrink-0 ${RARITY_COLOR[fish.rarity]}`}>
                        {getRarityLabel(fish.rarity)}
                      </span>
                    </div>

                    <div className="mt-0.5 text-[11px] text-[#9ecbd9] tabular-nums">
                      +{formatNumber(fish.baseIncome)}{t('UI_PER_SEC')} · {t('UI_SPACE')} {fish.spaceRequirement} ·{' '}
                      {t('UI_FOOD')} {getFishFoodRequirement(fish)} ({getFishDiet(fish.dietType)}) ·{' '}
                      {fish.minimumSchoolSize > 1
                        ? t('FISH_SCHOOL_LABEL', { cur: inTankCount, min: fish.minimumSchoolSize })
                        : t('FISH_SOLO_LABEL')}
                    </div>

                    <p className="mt-1 text-[11px] leading-snug text-[#a9d5e3]">
                      {unlock.unlocked
                        ? getFishDescription(fish)
                        : t('UNLOCK_REQ_PREFIX', { reason: unlock.reason ?? '' })}
                    </p>

                    {unlock.unlocked && (
                      <p className="mt-0.5 text-[10px] leading-snug text-[#7fb2c2]">
                        {t('UI_NOTE')}: {getFishNote(fish)}
                      </p>
                    )}

                    {needsSchool && (
                      <div className="mt-1 text-[11px] font-medium text-[#ffe394]">
                        {t('FISH_SCHOOL_LABEL', { cur: inTankCount, min: fish.minimumSchoolSize })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Row */}
                <div className="mt-2.5 flex items-center justify-end gap-2">
                  {!unlock.unlocked ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8bb6c4]">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>{unlock.reason}</span>
                    </div>
                  ) : (
                    <>
                      {fish.gemCost && (
                        <button
                          type="button"
                          onClick={() => engine.buyFish(fish.id, true)}
                          disabled={!canAffordGems}
                          className={`pixel-btn min-h-[38px] rounded-lg px-3 text-xs font-bold tabular-nums whitespace-nowrap ${
                            canAffordGems
                              ? 'bg-[#2a7d91] text-[#e0fcff] hover:bg-[#3393ab]'
                              : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                          }`}
                        >
                          {fish.gemCost} {t('UI_GEMS')}
                        </button>
                      )}
                      <button
                        type="button"
                        data-tutorial-target={isTutorialTargetFish ? 'fish-buy-first' : undefined}
                        onClick={() => engine.buyFish(fish.id, false)}
                        disabled={!canAffordCoins}
                        className={`pixel-btn min-h-[38px] rounded-lg px-3.5 text-xs font-bold tabular-nums whitespace-nowrap ${
                          canAffordCoins
                            ? 'bg-[#2d8c7c] text-white hover:bg-[#37a391]'
                            : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                        }`}
                      >
                        {t('UI_ADOPT')} · {formatNumber(coinCost)} {t('UI_COINS')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: MAP-SPECIFIC INCOME, MAINTENANCE & LARGE CREATURES */}
      {subTab === 'creatures' && (
        <div className="space-y-2.5">
          {[...mapCreatures, ...otherCreatures].map((creature) => {
            const isNative = creature.habitatId === state.activeHabitatId;
            const mapUnlocked = state.unlockedHabitats.includes(creature.habitatId);
            const habitatAllowed = isCreatureAllowedInHabitat(creature, state.activeHabitatId);
            const spaceOk =
              creature.spaceRequirement <= 0 ||
              ecosystem.spaceUsed + creature.spaceRequirement <= ecosystem.spaceMax;
            const cost = getCreaturePurchaseCost(creature.id, state);
            const canAfford = state.coins >= cost && mapUnlocked && habitatAllowed && spaceOk;
            const ownedInMap = activeCreatures.filter((c) => c.creatureId === creature.id).length;
            const creatureMapName = getHabitatName(creature.habitatId);

            return (
              <div
                key={creature.id}
                className={`rounded-xl border p-3 ${
                  mapUnlocked && habitatAllowed
                    ? 'border-[#5ba6ba]/30 bg-[#103044]/68'
                    : 'border-[#3c6575]/25 bg-[#0a212e]/55 opacity-75'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#081d2b]/80 border border-[#4a8fa3]/25">
                    <SpritePreview
                      kind="creature"
                      id={creature.id}
                      size={44}
                      silhouette={!mapUnlocked}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-sm text-white">
                        {getCreatureName(creature)}
                      </span>
                      <span className="text-[11px] font-semibold text-[#ffe394] tabular-nums shrink-0">
                        {ownedInMap > 0 ? `×${ownedInMap}` : isNative ? activeHabitatLabel : creatureMapName}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#8ef0d8] tabular-nums">
                      +{formatNumber(creature.coinDropValue)}/{t('UI_SEC_SHORT', { sec: creature.coinDropIntervalSec })} ·
                      +{formatNumber(creature.passiveIncomePerSec)}{t('UI_PER_SEC')} · +{creature.beautyValue} {t('UI_BEAUTY')}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#9ecbd9] tabular-nums">
                      {creature.isLargeCreature ? (
                        <span className="text-[#ffd485]">
                          {t('UI_SPACE')} {creature.spaceRequirement} · {t('UI_FOOD')}{' '}
                          {creature.foodRequirement ?? 1} · {t('UI_OXYGEN')}{' '}
                          {creature.oxygenRequirement ?? 0}
                        </span>
                      ) : (
                        <>
                          -{creature.algaeCleanRate} {t('UI_ALGAE')} · +{creature.waterCleanRate}{' '}
                          {t('UI_WATER_QUALITY')}
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-[#a9d5e3]">
                      {getCreatureDescription(creature)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#7fb2c2]">
                      {getCreatureAbility(creature)}
                    </p>
                    {!habitatAllowed && mapUnlocked && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#ff9b9b]">
                        <Ban className="h-3 w-3 shrink-0" />
                        <span>{t('CREATURE_HABITAT_BLOCKED')}</span>
                      </div>
                    )}
                    {habitatAllowed && !spaceOk && mapUnlocked && (
                      <div className="mt-1 text-[11px] font-semibold text-[#ffe394] tabular-nums">
                        {t('UI_SPACE')}: {ecosystem.spaceUsed + creature.spaceRequirement}/{ecosystem.spaceMax}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 flex justify-end">
                  {!mapUnlocked ? (
                    <span className="flex items-center gap-1 text-xs text-[#88b2bf]">
                      <Lock className="h-3.5 w-3.5" />
                      {t('UI_UNLOCK')} {creatureMapName}
                    </span>
                  ) : !habitatAllowed ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#ff9b9b]">
                      <Ban className="h-3.5 w-3.5" />
                      {creatureMapName}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => engine.buyCreature(creature.id)}
                      disabled={!canAfford}
                      className={`pixel-btn min-h-[38px] rounded-lg px-3.5 text-xs font-bold tabular-nums whitespace-nowrap ${
                        canAfford
                          ? 'bg-[#c9842c] text-white hover:bg-[#db9337]'
                          : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                      }`}
                    >
                      {t('UI_ADOPT')} · {formatNumber(cost)} {t('UI_COINS')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: MY TANK (GROWTH STAGES, HEALTH, VARIANTS & INCUBATING EGGS) */}
      {subTab === 'tank' && (
        <div className="space-y-3">
          {/* Incubating Eggs */}
          {activeEggs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#ffe694]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{tPlural('FISH_EGGS_COUNT', activeEggs.length)}</span>
              </div>
              {activeEggs.map((egg) => {
                const def = FISH_BY_ID[egg.fishId];
                const elapsed = Math.max(0, (Date.now() - egg.laidAt) / 1000);
                const remaining = Math.max(0, egg.hatchDurationSec - elapsed);
                const pct = Math.min(100, Math.round((elapsed / egg.hatchDurationSec) * 100));
                return (
                  <div
                    key={egg.eggId}
                    className="rounded-xl border border-[#ffe484]/45 bg-[#292d1c]/55 p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white">
                      <span className="truncate">
                        {def ? getFishName(def) : egg.fishId}
                        {egg.variant !== 'normal' && (
                          <span className="ml-1.5 text-[#ffe694]">
                            ({getVariantLabel(egg.variant)})
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums text-[#9ef7dc]">
                        {formatDuration(remaining)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#122633]">
                      <div
                        className="h-full bg-[#ffd86b] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Swimming Fish Lifecycle List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#9ecbd9]">
              {activeHabitatLabel} ({activeFish.length}/{maxCapacity})
            </div>
            {activeFish.map((placed) => {
              const def = FISH_BY_ID[placed.fishId];
              if (!def) return null;
              const growthPct = Math.min(
                100,
                Math.round((placed.ageSec / Math.max(1, def.growthTimeSec)) * 100)
              );
              const healthColor =
                placed.health >= 75
                  ? 'text-[#8df5da]'
                  : placed.health >= 50
                    ? 'text-[#ffe394]'
                    : 'text-[#ff9c9c]';

              const hungerVal = Math.round(placed.hunger ?? 90);
              const hungerBand = getHungerBand(hungerVal);
              const hungerColor = getHungerBandColor(hungerBand);

              return (
                <div
                  key={placed.instanceId}
                  className="flex items-center gap-3 rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 p-2.5"
                >
                  <SpritePreview
                    kind="fish"
                    id={placed.fishId}
                    variant={placed.variant}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-white">
                        {getFishName(def)}
                        {placed.variant !== 'normal' && (
                          <span className="ml-1.5 text-[#ffe484]">
                            · {getVariantLabel(placed.variant)}
                          </span>
                        )}
                      </span>
                      <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${healthColor}`}>
                        {t('UI_HP')} {Math.round(placed.health)}%
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-[#9ecbd9] tabular-nums">
                      <span>
                        {getStageLabel(placed.growthStage)} ·{' '}
                        {placed.growthStage === 'breeding_adult'
                          ? t('FISH_READY_TO_BREED')
                          : `${growthPct}%`}
                      </span>
                      <span style={{ color: hungerColor }} className="font-semibold">
                        {t('UI_FOOD')} {hungerVal}%
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-1.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0a212e]">
                        <div
                          className="h-full bg-[#6fe3c8]"
                          style={{ width: `${growthPct}%` }}
                        />
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0a212e]">
                        <div
                          className="h-full transition-all duration-300"
                          style={{ width: `${hungerVal}%`, backgroundColor: hungerColor }}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => engine.storePlacedFish(placed.instanceId)}
                    className="min-h-[34px] shrink-0 rounded-lg border border-[#5ba6ba]/35 bg-[#143a4f] px-2.5 text-[11px] font-semibold text-[#cbeaf5] hover:bg-[#1c4e69] whitespace-nowrap"
                  >
                    {t('UI_STORE')}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Stored Fish */}
          {state.storedFish.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#5ba6ba]/20">
              <div className="text-xs font-semibold text-[#9ecbd9]">
                {t('UI_STORE')} ({state.storedFish.length})
              </div>
              {state.storedFish.map((stored) => {
                const def = FISH_BY_ID[stored.fishId];
                if (!def) return null;
                return (
                  <div
                    key={stored.instanceId}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[#5ba6ba]/20 bg-[#0d2738]/65 p-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <SpritePreview
                        kind="fish"
                        id={stored.fishId}
                        variant={stored.variant}
                        size={36}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-white">
                          {getFishName(def)}
                        </div>
                        <div className="text-[11px] text-[#9ecbd9]">
                          {getStageLabel(stored.growthStage ?? 'adult')}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => engine.placeStoredFish(stored.instanceId)}
                      className="pixel-btn min-h-[34px] shrink-0 rounded-lg bg-[#2d8c7c] px-3 text-xs font-bold text-white hover:bg-[#37a391] whitespace-nowrap"
                    >
                      {t('UI_PLACE')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
