import React from 'react';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { FISH_BY_ID } from '../../game/data/fishCatalog';
import { DECORATION_BY_ID } from '../../game/data/decorationCatalog';
import { useLocalization } from '../../game/localization/LocalizationManager';
import { SpritePreview } from '../SpritePreview';
import { Sparkles } from 'lucide-react';

interface LevelUpModalProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ engine, snapshot }) => {
  const { t, formatNumber, getFishName, getDecorationName } = useLocalization();
  const modal = snapshot.levelUpModal;
  if (!modal) return null;

  return (
    <div className="glass-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-sm rounded-2xl border border-[#8df0d7]/65 p-5 text-center shadow-2xl">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#8df5da]">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{t('LEVEL_UP_TITLE')}</span>
        </div>

        <h2 className="mt-2 font-pixel text-2xl font-bold text-white tabular-nums">
          {t('UI_LEVEL_SHORT')} {modal.fromLevel} → {t('UI_LEVEL_SHORT')} {modal.toLevel}
        </h2>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold tabular-nums">
          {modal.gemBonus > 0 && (
            <span className="text-[#9bf5ff]">
              +{formatNumber(modal.gemBonus)} {t('UI_GEMS')}
            </span>
          )}
          {modal.rpBonus > 0 && (
            <span className="text-[#b8f2ff]">
              +{formatNumber(modal.rpBonus)} {t('UI_RP')}
            </span>
          )}
          <span className="text-[#8df5da]">+6%</span>
        </div>

        {(modal.unlockedFishIds.length > 0 || modal.unlockedDecorationIds.length > 0) && (
          <div className="mt-4 rounded-xl border border-[#6cb8cc]/25 bg-[#081d2b]/65 p-3 text-left">
            <div className="mb-2 text-xs font-bold text-[#ffe68a]">
              {t('LEVEL_UP_NEW_UNLOCKS')}
            </div>
            <div className="flex flex-wrap gap-2">
              {modal.unlockedFishIds.map((fid) => {
                const f = FISH_BY_ID[fid];
                if (!f) return null;
                return (
                  <div
                    key={fid}
                    className="flex items-center gap-1.5 rounded-lg border border-[#63b3c7]/25 bg-[#103447]/80 px-2 py-1 text-xs text-white"
                  >
                    <SpritePreview kind="fish" id={fid} size={28} />
                    <span>{getFishName(f)}</span>
                  </div>
                );
              })}
              {modal.unlockedDecorationIds.map((did) => {
                const d = DECORATION_BY_ID[did];
                if (!d) return null;
                return (
                  <div
                    key={did}
                    className="flex items-center gap-1.5 rounded-lg border border-[#63b3c7]/25 bg-[#103447]/80 px-2 py-1 text-xs text-white"
                  >
                    <SpritePreview kind="decoration" id={did} size={28} />
                    <span>{getDecorationName(d)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => engine.closeLevelUpModal()}
          className="pixel-btn mt-4 min-h-[46px] w-full rounded-xl bg-[#2c8a7a] px-3 text-sm font-bold text-white hover:bg-[#35a18f]"
        >
          {t('LEVEL_UP_CTA')}
        </button>
      </div>
    </div>
  );
};
