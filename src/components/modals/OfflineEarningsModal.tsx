import React from 'react';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { useLocalization } from '../../game/localization/LocalizationManager';
import { Clock, Droplets, FlaskConical, PlayCircle, Sparkles } from 'lucide-react';

interface OfflineEarningsModalProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export const OfflineEarningsModal: React.FC<OfflineEarningsModalProps> = ({
  engine,
  snapshot,
}) => {
  const { t, formatNumber, formatDuration, formatPercent } = useLocalization();
  const report = snapshot.offlineReport;
  if (!report) return null;

  const waterQuality = Math.round(report.waterQualityAtReturn);
  const waterTone =
    waterQuality >= 80
      ? 'text-[#8df5da]'
      : waterQuality >= 55
        ? 'text-[#ffe68a]'
        : 'text-[#ff9c8a]';

  const doubledAmount = `+${formatNumber(report.coinsEarned * 2)}`;

  return (
    <div className="glass-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-sm rounded-2xl border border-[#7adbc4]/55 p-5 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#7adbc4]/35 bg-[#123d52]/80 text-[#8df5da]">
          <Clock className="h-6 w-6" />
        </div>

        <h2 className="mt-3 font-pixel text-lg font-bold text-white">
          {t('OFFLINE_WELCOME_BACK')}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[#b7dfeb]">
          {t('OFFLINE_AWAY_DESC', { duration: formatDuration(report.awaySeconds) })}
        </p>

        {/* Primary Rewards Box */}
        <div className="mt-4 rounded-xl border border-[#74c6d9]/30 bg-[#071c29]/65 px-3.5 py-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#95cad9]">
            {t('OFFLINE_EARNINGS_LABEL')}
          </div>
          <div className="mt-1 font-pixel text-2xl font-bold text-[#ffe68a] tabular-nums">
            +{formatNumber(report.coinsEarned)} {t('UI_COINS')}
          </div>

          {report.researchPointsEarned > 0 && (
            <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs font-bold text-[#b8f2ff] tabular-nums">
              <FlaskConical className="h-3.5 w-3.5 text-[#7ce5ff]" />
              <span>
                +{formatNumber(report.researchPointsEarned)} {t('UI_RP')}
              </span>
            </div>
          )}

          {/* Ecosystem & Feeding Offline Summary Grid */}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#5ba6ba]/20 pt-3 text-left text-[11px]">
            <div className="rounded-lg bg-[#0d2a3d]/70 px-2.5 py-1.5">
              <div className="truncate text-[#8cbccf]">{t('OFFLINE_FISH_GROWN')}</div>
              <div className="font-bold text-white tabular-nums">
                {report.fishGrewCount > 0 ? `+${report.fishGrewCount}` : '—'}
              </div>
            </div>
            <div className="rounded-lg bg-[#0d2a3d]/70 px-2.5 py-1.5">
              <div className="truncate text-[#8cbccf]">{t('OFFLINE_NEW_BABIES')}</div>
              <div className="font-bold text-[#a8f5d9] tabular-nums">
                {report.fishBornCount > 0 ? `+${report.fishBornCount}` : '—'}
              </div>
            </div>
            <div className="rounded-lg bg-[#0d2a3d]/70 px-2.5 py-1.5">
              <div className="truncate text-[#8cbccf]">{t('OFFLINE_FOOD_USED')}</div>
              <div className="font-bold text-[#ffe68a] tabular-nums">
                {report.foodUsed > 0 ? `-${formatNumber(report.foodUsed)}` : '0'}
              </div>
            </div>
            <div className="rounded-lg bg-[#0d2a3d]/70 px-2.5 py-1.5">
              <div className="truncate text-[#8cbccf]">{t('OFFLINE_FISH_FED')}</div>
              <div className="font-bold text-[#9be7ff] tabular-nums">
                {report.fishFedCount > 0 ? `${report.fishFedCount}×` : '—'} ·{' '}
                {formatPercent(report.avgHungerAtReturn)}
              </div>
            </div>
            <div className="rounded-lg bg-[#0d2a3d]/70 px-2.5 py-1.5">
              <div className="flex items-center gap-1 text-[#8cbccf]">
                <Droplets className="h-3 w-3 shrink-0" />
                <span className="truncate">{t('UI_WATER_QUALITY')}</span>
              </div>
              <div className={`font-bold tabular-nums ${waterTone}`}>
                {formatPercent(waterQuality)}
              </div>
            </div>
            <div className="rounded-lg bg-[#0d2a3d]/70 px-2.5 py-1.5">
              <div className="truncate text-[#8cbccf]">{t('UI_BEAUTY')}</div>
              <div className="font-bold text-[#ffe68a] tabular-nums">
                {formatPercent(report.ecosystemEfficiency * 100)}
              </div>
            </div>
          </div>

          <div
            className={`mt-2.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
              report.needsAttention
                ? 'bg-[#4f3425]/75 text-[#ffd0a6]'
                : 'bg-[#133e3a]/75 text-[#8df5da]'
            }`}
          >
            {report.needsAttention ? t('OFFLINE_NEEDS_ATTENTION') : t('OFFLINE_ALL_HEALTHY')}
          </div>

          {report.newDiscoveryName && (
            <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-[#164054]/75 px-2.5 py-1.5 text-[11px] font-semibold text-[#ffe68a]">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{report.newDiscoveryName}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => engine.claimOfflineEarnings(false)}
            className="pixel-btn min-h-[46px] w-full rounded-xl bg-[#2c8a7a] px-3 text-sm font-bold text-white hover:bg-[#35a18f]"
          >
            {t('UI_CLAIM_EARNINGS')}
          </button>

          <button
            type="button"
            onClick={() => engine.claimOfflineDoubledWithAd()}
            className="pixel-btn min-h-[46px] w-full flex items-center justify-center gap-2 rounded-xl bg-[#d98c2b] px-3 text-sm font-bold text-white hover:bg-[#eb9c38]"
          >
            <PlayCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {snapshot.state.adRemoved
                ? `${t('UI_CLAIM')} 2× (${doubledAmount})`
                : t('OFFLINE_WATCH_AD_2X', { amount: doubledAmount })}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
