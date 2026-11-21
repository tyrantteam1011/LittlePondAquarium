import React, { useEffect, useState } from 'react';
import { AdRequest, AdsService } from '../../game/services/AdsService';
import { PlayCircle } from 'lucide-react';

export const AdSimulationModal: React.FC = () => {
  const [request, setRequest] = useState<AdRequest | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    return AdsService.subscribe((req) => {
      setRequest(req);
      if (req) setSecondsLeft(req.durationSeconds);
    });
  }, []);

  useEffect(() => {
    if (!request || secondsLeft <= 0) return;
    const timer = window.setTimeout(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [request, secondsLeft]);

  if (!request) return null;

  const readyToClaim = secondsLeft <= 0;
  const progressPct = Math.round(
    ((request.durationSeconds - secondsLeft) / Math.max(1, request.durationSeconds)) * 100
  );

  return (
    <div className="glass-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-sm rounded-2xl border border-[#f2d072]/60 p-5 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#f2d072]/35 bg-[#234354]/80 text-[#ffe68a]">
          <PlayCircle className="h-6 w-6" />
        </div>
        <div className="mt-2 text-[11px] font-semibold text-[#98c8d6]">
          Rewarded Ad Preview
        </div>
        <h3 className="mt-1 font-pixel text-base font-bold text-white">
          {request.title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[#cdebf5]">
          {request.rewardDescription}
        </p>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#133245]/85">
          <div
            className="h-full bg-[#f5c754] transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => AdsService.cancelCurrentAd()}
            className="min-h-[44px] flex-1 rounded-xl border border-[#5ba6ba]/25 bg-[#123042]/80 text-xs font-semibold text-[#b3d9e6] hover:bg-[#1a4359]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!readyToClaim}
            onClick={() => AdsService.completeCurrentAd()}
            className={`pixel-btn min-h-[44px] flex-[2] rounded-xl text-xs font-bold tabular-nums ${
              readyToClaim
                ? 'bg-[#2c8a7a] text-white hover:bg-[#35a18f]'
                : 'cursor-wait bg-[#16384a]/80 text-[#86b0bf]'
            }`}
          >
            {readyToClaim ? 'Claim Reward' : `Reward ready in ${secondsLeft}s...`}
          </button>
        </div>
      </div>
    </div>
  );
};
