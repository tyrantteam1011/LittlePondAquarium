import React from 'react';
import { EngineSnapshot } from '../game/core/GameEngine';

interface FeedbackOverlayProps {
  snapshot: EngineSnapshot;
}

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ snapshot }) => {
  const { popups, flyingCoins, toastMessage } = snapshot;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {/* Floating Number & Reward Popups */}
      {popups.map((p) => {
        const colorClass =
          p.kind === 'coin'
            ? 'text-[#ffe68a]'
            : p.kind === 'gem'
              ? 'text-[#9bf5ff]'
              : p.kind === 'beauty'
                ? 'text-[#9effd6]'
                : p.kind === 'rp'
                  ? 'text-[#c9ffe0]'
                  : p.kind === 'warning'
                    ? 'text-[#ffb5b5]'
                    : 'text-white';
        return (
          <div
            key={p.id}
            className={`animate-float-up absolute font-pixel text-xs sm:text-sm font-bold drop-shadow-[0_2px_2px_rgba(4,16,26,0.95)] whitespace-nowrap ${colorClass}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {p.text}
          </div>
        );
      })}

      {/* Flying Pixel Coins toward Top-Left Currency Counter */}
      {flyingCoins.map((c) => {
        const tx = `${Math.round(14 - c.startX)}vw`;
        const ty = `${Math.round(4 - c.startY)}vh`;
        return (
          <div
            key={c.id}
            className="animate-coin-fly absolute h-3.5 w-3.5 rounded-sm border border-[#734a12] bg-[#ffd452] shadow-md"
            style={
              {
                left: `${c.startX}%`,
                top: `${c.startY}%`,
                '--tx': tx,
                '--ty': ty,
              } as React.CSSProperties
            }
          />
        );
      })}

      {/* Translucent Cozy Toast */}
      {toastMessage && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 px-4">
          <div className="glass-panel rounded-xl border border-[#7adbc4]/55 px-4 py-2 text-xs sm:text-sm font-medium text-[#ebfbff] whitespace-nowrap">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
};
