import React from 'react';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { FISH_BY_ID } from '../../game/data/fishCatalog';
import { GeneticVariant } from '../../game/core/types';
import { useLocalization } from '../../game/localization/LocalizationManager';
import { SpritePreview } from '../SpritePreview';
import { Sparkles } from 'lucide-react';

interface DiscoveryModalProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export const DiscoveryModal: React.FC<DiscoveryModalProps> = ({ engine, snapshot }) => {
  const {
    t,
    formatNumber,
    getFishName,
    getFishDescription,
    getFishNote,
    getFishHabitat,
    getFishDiet,
    getRarityLabel,
    getVariantLabel,
  } = useLocalization();
  const modal = snapshot.discoveryModal;
  if (!modal) return null;
  const fish = FISH_BY_ID[modal.fishId];
  if (!fish) return null;

  const variant: GeneticVariant = modal.variant ?? 'normal';
  const isRareMorph = variant !== 'normal';
  const fishName = getFishName(fish);
  const variantLabel = getVariantLabel(variant);

  return (
    <div className="glass-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-sm rounded-2xl border border-[#ffe28a]/65 p-5 text-center shadow-2xl">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#ffe68a]">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{t('DISCOVERY_NEW_SPECIES')}</span>
        </div>

        <h2 className="mt-1.5 font-pixel text-xl font-bold text-white">
          {isRareMorph ? `${variantLabel} · ${fishName}` : fishName}
        </h2>
        <div className="mt-0.5 text-xs font-semibold text-[#98d9eb] tabular-nums">
          {getRarityLabel(fish.rarity)}
          {isRareMorph ? ` · ${variantLabel}` : ''} · +{formatNumber(fish.baseIncome)}/s
        </div>
        <div className="mt-0.5 text-[11px] text-[#8df5da]">
          {getFishHabitat(fish)} · {getFishDiet(fish.dietType)}
        </div>
        <div className="mt-0.5 text-[11px] italic text-[#7fb5c7]">{fish.scientificName}</div>

        <div className="mx-auto my-4 flex h-28 w-28 items-center justify-center rounded-2xl border border-[#7adbc4]/45 bg-[#0a2638]/75">
          <SpritePreview kind="fish" id={fish.id} variant={variant} size={96} />
        </div>

        <p className="text-xs leading-relaxed text-[#ccebf5]">{getFishDescription(fish)}</p>
        <p className="mt-1.5 text-[11px] leading-snug text-[#8bbccf]">
          {t('UI_NOTE')}: {getFishNote(fish)}
        </p>

        {(modal.bonusGems > 0 || modal.bonusCoins > 0 || modal.bonusRp > 0) && (
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-[#6cb8cc]/25 bg-[#081d2b]/65 px-3 py-2 text-xs font-bold tabular-nums">
            {modal.bonusGems > 0 && (
              <span className="text-[#9bf5ff]">
                +{formatNumber(modal.bonusGems)} {t('UI_GEMS')}
              </span>
            )}
            {modal.bonusCoins > 0 && (
              <span className="text-[#ffe68a]">
                +{formatNumber(modal.bonusCoins)} {t('UI_COINS')}
              </span>
            )}
            {modal.bonusRp > 0 && (
              <span className="text-[#b8f2ff]">
                +{formatNumber(modal.bonusRp)} {t('UI_RP')}
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => engine.closeDiscoveryModal()}
          className="pixel-btn mt-4 min-h-[46px] w-full rounded-xl bg-[#2c8a7a] px-3 text-sm font-bold text-white hover:bg-[#35a18f]"
        >
          {t('DISCOVERY_COLLECT_BTN')}
        </button>
      </div>
    </div>
  );
};
