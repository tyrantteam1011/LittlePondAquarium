import React from 'react';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { AUTO_FEEDER_UPGRADE_TREE } from '../../game/data/feedingCatalog';
import { HABITAT_BY_ID } from '../../game/data/habitatCatalog';
import {
  getFoodFactoryRatePerMin,
  getFoodFactoryUpgradeCost,
  getFoodStorageCapacity,
  getFoodStorageUpgradeCost,
  getMapFoodInfo,
  getMaxManualFeedCharges,
  getNextChargeCountdownSec,
  MAX_FOOD_FACTORY_LEVEL,
  MAX_FOOD_STORAGE_LEVEL,
} from '../../game/feeding/FeedingSystem';
import {
  getAutoFeederLevelCost,
  getAutoFeederStats,
  getAutoFeederTreeCost,
  MAX_AUTO_FEEDER_LEVEL,
} from '../../game/feeding/AutoFeederSystem';
import { useLocalization } from '../../game/localization/LocalizationManager';
import {
  AlertTriangle,
  Bot,
  Factory,
  Package,
  Sparkles,
  Utensils,
  Zap,
} from 'lucide-react';

interface FeedingPanelProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export const FeedingPanel: React.FC<FeedingPanelProps> = ({ engine, snapshot }) => {
  const {
    t,
    tPlural,
    formatNumber,
    getHabitatName,
    getHabitatToken,
    getMapFoodName,
    getAutoFeederNodeName,
    getAutoFeederNodeDescription,
  } = useLocalization();
  const { state, activeMapState, ecosystem } = snapshot;
  const habId = state.activeHabitatId;
  const habitat = HABITAT_BY_ID[habId] ?? HABITAT_BY_ID.pond;
  const mapLabel = getHabitatName(habitat);
  const foodInfo = getMapFoodInfo(habId);

  const storageCap = getFoodStorageCapacity(
    activeMapState.foodStorageLevel,
    activeMapState.masteryLevel
  );
  const foodStored = Math.round(activeMapState.foodStored);
  const storagePct = Math.min(100, Math.round((foodStored / Math.max(1, storageCap)) * 100));

  const factoryRate = getFoodFactoryRatePerMin(
    activeMapState.foodFactoryLevel,
    activeMapState.masteryLevel
  );
  const consumptionRate = ecosystem.foodConsumptionPerMin;
  const netRate = Number((factoryRate - consumptionRate).toFixed(1));

  const packSize = Math.max(foodInfo.buyPackAmount, Math.round(storageCap * 0.25));
  const packCost = Math.round(
    foodInfo.buyPackCoinCost * (packSize / Math.max(1, foodInfo.buyPackAmount))
  );
  const canBuyPack = state.coins >= packCost && foodStored < storageCap;

  const storageCost = getFoodStorageUpgradeCost(activeMapState.foodStorageLevel, habId);
  const storageMaxed = activeMapState.foodStorageLevel >= MAX_FOOD_STORAGE_LEVEL;
  const canUpgradeStorage = !storageMaxed && state.coins >= storageCost;

  const factoryCost = getFoodFactoryUpgradeCost(activeMapState.foodFactoryLevel, habId);
  const factoryMaxed = activeMapState.foodFactoryLevel >= MAX_FOOD_FACTORY_LEVEL;
  const canUpgradeFactory = !factoryMaxed && state.coins >= factoryCost;

  const maxCharges = getMaxManualFeedCharges(activeMapState);
  const nextChargeSec = getNextChargeCountdownSec(activeMapState, Date.now());

  const autoStats = getAutoFeederStats(activeMapState);
  const autoCost = getAutoFeederLevelCost(activeMapState.autoFeederLevel, habId);
  const autoMaxed = activeMapState.autoFeederLevel >= MAX_AUTO_FEEDER_LEVEL;
  const canUpgradeAuto =
    !autoMaxed &&
    state.coins >= autoCost.coins &&
    activeMapState.mapTokens >= autoCost.tokens;

  const hungerTone =
    ecosystem.avgHunger >= 75
      ? 'text-[#8df5da]'
      : ecosystem.avgHunger >= 45
        ? 'text-[#ffe394]'
        : 'text-[#ff9b9b]';

  return (
    <div className="space-y-3">
      {/* Local Map Food & Hunger Overview */}
      <div className="rounded-xl border border-[#72c4d6]/35 bg-[#0d2a3b]/75 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/40"
              style={{ backgroundColor: foodInfo.pelletColor }}
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">
                {getMapFoodName(habId)}
              </div>
              <div className="text-[11px] text-[#9ecbd9]">
                {mapLabel} · {t('FEED_AVG_HUNGER')}:{' '}
                <span className={`font-bold tabular-nums ${hungerTone}`}>
                  {ecosystem.avgHunger}%
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => engine.feedFish()}
            disabled={activeMapState.manualFeedCharges <= 0}
            className={`pixel-btn min-h-[38px] shrink-0 flex items-center gap-1.5 rounded-lg px-3 text-xs font-bold whitespace-nowrap ${
              activeMapState.manualFeedCharges > 0
                ? 'bg-[#d98c2b] text-white hover:bg-[#eb9c38]'
                : 'bg-[#173645] text-[#7ca3b3] cursor-not-allowed'
            }`}
          >
            <Utensils className="h-3.5 w-3.5" />
            <span>
              {t('UI_FEED')} ({activeMapState.manualFeedCharges}/{maxCharges})
            </span>
          </button>
        </div>

        {/* Manual Feed Energy & Starvation Alert */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#9ecbd9] tabular-nums">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-[#ffe394]" />
            {nextChargeSec > 0
              ? `${t('FEED_RECHARGE')}: ${t('UI_SEC_SHORT', { sec: nextChargeSec })}`
              : t('FEED_ENERGY_FULL')}
          </span>
          <span className="text-[#8df5da]">
            {t('FEED_ACTIVE_BONUS')}
          </span>
        </div>

        {(ecosystem.starvingFishCount > 0 || ecosystem.criticalFishCount > 0) && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-[#ff9b9b]/45 bg-[#4a1c24]/60 px-2.5 py-1.5 text-[11px] font-semibold text-[#ffd1d1]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#ff9b9b]" />
            <span>
              {ecosystem.criticalFishCount > 0
                ? tPlural('FEED_ALERT_CRITICAL', ecosystem.criticalFishCount)
                : tPlural('FEED_ALERT_STARVING', ecosystem.starvingFishCount)}
            </span>
          </div>
        )}
      </div>

      {/* Local Food Storage & Quick Buy */}
      <div className="rounded-xl border border-[#5ba6ba]/30 bg-[#103044]/68 p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Package className="h-4 w-4 text-[#8df5da]" />
            <span>
              {t('FEED_STORAGE')} {t('UI_LEVEL_SHORT')}{activeMapState.foodStorageLevel}/{MAX_FOOD_STORAGE_LEVEL}
            </span>
          </div>
          <span className="font-bold text-[#ffe694] tabular-nums">
            {formatNumber(foodStored)} / {formatNumber(storageCap)}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-[#081c28]">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${storagePct}%`,
              backgroundColor: storagePct < 20 ? '#ff8b8b' : foodInfo.pelletColor,
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => engine.buyFoodPack()}
            disabled={!canBuyPack}
            className={`pixel-btn min-h-[38px] rounded-lg px-2.5 text-xs font-bold tabular-nums ${
              canBuyPack
                ? 'bg-[#2d8c7c] text-white hover:bg-[#37a391]'
                : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
            }`}
          >
            +{formatNumber(packSize)} · {formatNumber(packCost)} {t('UI_COINS')}
          </button>

          <button
            type="button"
            onClick={() => engine.upgradeFoodStorage()}
            disabled={!canUpgradeStorage}
            className={`pixel-btn min-h-[38px] rounded-lg px-2.5 text-xs font-bold tabular-nums ${
              canUpgradeStorage
                ? 'bg-[#2a7d91] text-white hover:bg-[#3393ab]'
                : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
            }`}
          >
            {storageMaxed
              ? t('UI_MAXED')
              : `${t('UI_UPGRADE')} · ${formatNumber(storageCost)}`}
          </button>
        </div>
      </div>

      {/* Local Food Factory */}
      <div className="rounded-xl border border-[#5ba6ba]/30 bg-[#103044]/68 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Factory className="h-4 w-4 text-[#9be7ff]" />
              <span>
                {t('FEED_FACTORY')} {t('UI_LEVEL_SHORT')}{activeMapState.foodFactoryLevel}/{MAX_FOOD_FACTORY_LEVEL}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-[#9ecbd9] tabular-nums">
              +{factoryRate}{t('UI_PER_MIN')} · -{consumptionRate}{t('UI_PER_MIN')} ·{' '}
              <span className={netRate >= 0 ? 'text-[#8df5da] font-semibold' : 'text-[#ff9b9b] font-semibold'}>
                {t('FEED_NET_RATE', { rate: netRate >= 0 ? `+${netRate}` : String(netRate) })}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => engine.upgradeFoodFactory()}
            disabled={!canUpgradeFactory}
            className={`pixel-btn min-h-[38px] shrink-0 rounded-lg px-3 text-xs font-bold tabular-nums whitespace-nowrap ${
              canUpgradeFactory
                ? 'bg-[#2a7d91] text-white hover:bg-[#3393ab]'
                : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
            }`}
          >
            {factoryMaxed
              ? t('UI_MAXED')
              : `${t('UI_UPGRADE')} · ${formatNumber(factoryCost)}`}
          </button>
        </div>
      </div>

      {/* Per-Map Auto Feeder Machine */}
      <div className="rounded-xl border border-[#7adbc4]/35 bg-[#0e3242]/75 p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-bold text-white">
              <Bot className="h-4 w-4 text-[#8df5da]" />
              <span>
                {t('FEED_AUTO_FEEDER')}{' '}
                {autoStats.enabled
                  ? `${t('UI_LEVEL_SHORT')}${autoStats.level}/${MAX_AUTO_FEEDER_LEVEL}`
                  : `(${t('UI_OFF')})`}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#9ecbd9] tabular-nums">
              {autoStats.enabled
                ? t('FEED_AUTO_SUMMARY', {
                    sec: autoStats.intervalSec,
                    ceiling: autoStats.targetHungerCeiling,
                    max: autoStats.maxTargetsPerPulse,
                    pct: autoStats.offlineNutritionPct,
                  })
                : t('FEED_AUTO_DESC_OFF')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => engine.upgradeAutoFeeder()}
            disabled={!canUpgradeAuto}
            className={`pixel-btn min-h-[38px] shrink-0 rounded-lg px-3 text-xs font-bold tabular-nums whitespace-nowrap ${
              canUpgradeAuto
                ? 'bg-[#d98c2b] text-white hover:bg-[#eb9c38]'
                : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
            }`}
          >
            {autoMaxed
              ? t('UI_MAXED')
              : `${autoStats.enabled ? t('UI_UPGRADE') : t('UI_UNLOCK')} · ${formatNumber(autoCost.coins)}${
                  autoCost.tokens > 0 ? ` + ${autoCost.tokens}${t('UI_TOKEN_SHORT')}` : ''
                }`}
          </button>
        </div>

        {/* 7-Node Local Auto Feeder Upgrade Tree */}
        <div className="space-y-1.5 border-t border-[#5ba6ba]/20 pt-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#ffe694]">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {t('FEED_AUTO_TREE')}
            </span>
            <span className="text-[#9be7ff] tabular-nums">
              {formatNumber(activeMapState.mapTokens)} {getHabitatToken(habitat)}
            </span>
          </div>

          {AUTO_FEEDER_UPGRADE_TREE.map((node) => {
            const lv = activeMapState.autoFeederUpgrades[node.id] ?? 0;
            const maxed = lv >= node.maxLevel;
            const reqMet = activeMapState.autoFeederLevel >= node.minAutoFeederLevel;
            const cost = getAutoFeederTreeCost(node.id, lv, habId);
            const canBuy =
              reqMet &&
              !maxed &&
              state.coins >= cost.coins &&
              activeMapState.mapTokens >= cost.tokens;

            return (
              <div
                key={node.id}
                className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${
                  reqMet
                    ? 'border-[#5ba6ba]/25 bg-[#092130]/65'
                    : 'border-[#3c6575]/20 bg-[#071824]/50 opacity-70'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <span className="truncate">{getAutoFeederNodeName(node.id)}</span>
                    <span className="text-[10px] text-[#8df5da] tabular-nums shrink-0">
                      {t('UI_LEVEL_SHORT')}{lv}/{node.maxLevel}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#9ecbd9] leading-snug">
                    {reqMet
                      ? getAutoFeederNodeDescription(node.id)
                      : t('FEED_AUTO_REQUIRES', { level: node.minAutoFeederLevel })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => engine.upgradeAutoFeederTree(node.id)}
                  disabled={!canBuy}
                  className={`pixel-btn min-h-[32px] shrink-0 rounded-lg px-2.5 text-[11px] font-bold tabular-nums whitespace-nowrap ${
                    maxed
                      ? 'bg-[#17403a] text-[#8df5da] cursor-default'
                      : canBuy
                        ? 'bg-[#2d8c7c] text-white hover:bg-[#37a391]'
                        : 'bg-[#173645] text-[#6d95a3] cursor-not-allowed'
                  }`}
                >
                  {maxed
                    ? t('UI_MAXED')
                    : `${formatNumber(cost.coins)}${cost.tokens > 0 ? ` + ${cost.tokens}${t('UI_TOKEN_SHORT')}` : ''}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
