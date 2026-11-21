import React, { useState } from 'react';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { MISSION_BY_ID } from '../../game/data/missionCatalog';
import { EVENT_CATALOG } from '../../game/data/eventCatalog';
import { IAPService } from '../../game/services/IAPService';
import { useLocalization } from '../../game/localization/LocalizationManager';
import { Check, PlayCircle, Sparkles, ShoppingBag, Calendar } from 'lucide-react';

interface MissionsPanelProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export const MissionsPanel: React.FC<MissionsPanelProps> = ({ engine, snapshot }) => {
  const { state } = snapshot;
  const [subTab, setSubTab] = useState<'missions' | 'boosts' | 'shop'>('missions');
  const {
    t,
    formatNumber,
    formatDuration,
    getEventName,
    getEventObjective,
    getEventReward,
    getMissionTitle,
    getMissionDescription,
    getMissionReward,
    getIapName,
    getIapDescription,
    getIapTag,
  } = useLocalization();

  const adBoostRemainingSec = Math.max(0, Math.floor((state.adBoostEndsAt - Date.now()) / 1000));
  const products = IAPService.getProducts();
  const activeEvent = EVENT_CATALOG.find((e) => e.active) ?? EVENT_CATALOG[0];
  const eventPct = Math.min(100, Math.round((state.weeklyEventProgress / activeEvent.target) * 100));
  const eventReady = !state.weeklyEventClaimed && state.weeklyEventProgress >= activeEvent.target;

  return (
    <div className="flex flex-col gap-3">
      {/* Clean Sub-Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#091c29]/75 p-1">
        <button
          type="button"
          onClick={() => setSubTab('missions')}
          className={`min-h-[36px] rounded-lg px-1 text-xs font-semibold truncate ${
            subTab === 'missions' ? 'bg-[#1e5c6b] text-white' : 'text-[#97c4d4] hover:text-white'
          }`}
        >
          {t('MISSIONS_TAB_QUESTS')}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('boosts')}
          className={`min-h-[36px] rounded-lg px-1 text-xs font-semibold truncate ${
            subTab === 'boosts' ? 'bg-[#1e5c6b] text-white' : 'text-[#97c4d4] hover:text-white'
          }`}
        >
          {t('MISSIONS_TAB_BOOSTS')}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('shop')}
          className={`min-h-[36px] rounded-lg px-1 text-xs font-semibold truncate ${
            subTab === 'shop' ? 'bg-[#1e5c6b] text-white' : 'text-[#97c4d4] hover:text-white'
          }`}
        >
          {t('MISSIONS_TAB_SHOP')}
        </button>
      </div>

      {/* Daily Missions + Active Weekly Challenge */}
      {subTab === 'missions' && (
        <div className="space-y-3">
          {/* Active Weekly Event Card */}
          <div className="rounded-xl border border-[#7be3d4]/45 bg-[#103847]/75 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#8df5da]">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {t('EVENT_WEEKLY_HEADER', { name: getEventName(activeEvent) })}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#d6f4fc]">{getEventObjective(activeEvent)}</p>
                <div className="mt-1 text-[11px] font-semibold text-[#ffe694]">
                  {t('UI_REWARD_PREFIX', { reward: getEventReward(activeEvent) })}
                </div>
              </div>

              {state.weeklyEventClaimed ? (
                <span className="flex items-center gap-1 text-xs font-bold text-[#8df5da] shrink-0">
                  <Check className="h-4 w-4" />
                  {t('UI_CLAIMED')}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!eventReady}
                  onClick={() => engine.claimWeeklyEvent()}
                  className={`pixel-btn min-h-[36px] shrink-0 rounded-lg px-3 text-xs font-bold tabular-nums ${
                    eventReady
                      ? 'bg-[#d98c2b] text-white hover:bg-[#eb9c38]'
                      : 'bg-[#143345] text-[#7ca3b3]'
                  }`}
                >
                  {eventReady
                    ? t('UI_CLAIM')
                    : `${Math.min(state.weeklyEventProgress, activeEvent.target)}/${activeEvent.target}`}
                </button>
              )}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#0a212e]">
              <div
                className="h-full bg-[#7be3d4]"
                style={{ width: `${eventPct}%` }}
              />
            </div>
          </div>

          {/* Daily Checklist */}
          <div className="space-y-2">
            {state.dailyMissions.map((active) => {
              const def = MISSION_BY_ID[active.missionId];
              if (!def) return null;
              const pct = Math.min(100, Math.round((active.progress / def.target) * 100));
              const ready = !active.claimed && active.progress >= def.target;

              return (
                <div
                  key={active.missionId}
                  className="rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white">{getMissionTitle(def)}</h4>
                      <p className="text-xs text-[#9ecbd9]">{getMissionDescription(def)}</p>
                      <div className="mt-1 text-[11px] font-semibold text-[#ffe694]">
                        {t('UI_REWARD_PREFIX', { reward: getMissionReward(def) })}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {active.claimed ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-[#7ae0c6]">
                          <Check className="h-4 w-4" /> {t('UI_DONE')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => engine.claimMission(active.missionId)}
                          disabled={!ready}
                          className={`pixel-btn min-h-[38px] min-w-[74px] rounded-lg px-3 text-xs font-bold ${
                            ready
                              ? 'bg-[#d98c2b] text-white hover:bg-[#eb9c38]'
                              : 'bg-[#143345] text-[#7ca3b3]'
                          }`}
                        >
                          {ready ? t('UI_CLAIM') : `${pct}%`}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0a212e]">
                      <div
                        className="h-full bg-[#5bd4c0] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#8db8c7] tabular-nums">
                      {formatNumber(Math.floor(active.progress))}/{formatNumber(def.target)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional Rewarded Ad Boosts */}
      {subTab === 'boosts' && (
        <div className="space-y-2.5">
          <p className="text-xs text-[#9ecbd9]">
            {t('BOOSTS_SUBTITLE')}
            {state.adRemoved && (
              <span className="ml-1 font-semibold text-[#8df5da]">
                {t('BOOSTS_AD_FREE_ACTIVE')}
              </span>
            )}
          </p>

          <div className="rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 p-3 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                <Sparkles className="h-4 w-4 text-[#ffe38a]" />
                <span>{t('BOOST_2X_TITLE')}</span>
              </div>
              <p className="mt-0.5 text-xs text-[#9ecbd9]">
                {adBoostRemainingSec > 0
                  ? t('BOOST_2X_ACTIVE_REMAINING', {
                      duration: formatDuration(adBoostRemainingSec),
                    })
                  : t('BOOST_2X_DESC')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => engine.triggerIncomeBoostAd()}
              className="pixel-btn min-h-[42px] shrink-0 flex items-center gap-1.5 rounded-lg bg-[#2c8a7a] px-3 text-xs font-bold text-white hover:bg-[#35a18f] whitespace-nowrap"
            >
              <PlayCircle className="h-4 w-4" />
              <span>{state.adRemoved ? t('UI_ACTIVATE') : t('UI_WATCH_AD')}</span>
            </button>
          </div>

          <div className="rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 p-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white">{t('BOOST_RARE_TITLE')}</h4>
              <p className="mt-0.5 text-xs text-[#9ecbd9]">{t('BOOST_RARE_DESC')}</p>
            </div>
            <button
              type="button"
              onClick={() => engine.triggerRareDiscoverAd()}
              className="pixel-btn min-h-[42px] shrink-0 flex items-center gap-1.5 rounded-lg bg-[#2e7da6] px-3 text-xs font-bold text-white hover:bg-[#3a96c4] whitespace-nowrap"
            >
              <PlayCircle className="h-4 w-4" />
              <span>{state.adRemoved ? t('UI_DISCOVER') : t('UI_WATCH_AD')}</span>
            </button>
          </div>

          <div className="rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 p-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white">{t('BOOST_TIDE_TITLE')}</h4>
              <p className="mt-0.5 text-xs text-[#9ecbd9]">{t('BOOST_TIDE_DESC')}</p>
            </div>
            <button
              type="button"
              onClick={() => engine.triggerBonusCoinsAd()}
              className="pixel-btn min-h-[42px] shrink-0 flex items-center gap-1.5 rounded-lg bg-[#d98c2b] px-3 text-xs font-bold text-white hover:bg-[#eb9c38] whitespace-nowrap"
            >
              <PlayCircle className="h-4 w-4" />
              <span>{state.adRemoved ? t('UI_CLAIM') : t('UI_WATCH_AD')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Placeholder IAP Store */}
      {subTab === 'shop' && (
        <div className="space-y-2.5">
          <p className="text-xs text-[#9ecbd9]">{t('SHOP_PROTOTYPE_NOTICE')}</p>
          {products.map((p) => {
            const alreadyOwned = Boolean(p.removesAds && state.adRemoved);
            const localizedTag = getIapTag(p.id);
            return (
              <div
                key={p.id}
                className="rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-3.5 w-3.5 text-[#8eeeff] shrink-0" />
                    <h4 className="text-sm font-bold text-white">{getIapName(p.id)}</h4>
                    {localizedTag && (
                      <span className="text-[11px] font-semibold text-[#ffe694]">
                        · {localizedTag}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#9ecbd9]">{getIapDescription(p.id)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => engine.purchaseIAP(p.id)}
                  disabled={alreadyOwned}
                  className={`pixel-btn min-h-[40px] min-w-[76px] shrink-0 rounded-lg px-3 text-xs font-bold tabular-nums ${
                    alreadyOwned
                      ? 'bg-[#173d40] text-[#7ce3cc]'
                      : 'bg-[#2c8a7a] text-white hover:bg-[#35a18f]'
                  }`}
                >
                  {alreadyOwned ? t('UI_OWNED') : p.priceDisplay}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
