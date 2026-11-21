import React, { useState } from 'react';
import { LocaleId, SUPPORTED_LANGUAGES } from '../../game/localization/types';
import { useLocalization } from '../../game/localization/LocalizationManager';
import { AudioService } from '../../game/services/AudioService';
import { Globe, Check } from 'lucide-react';

/**
 * First-Launch Language Selection Screen
 * Translucent pixel-glass modal floating over the living aquarium so new players
 * immediately see the underwater world while picking their native language.
 */
export const LanguageSelectionModal: React.FC = () => {
  const { locale, hasSelectedLanguage, setLocale, confirmLanguage, t } = useLocalization();
  const [picked, setPicked] = useState<LocaleId>(locale);

  if (hasSelectedLanguage) return null;

  const handleSelectOption = (nextLocale: LocaleId) => {
    AudioService.playClick();
    setPicked(nextLocale);
    // Live-preview the selected language immediately without dismissing the modal yet
    setLocale(nextLocale);
  };

  const handleConfirm = () => {
    AudioService.playReward();
    confirmLanguage(picked);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('LANG_SELECT_TITLE')}
      className="glass-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div className="glass-panel w-full max-w-md rounded-2xl border border-[#84e3d2]/60 p-5 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#84e3d2]/40 bg-[#123d52]/80 text-[#8df5da]">
            <Globe className="h-6 w-6" />
          </div>

          <h1 className="mt-3 font-pixel text-lg sm:text-xl font-bold text-white">
            {t('LANG_SELECT_TITLE')}
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-[#b7dfeb]">
            {t('LANG_SELECT_SUBTITLE')}
          </p>
        </div>

        {/* 6 Supported Languages in their own native names */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = picked === lang.id;
            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => handleSelectOption(lang.id)}
                className={`min-h-[48px] flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                  isSelected
                    ? 'border-[#8df5da] bg-[#1e5c6b]/90 text-white shadow-md'
                    : 'border-[#5ea8bc]/30 bg-[#0b2738]/75 text-[#d4eef7] hover:border-[#84d8e8]/60 hover:bg-[#13384d]/85'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-base leading-none shrink-0" aria-hidden="true">
                    {lang.flag}
                  </span>
                  <span className="truncate text-xs sm:text-sm font-semibold">
                    {lang.nativeName}
                  </span>
                </div>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-[#8df5da]" />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="pixel-btn mt-4 min-h-[48px] w-full rounded-xl bg-[#2c8a7a] text-sm font-bold text-white hover:bg-[#35a18f]"
        >
          {t('UI_CONTINUE')}
        </button>
      </div>
    </div>
  );
};
