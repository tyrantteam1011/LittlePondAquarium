import React, { useState } from 'react';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { GAME_CONFIG } from '../../game/core/GameConfig';
import { HABITAT_CATALOG } from '../../game/data/habitatCatalog';
import { SaveManager } from '../../game/services/SaveManager';
import { SUPPORTED_LANGUAGES } from '../../game/localization/types';
import { useLocalization } from '../../game/localization/LocalizationManager';
import { Check, Globe, Monitor, RotateCcw } from 'lucide-react';
import { DisplaySizePreference } from '../../game/core/types';
import { ViewportMetrics } from '../../game/layout/layoutConfig';

interface SettingsPanelProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
  viewport: ViewportMetrics;
}

const DISPLAY_SIZE_OPTIONS: { id: DisplaySizePreference; labelKey: string }[] = [
  { id: 'smaller', labelKey: 'SETTINGS_DISPLAY_SIZE_SMALLER' },
  { id: 'auto', labelKey: 'SETTINGS_DISPLAY_SIZE_AUTO' },
  { id: 'larger', labelKey: 'SETTINGS_DISPLAY_SIZE_LARGER' },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ engine, snapshot, viewport }) => {
  const { state } = snapshot;
  const { locale, setLocale, t } = useLocalization();
  const [confirmReset, setConfirmReset] = useState(false);
  const [copiedSave, setCopiedSave] = useState(false);

  const handleCopySave = () => {
    const encoded = SaveManager.exportSave(state);
    navigator.clipboard?.writeText(encoded).catch(() => {});
    setCopiedSave(true);
    window.setTimeout(() => setCopiedSave(false), 2000);
  };

  const currentDisplaySize: DisplaySizePreference = state.settings.displaySize ?? 'auto';

  return (
    <div className="flex flex-col gap-3">
      {/* Display Size (Integer Pixel Scale Tier Shift ±1) */}
      <div className="rounded-xl border border-[#72c4d6]/35 bg-[#103044]/72 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-[#8df5da]" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">{t('SETTINGS_DISPLAY_SIZE')}</div>
              <div className="text-[11px] leading-snug text-[#9ecbd9]">
                {t('SETTINGS_DISPLAY_SIZE_DESC')}
              </div>
            </div>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label={t('SETTINGS_DISPLAY_SIZE')}
          className="mt-2.5 grid grid-cols-3 gap-1.5"
        >
          {DISPLAY_SIZE_OPTIONS.map((opt) => {
            const isActive = currentDisplaySize === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => engine.updateSettings({ displaySize: opt.id })}
                className={`min-h-[44px] flex items-center justify-center rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-[#8df5da] bg-[#1a5666]/90 text-white shadow-sm'
                    : 'border-[#5ba6ba]/25 bg-[#0b2333]/75 text-[#cceaf5] hover:border-[#7ec8db]/55 hover:bg-[#13384d]/80'
                }`}
              >
                <span className="truncate">{t(opt.labelKey)}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 text-[11px] font-medium text-[#8fd9c8] tabular-nums">
          {t('SETTINGS_DISPLAY_SIZE_ACTIVE', {
            tier: viewport.effectiveTier,
            scale: viewport.worldScale,
          })}
        </div>
      </div>

      {/* Language Settings UI — Instant live switcher without resetting progress */}
      <div className="rounded-xl border border-[#72c4d6]/35 bg-[#103044]/72 p-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 shrink-0 text-[#8df5da]" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">{t('UI_LANGUAGE')}</div>
            <div className="text-[11px] leading-snug text-[#9ecbd9]">
              {t('SETTINGS_LANGUAGE_DESC')}
            </div>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = locale === lang.id;
            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLocale(lang.id)}
                className={`min-h-[44px] flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                  isActive
                    ? 'border-[#8df5da] bg-[#1a5666]/90 text-white shadow-sm'
                    : 'border-[#5ba6ba]/25 bg-[#0b2333]/75 text-[#cceaf5] hover:border-[#7ec8db]/55 hover:bg-[#13384d]/80'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-base leading-none shrink-0" aria-hidden="true">
                    {lang.flag}
                  </span>
                  <span className="truncate text-xs font-semibold">{lang.nativeName}</span>
                </div>
                {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-[#8df5da]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Audio & Accessibility Toggles */}
      <div className="divide-y divide-[#5ca6ba]/15 rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 px-3">
        <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{t('SETTINGS_SOUND')}</div>
            <div className="text-xs text-[#9ecbd9]">{t('SETTINGS_SOUND_DESC')}</div>
          </div>
          <input
            type="checkbox"
            checked={state.settings.soundEnabled}
            onChange={(e) => engine.updateSettings({ soundEnabled: e.target.checked })}
            className="h-5 w-5 shrink-0 accent-[#46c9b0]"
          />
        </label>

        <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{t('SETTINGS_AMBIENT')}</div>
            <div className="text-xs text-[#9ecbd9]">{t('SETTINGS_AMBIENT_DESC')}</div>
          </div>
          <input
            type="checkbox"
            checked={state.settings.ambientEnabled}
            onChange={(e) => engine.updateSettings({ ambientEnabled: e.target.checked })}
            className="h-5 w-5 shrink-0 accent-[#46c9b0]"
          />
        </label>

        <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{t('SETTINGS_REDUCED_MOTION')}</div>
            <div className="text-xs text-[#9ecbd9]">{t('SETTINGS_REDUCED_MOTION_DESC')}</div>
          </div>
          <input
            type="checkbox"
            checked={state.settings.reducedMotion}
            onChange={(e) => engine.updateSettings({ reducedMotion: e.target.checked })}
            className="h-5 w-5 shrink-0 accent-[#46c9b0]"
          />
        </label>
      </div>

      {/* Replay Tutorial Card */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 p-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{t('SETTINGS_REPLAY_TUTORIAL')}</div>
          <div className="text-xs text-[#9ecbd9]">{t('SETTINGS_REPLAY_DESC')}</div>
        </div>
        <button
          type="button"
          onClick={() => engine.replayTutorial()}
          className="pixel-btn min-h-[38px] shrink-0 flex items-center gap-1.5 rounded-lg bg-[#22697a] px-3 text-xs font-bold text-white hover:bg-[#2b8296] whitespace-nowrap"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{t('SETTINGS_REPLAY_TUTORIAL')}</span>
        </button>
      </div>

      {/* Offline Cap & Save Info */}
      <div className="rounded-xl border border-[#5ba6ba]/25 bg-[#103044]/68 p-3 text-xs text-[#9ecbd9] space-y-1">
        <div className="font-semibold text-white">
          {t('SETTINGS_PERSISTENCE_TITLE', { version: GAME_CONFIG.SAVE_VERSION })}
        </div>
        <p>
          {t('SETTINGS_PERSISTENCE_DESC', {
            maps: HABITAT_CATALOG.length,
            coins: t('UI_COINS'),
            rp: t('UI_RP'),
            hours: GAME_CONFIG.DEFAULT_OFFLINE_CAP_HOURS,
          })}
        </p>
        <div className="pt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopySave}
            className="min-h-[38px] rounded-lg bg-[#19475c] px-3 text-xs font-semibold text-white hover:bg-[#225c78]"
          >
            {copiedSave ? t('SETTINGS_COPIED') : t('SETTINGS_COPY_SAVE')}
          </button>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="min-h-[38px] rounded-lg bg-[#522430] px-3 text-xs font-semibold text-[#ffd4dc] hover:bg-[#6e3040]"
            >
              {t('SETTINGS_RESET_SAVE')}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  engine.debugResetSave();
                  setConfirmReset(false);
                }}
                className="min-h-[38px] rounded-lg bg-[#b83b4a] px-3 text-xs font-bold text-white hover:bg-[#cf4656]"
              >
                {t('UI_CONFIRM')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-[38px] rounded-lg bg-[#19475c] px-3 text-xs font-semibold text-white"
              >
                {t('UI_CANCEL')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
