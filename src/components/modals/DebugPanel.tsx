import React, { useState } from 'react';
import { GameEngine } from '../../game/core/GameEngine';
import { LocalizationManager, useLocalization } from '../../game/localization/LocalizationManager';
import {
  formatLocalizationAuditReport,
  validateAllLocalizations,
} from '../../game/localization/LocalizationValidator';
import { X } from 'lucide-react';

interface DebugPanelProps {
  engine: GameEngine;
  onClose: () => void;
}

interface DebugAction {
  label: string;
  run: () => void;
  tone?: 'default' | 'accent' | 'warn';
}

/**
 * Expanded Developer Debug Tools for testing economy, 20-map progression,
 * growth, breeding, water/oxygen ecosystem states, creatures, tutorial, and localization.
 */
export const DebugPanel: React.FC<DebugPanelProps> = ({ engine, onClose }) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const { t, debugMode, pseudoLocale, setLocale, toggleDebugMode, togglePseudoLocale } =
    useLocalization();

  const actions: DebugAction[] = [
    { label: '+5K Coins', run: () => engine.debugAddCoins(5000), tone: 'accent' },
    { label: '+100K Coins', run: () => engine.debugAddCoins(100000), tone: 'accent' },
    { label: '+100 Gems', run: () => engine.debugAddGems(100), tone: 'accent' },
    { label: '+100 RP', run: () => engine.debugAddRp(100), tone: 'accent' },
    { label: '+500 Food', run: () => engine.debugAddFood(500), tone: 'accent' },
    { label: '-500 Food', run: () => engine.debugRemoveFood(500), tone: 'warn' },
    { label: 'Hunger 15%', run: () => engine.debugSetFishHunger(15), tone: 'warn' },
    { label: 'Hunger 100%', run: () => engine.debugSetFishHunger(100) },
    { label: 'Kill Starving', run: () => engine.debugKillStarvingFish(), tone: 'warn' },
    { label: 'Up AutoFeeder', run: () => engine.debugUpgradeAutoFeeder(), tone: 'accent' },
    { label: 'Up FoodStore', run: () => engine.debugUpgradeFoodStorage() },
    { label: '+1 Map Mastery', run: () => engine.debugIncreaseMapMastery(), tone: 'accent' },
    { label: 'Unlock 20 Maps', run: () => engine.debugUnlockAllHabitats() },
    { label: 'Fill Encyclo', run: () => engine.debugCompleteEncyclopedia(), tone: 'accent' },
    { label: 'Next Milestone', run: () => engine.debugCompleteNextMilestone(), tone: 'accent' },
    { label: 'Level Up', run: () => engine.debugLevelUp() },
    { label: 'Spawn Map Fish', run: () => engine.debugSpawnFish() },
    { label: 'Grow All Fish', run: () => engine.debugGrowAllFish() },
    { label: 'Lay Breed Egg', run: () => engine.debugTriggerBreeding() },
    { label: 'Add Creature', run: () => engine.debugAddCreature() },
    { label: 'Water 100%', run: () => engine.debugSetWaterQuality(100) },
    { label: 'Water 35%', run: () => engine.debugSetWaterQuality(35), tone: 'warn' },
    { label: 'Oxygen 100%', run: () => engine.debugSetOxygen(100) },
    { label: 'Oxygen 35%', run: () => engine.debugSetOxygen(35), tone: 'warn' },
    { label: 'Complete Quest', run: () => engine.debugCompleteMission() },
    { label: '+2h Offline', run: () => engine.debugSimulateOfflineHours(2) },
    { label: 'Rare Visitor', run: () => engine.debugSpawnRareVisitor() },
    { label: 'Lang Picker', run: () => { LocalizationManager.resetLanguageSelectionForDebug(); onClose(); } },
    {
      label: debugMode ? 'Loc Debug: ON' : 'Loc Debug: OFF',
      run: () => {
        toggleDebugMode();
      },
      tone: debugMode ? 'warn' : 'default',
    },
    {
      label: pseudoLocale ? t('DEBUG_PSEUDO_ON') : t('DEBUG_PSEUDO_OFF'),
      run: () => {
        togglePseudoLocale();
      },
      tone: pseudoLocale ? 'warn' : 'default',
    },
    {
      label: 'Test de-DE',
      run: () => setLocale('de-DE'),
    },
    {
      label: 'Test pt-PT',
      run: () => setLocale('pt-PT'),
    },
    {
      label: 'Run Loc Audit',
      run: () => {
        const report = validateAllLocalizations();
        console.info(formatLocalizationAuditReport(report));
        engine.showToast(
          `[Loc Audit] ${report.passed ? 'PASS' : 'FAIL'} · Keys ${report.totalKeysChecked} · Missing ${report.missingKeyCount + report.missingTranslationCount}`
        );
      },
      tone: 'accent',
    },
    { label: 'Replay Tut', run: () => { engine.replayTutorial(); onClose(); } },
  ];

  return (
    <aside
      aria-label={t('DEBUG_TITLE')}
      className="glass-panel fixed top-16 right-3 z-50 w-[296px] max-h-[78vh] overflow-y-auto cozy-scroll rounded-2xl border border-[#f7c948]/55 p-3.5 shadow-2xl"
    >
      <div className="mb-2.5 flex items-center justify-between border-b border-[#6cb8cc]/25 pb-2">
        <span className="font-pixel text-xs font-bold text-[#ffe68a]">
          {t('DEBUG_TITLE')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9ecbd9] hover:bg-[#193d52]/80 hover:text-white"
          aria-label={t('DEBUG_CLOSE')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.run}
            className={`min-h-[38px] rounded-lg px-2.5 text-left text-[11px] font-semibold transition-colors ${
              action.tone === 'accent'
                ? 'bg-[#1a495c]/85 text-[#ffe99e] hover:bg-[#235e75]'
                : action.tone === 'warn'
                  ? 'bg-[#4f3425]/85 text-[#ffd0a6] hover:bg-[#664330]'
                  : 'bg-[#133548]/85 text-[#e0f6fc] hover:bg-[#1c4b66]'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-[#6cb8cc]/20 pt-2.5">
        <button
          type="button"
          onClick={() => engine.debugResetCurrentMap()}
          className="min-h-[38px] rounded-lg bg-[#4a2b36]/85 px-2.5 text-[11px] font-semibold text-[#ffd1dc] hover:bg-[#613847]"
        >
          {t('DEBUG_RESET_MAP')}
        </button>

        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="min-h-[38px] rounded-lg bg-[#5c2330]/90 px-2.5 text-[11px] font-semibold text-[#ffd4dc] hover:bg-[#752c3c]"
          >
            {t('DEBUG_RESET_SAVE')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              engine.debugResetSave();
              setConfirmReset(false);
            }}
            className="min-h-[38px] rounded-lg bg-[#a62b40] px-2.5 text-[11px] font-bold text-white hover:bg-[#bf344c]"
          >
            {t('DEBUG_CONFIRM_RESET')}
          </button>
        )}
      </div>
    </aside>
  );
};
