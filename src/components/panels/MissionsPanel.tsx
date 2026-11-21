import React, { useState } from 'react';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { MISSION_BY_ID } from '../../game/data/missionCatalog';
import { EVENT_CATALOG } from '../../game/data/eventCatalog';
import { IAPService } from '../../game/services/IAPService';
import { formatDuration, formatNumber } from '../../game/core/GameConfig';
import { Check, PlayCircle, Sparkles, ShoppingBag, Calendar } from 'lucide-react';

interface MissionsPanelProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export const MissionsPanel: React.FC<MissionsPanelProps> = ({ engine, snapshot }) => {
  const { state } = snapshot;
  const [subTab, setSubTab] = useState<'missions' | 'boosts' | 'shop'>('missions');

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
          className={`min-h-[36px] rounded-lg text-xs font-semibold ${
            subTab === 'missions' ? 'bg-[#1e5c6b] text-white' : 'text-[#97c4d4] hover:text-white'
          }`}
        >
          Quests &amp; Events
        </button>
        <button
          type="button"
          onClick={() => setSubTab('boosts')}
          className={`min-h-[36px] rounded-lg text-xs font-semibold ${
            subTab === 'boosts' ? 'bg-[#1e5c6b] text-white' : 'text-[#97c4d4] hover:text-white'
          }`}
        >
          Bonus Boosts
        </button>
        <button
          type="button"
          onClick={() => setSubTab('shop')}
          className={`min-h-[36px] rounded-lg text-xs font-semibold ${
            subTab === 'shop' ? 'bg-[#1e5c6b] text-white' : 'text-[#97c4d4] hover:text-white'
          }`}
        >
          Gem Shop
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
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Weekly Event · {activeEvent.name}</span>
                </div>
                <p className="mt-0.5 text-xs text-[#d6f4fc]">{activeEvent.objectiveText}</p>
                <div className="mt-1 text-[11px] font-semibold text-[#ffe694]">
                  Reward: {activeEvent.rewardLabel}
                </div>
              </div>

              {state.weeklyEventClaimed ? (
                <span className="flex items-center gap-1 text-xs font-bold text-[#8df5da] shrink-0">
                  <Check className="h-4 w-4" />
                  Claimed
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
                    ? 'Claim'
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
                      <h4 className="text-sm font-bold text-white">{def.title}</h4>
                      <p className="text-xs text-[#9ecbd9]">{def.description}</p>
                      <div className="mt-1 text-[11px] font-semibold text-[#ffe694]">
                        Reward: {def.reward.label}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {active.claimed ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-[#7ae0c6]">
                          <Check className="h-4 w-4" /> Done
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
                          {ready ? 'Claim' : `${pct}%`}
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
            Optional cozy boosts — never required, always rewarding.
            {state.adRemoved && (
              <span className="ml-1 font-semibold text-[#8df5da]">
                Ad-Free active (instant rewards)!
              </span>
            )}
          </p>

          <div className="rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 p-3 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                <Sparkles className="h-4 w-4 text-[#ffe38a]" />
                <span>2× Income · 30 Minutes</span>
              </div>
              <p className="mt-0.5 text-xs text-[#9ecbd9]">
                {adBoostRemainingSec > 0
                  ? `Active now: ${formatDuration(adBoostRemainingSec)} remaining`
                  : 'Double all coin earnings across every habitat.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => engine.triggerIncomeBoostAd()}
              className="pixel-btn min-h-[42px] shrink-0 flex items-center gap-1.5 rounded-lg bg-[#2c8a7a] px-3 text-xs font-bold text-white hover:bg-[#35a18f] whitespace-nowrap"
            >
              <PlayCircle className="h-4 w-4" />
              <span>{state.adRemoved ? 'Activate' : 'Watch Ad'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 p-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white">Rare Fish Discovery</h4>
              <p className="mt-0.5 text-xs text-[#9ecbd9]">
                Attract an undiscovered species straight to your journal + Gems &amp; RP.
              </p>
            </div>
            <button
              type="button"
              onClick={() => engine.triggerRareDiscoverAd()}
              className="pixel-btn min-h-[42px] shrink-0 flex items-center gap-1.5 rounded-lg bg-[#2e7da6] px-3 text-xs font-bold text-white hover:bg-[#3a96c4] whitespace-nowrap"
            >
              <PlayCircle className="h-4 w-4" />
              <span>{state.adRemoved ? 'Discover' : 'Watch Ad'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 p-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white">Extra Tide Bonus</h4>
              <p className="mt-0.5 text-xs text-[#9ecbd9]">
                Collect 3 minutes of instant bonus aquarium coins right away.
              </p>
            </div>
            <button
              type="button"
              onClick={() => engine.triggerBonusCoinsAd()}
              className="pixel-btn min-h-[42px] shrink-0 flex items-center gap-1.5 rounded-lg bg-[#d98c2b] px-3 text-xs font-bold text-white hover:bg-[#eb9c38] whitespace-nowrap"
            >
              <PlayCircle className="h-4 w-4" />
              <span>{state.adRemoved ? 'Claim' : 'Watch Ad'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Placeholder IAP Store */}
      {subTab === 'shop' && (
        <div className="space-y-2.5">
          <p className="text-xs text-[#9ecbd9]">
            Prototype Store Interface (no real payments charged). Core aquarium progression is 100%
            playable free.
          </p>
          {products.map((p) => {
            const alreadyOwned = Boolean(p.removesAds && state.adRemoved);
            return (
              <div
                key={p.id}
                className="rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-3.5 w-3.5 text-[#8eeeff] shrink-0" />
                    <h4 className="text-sm font-bold text-white">{p.name}</h4>
                    {p.highlightTag && (
                      <span className="text-[11px] font-semibold text-[#ffe694]">
                        · {p.highlightTag}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#9ecbd9]">{p.description}</p>
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
                  {alreadyOwned ? 'Owned' : p.priceDisplay}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
