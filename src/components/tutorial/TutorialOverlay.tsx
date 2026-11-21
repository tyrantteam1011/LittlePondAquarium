import React, { useEffect, useState } from 'react';
import { ActivePanelId } from '../../game/core/types';
import { EngineSnapshot, GameEngine } from '../../game/core/GameEngine';
import { useLocalization } from '../../game/localization/LocalizationManager';
import { CONTEXTUAL_HINT_KEYS, TUTORIAL_STEPS } from '../../game/tutorial/tutorialCatalog';
import { TutorialHandPointer } from './TutorialHandPointer';
import { SpritePreview } from '../SpritePreview';
import {
  ArrowRight,
  Droplets,
  Sparkles,
  Wind,
  X,
  SkipForward,
  Compass,
  Clock,
  Shield,
} from 'lucide-react';

interface TutorialOverlayProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
  activePanel: ActivePanelId;
  onOpenPanel: (panel: ActivePanelId) => void;
}

/**
 * Interactive Guided Tutorial + Post-Tutorial Contextual Hints
 * Styled in Pixel Art + Soft Translucent Glass so the living aquarium stays visible.
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  engine,
  snapshot,
  activePanel,
  onOpenPanel,
}) => {
  const { t, hasSelectedLanguage, formatNumber, getHabitatName } = useLocalization();
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [idleNudge, setIdleNudge] = useState(false);

  const step = snapshot.activeTutorialStep;
  const contextualHint = snapshot.activeContextualHint;
  const { state, beauty, ecosystem, activeHabitatFishCount, maxCapacity, offlineReport } = snapshot;

  // Auto-advance brief emotional watch step (watch_fish) after 2.4s
  useEffect(() => {
    if (!step || !step.autoAdvanceDelayMs || !hasSelectedLanguage || offlineReport) return;
    const timer = window.setTimeout(() => {
      engine.notifyTutorialEvent('continue_clicked');
    }, step.autoAdvanceDelayMs);
    return () => window.clearTimeout(timer);
  }, [step, engine, hasSelectedLanguage, offlineReport]);

  // Reset idle nudge whenever tutorial step changes; show gentle hint if player waits 9s
  useEffect(() => {
    setIdleNudge(false);
    setConfirmSkip(false);
    if (!step || step.pointerMode === 'none' || !hasSelectedLanguage) return;
    const timer = window.setTimeout(() => setIdleNudge(true), 9000);
    return () => window.clearTimeout(timer);
  }, [step?.stepId, hasSelectedLanguage]);

  // Do not overlap with first-launch Language Selection or Offline Earnings modal
  if (!hasSelectedLanguage || offlineReport) return null;

  // 1. POST-TUTORIAL CONTEXTUAL HINT BANNER
  if (!step) {
    if (!contextualHint) return null;
    const hintKey = CONTEXTUAL_HINT_KEYS[contextualHint.id];
    const hintText = t(hintKey, {
      name: contextualHint.paramName
        ? getHabitatName(contextualHint.paramName as never)
        : '',
    });

    return (
      <div className="pointer-events-none fixed top-[66px] left-3 right-3 z-30 flex justify-center sm:top-[72px]">
        <div className="pointer-events-auto glass-panel flex w-full max-w-md items-center justify-between gap-2.5 rounded-xl border border-[#8df0d7]/60 px-3.5 py-2.5 shadow-xl">
          <div className="flex min-w-0 items-center gap-2 text-xs text-[#e6fbff]">
            <Sparkles className="h-4 w-4 shrink-0 text-[#ffe68a]" />
            <p className="leading-snug">{hintText}</p>
          </div>
          <button
            type="button"
            onClick={() => engine.dismissContextualHint()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9ecbd9] hover:bg-[#173e54]/80 hover:text-white"
            aria-label={t('UI_CLOSE')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const stepIndex = state.tutorial.currentStepIndex;
  const totalSteps = TUTORIAL_STEPS.length;

  // Determine dynamic target when a panel is already open
  let effectiveTargetId = step.targetId;
  if (step.stepId === 'build_school' && activePanel === 'fish') {
    effectiveTargetId = 'fish-buy-first';
  } else if (step.stepId === 'upgrade_aquarium' && activePanel === 'upgrades') {
    effectiveTargetId = 'upgrade-capacity';
  } else if (step.stepId === 'first_research' && activePanel === 'research') {
    effectiveTargetId = 'research-water';
  }

  // 2. PHASE 1 WELCOME MODAL (Centered translucent glass card over living aquarium)
  if (step.stepId === 'welcome') {
    return (
      <div className="glass-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-sm rounded-2xl border border-[#8df0d7]/65 p-5 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#8df0d7]/45 bg-[#0e3245]/80">
            <SpritePreview kind="fish" id="guppy" variant="golden" size={56} />
          </div>

          <div className="mt-2.5 text-[11px] font-semibold text-[#8df5da]">
            {t('TUT_GUIDE_NAME')}
          </div>
          <h2 className="mt-1 font-pixel text-lg sm:text-xl font-bold text-white">
            {t(step.titleKey)}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#cdecf5]">
            {t(step.bodyKey)}
          </p>

          <button
            type="button"
            onClick={() => engine.notifyTutorialEvent('start_clicked')}
            className="pixel-btn mt-5 min-h-[48px] w-full rounded-xl bg-[#2c8a7a] text-sm font-bold text-white hover:bg-[#35a18f]"
          >
            {t('UI_START')}
          </button>
        </div>
      </div>
    );
  }

  // 3. MASTER CELEBRATION MODAL (Final Step)
  if (step.stepId === 'tutorial_complete') {
    return (
      <div className="glass-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-sm rounded-2xl border border-[#ffe484]/75 p-5 text-center shadow-2xl">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ffe484]/50 bg-[#0e3245]/80">
              <SpritePreview kind="fish" id="guppy" variant="golden" size={54} />
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#8df0d7]/50 bg-[#0e3245]/80">
              <SpritePreview kind="decoration" id="pearl_clam" size={50} />
            </div>
          </div>

          <div className="mt-3 text-xs font-bold text-[#ffe68a]">
            {t('TUT_GUIDE_NAME')}
          </div>
          <h2 className="mt-1 font-pixel text-xl font-bold text-white">
            {t(step.titleKey)}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#d2eef7]">
            {t(step.bodyKey)}
          </p>

          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-[#72c4d6]/25 bg-[#081d2b]/65 px-3 py-2 text-xs font-bold tabular-nums">
            <span className="text-[#ffe68a]">+{formatNumber(500)} {t('UI_COINS')}</span>
            <span className="text-[#9bf5ff]">+15 {t('UI_GEMS')}</span>
            <span className="text-[#b8f2ff]">+35 {t('UI_RP')}</span>
          </div>

          <button
            type="button"
            onClick={() => engine.notifyTutorialEvent('continue_clicked')}
            className="pixel-btn mt-4 min-h-[48px] w-full rounded-xl bg-[#d98c2b] text-sm font-bold text-white hover:bg-[#eb9c38]"
          >
            {t('TUT_ACTION_CLAIM_MASTER')}
          </button>
        </div>
      </div>
    );
  }

  // 4. INTERACTIVE GUIDED OVERLAY + SPOTLIGHT + HAND POINTER
  const handlePrimaryCta = () => {
    if (step.stepId === 'open_fish_shop') {
      onOpenPanel('fish');
      return;
    }
    if (step.stepId === 'water_quality') {
      onOpenPanel('decor');
      return;
    }
    if (step.stepId === 'upgrade_aquarium' && activePanel !== 'upgrades') {
      onOpenPanel('upgrades');
      return;
    }
    if (step.stepId === 'world_map' && activePanel !== 'habitats') {
      onOpenPanel('habitats');
      return;
    }
    if (step.stepId === 'first_research' && activePanel !== 'research') {
      onOpenPanel('research');
      return;
    }
    if (step.stepId === 'place_first_fish') {
      engine.placePendingTutorialFish(0.5, 0.46);
      return;
    }
    engine.performTutorialQuickAction();
  };

  const pendingFishId = state.tutorial.pendingFishToPlaceId;

  return (
    <>
      {/* Animated Hand Pointer & Highlight Ring */}
      <TutorialHandPointer
        targetId={effectiveTargetId}
        mode={step.pointerMode}
        reducedMotion={state.settings.reducedMotion}
      />

      {/* Glowing Center Drop Zone when placing first fish */}
      {step.stepId === 'place_first_fish' && pendingFishId && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
          <div className="glass-panel flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-[#8df5da] px-6 py-4">
            <SpritePreview kind="fish" id={pendingFishId} size={54} />
            <span className="text-xs font-bold text-[#e6fff8]">{t('UI_PLACE')}</span>
          </div>
        </div>
      )}

      {/* Compact Translucent Top Guide Card */}
      <div className="pointer-events-none fixed top-[64px] left-2.5 right-2.5 z-30 flex justify-center sm:top-[70px]">
        <div className="pointer-events-auto glass-panel w-full max-w-md rounded-2xl border border-[#8df0d7]/55 px-3.5 py-3 shadow-2xl">
          {/* Header Row: Guide Name · Step Progress + Skip Control */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-[#8df5da]">
              <span className="truncate">{t('TUT_GUIDE_NAME')}</span>
              <span aria-hidden="true" className="text-[#5d96a8]">·</span>
              <span className="shrink-0 tabular-nums text-[#a8d8e6]">
                {t('TUT_STEP_PROGRESS', { cur: stepIndex + 1, total: totalSteps })}
              </span>
            </div>

            {step.skippable && (
              <div className="shrink-0">
                {!confirmSkip ? (
                  <button
                    type="button"
                    onClick={() => setConfirmSkip(true)}
                    className="flex min-h-[28px] items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-[#9ac6d4] hover:bg-[#173e54]/80 hover:text-white"
                  >
                    <SkipForward className="h-3 w-3" />
                    <span>{t('TUT_SKIP')}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => engine.skipTutorial()}
                      className="min-h-[28px] rounded-lg bg-[#2c8a7a] px-2 text-[11px] font-bold text-white hover:bg-[#35a18f]"
                    >
                      {t('UI_CONFIRM')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSkip(false)}
                      className="min-h-[28px] rounded-lg bg-[#173e54] px-2 text-[11px] font-semibold text-[#cdeaf5]"
                    >
                      {t('UI_CANCEL')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {confirmSkip && (
            <div className="mt-1 text-[11px] font-medium text-[#ffe68a]">
              {t('TUT_SKIP_CONFIRM')}
            </div>
          )}

          {/* Main 1-2 Sentence Dialogue */}
          <h3 className="mt-1 font-pixel text-xs sm:text-sm font-bold text-white">
            {t(step.titleKey)}
          </h3>
          <p className="mt-0.5 text-xs leading-snug text-[#d6f1fa]">
            {t(step.bodyKey)}
          </p>

          {/* Optional Compact Visual Learning Widget */}
          {step.visualWidget === 'aquarium_info' && (
            <div className="mt-2.5 grid grid-cols-5 gap-1.5 rounded-xl border border-[#68b6c7]/25 bg-[#081d2b]/65 p-2 text-center text-[10px] tabular-nums">
              <div>
                <div className="text-[#8cbccf]">{t('UI_LEVEL_SHORT')}</div>
                <div className="font-bold text-white">{state.aquariumLevel}</div>
              </div>
              <div>
                <div className="text-[#8cbccf]">{t('UI_FISH')}</div>
                <div className="font-bold text-white">
                  {activeHabitatFishCount}/{maxCapacity}
                </div>
              </div>
              <div>
                <div className="text-[#8cbccf]">{t('UI_WATER_QUALITY').split(' ')[0]}</div>
                <div className="font-bold text-[#8df5da]">{ecosystem.waterQuality}%</div>
              </div>
              <div>
                <div className="text-[#8cbccf]">{t('UI_OXYGEN')}</div>
                <div className="font-bold text-[#9be7ff]">{ecosystem.oxygen}%</div>
              </div>
              <div>
                <div className="text-[#8cbccf]">{t('UI_BEAUTY')}</div>
                <div className="font-bold text-[#ffe68a]">{beauty.total}</div>
              </div>
            </div>
          )}

          {step.visualWidget === 'growth_demo' && (
            <div className="mt-2.5 flex items-center justify-around rounded-xl border border-[#68b6c7]/25 bg-[#081d2b]/65 px-2 py-2 text-[11px]">
              <div className="flex flex-col items-center">
                <SpritePreview kind="fish" id="neon_tetra" size={26} />
                <span className="mt-0.5 text-[#a8d8e6]">{t('STAGE_baby')}</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#7adbc4]" />
              <div className="flex flex-col items-center">
                <SpritePreview kind="fish" id="neon_tetra" size={34} />
                <span className="mt-0.5 text-[#c7effa]">{t('STAGE_juvenile')}</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#7adbc4]" />
              <div className="flex flex-col items-center">
                <SpritePreview kind="fish" id="neon_tetra" size={42} />
                <span className="mt-0.5 font-bold text-[#ffe68a]">{t('STAGE_adult')}</span>
              </div>
            </div>
          )}

          {step.visualWidget === 'school_counter' && (
            <div className="mt-2 flex items-center justify-between rounded-xl border border-[#68b6c7]/25 bg-[#081d2b]/65 px-3 py-1.5 text-xs tabular-nums">
              <span className="text-[#b8e2f0]">{t('UI_FISH')}</span>
              <span className="font-bold text-[#8df5da]">
                {Math.min(3, Math.max(1, activeHabitatFishCount - 2))} / 3
              </span>
            </div>
          )}

          {step.visualWidget === 'water_demo' && (
            <div className="mt-2 flex items-center justify-between rounded-xl border border-[#68b6c7]/25 bg-[#081d2b]/65 px-3 py-1.5 text-xs tabular-nums">
              <span className="flex items-center gap-1.5 text-[#b8e2f0]">
                <Droplets className="h-3.5 w-3.5 text-[#8df5da]" />
                {t('UI_WATER_QUALITY')}
              </span>
              <span className="font-bold text-[#ffe68a]">
                {ecosystem.waterQuality}% → 100%
              </span>
            </div>
          )}

          {step.visualWidget === 'oxygen_demo' && (
            <div className="mt-2 flex items-center justify-between rounded-xl border border-[#68b6c7]/25 bg-[#081d2b]/65 px-3 py-1.5 text-xs tabular-nums">
              <span className="flex items-center gap-1.5 text-[#b8e2f0]">
                <Wind className="h-3.5 w-3.5 text-[#9be7ff]" />
                {t('UI_OXYGEN')}
              </span>
              <span className="font-bold text-[#9be7ff]">
                {ecosystem.oxygen}% → 100%
              </span>
            </div>
          )}

          {step.visualWidget === 'shelter_demo' && (
            <div className="mt-2 flex items-center justify-between rounded-xl border border-[#68b6c7]/25 bg-[#081d2b]/65 px-3 py-1.5 text-xs tabular-nums">
              <span className="flex items-center gap-1.5 text-[#b8e2f0]">
                <Shield className="h-3.5 w-3.5 text-[#8df5da]" />
                {t('UI_SHELTER')}
              </span>
              <span className="font-bold text-[#8df5da]">+10</span>
            </div>
          )}

          {step.visualWidget === 'growth_milestone' && (
            <div className="mt-2 rounded-xl border border-[#68b6c7]/25 bg-[#081d2b]/65 px-3 py-2 text-xs">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-[#8df5da]">
                  {t('STAGE_baby')} → {t('STAGE_juvenile')}
                </span>
                <span className="tabular-nums text-[#ffe68a]">60%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#133347]">
                <div className="h-full w-[60%] bg-[#5bd4c0]" />
              </div>
            </div>
          )}

          {step.visualWidget === 'map_journey' && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-[#68b6c7]/25 bg-[#081d2b]/65 px-3 py-2 text-[11px] text-[#cdebf5]">
              <Compass className="h-3.5 w-3.5 shrink-0 text-[#8df5da]" />
              <span className="font-bold text-[#ffe68a]">{getHabitatName('pond')}</span>
              <span>→</span>
              <span>{getHabitatName('lake')}</span>
              <span>→</span>
              <span>{getHabitatName('coral_reef')}</span>
              <span>→</span>
              <span>{getHabitatName('deep_ocean')}</span>
            </div>
          )}

          {step.visualWidget === 'offline_preview' && (
            <div className="mt-2 flex items-center justify-between rounded-xl border border-[#68b6c7]/25 bg-[#081d2b]/65 px-3 py-2 text-[11px] tabular-nums">
              <span className="flex items-center gap-1.5 text-[#b8e2f0]">
                <Clock className="h-3.5 w-3.5 text-[#ffe68a]" />
                {t('OFFLINE_EARNINGS_LABEL')}
              </span>
              <span className="font-bold text-[#8df5da]">
                {t('UI_COINS')} · {t('UI_RP')} · {t('OFFLINE_CAP_HOURS', { hours: 8 })}
              </span>
            </div>
          )}

          {/* Idle Error-Recovery Hint + Optional Primary Button */}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            {idleNudge ? (
              <span className="text-[11px] font-semibold text-[#ffe68a]">
                {t('TUT_TRY_THIS')}
              </span>
            ) : (
              <span />
            )}

            {step.primaryButtonKey && (
              <button
                type="button"
                onClick={handlePrimaryCta}
                className="pixel-btn min-h-[38px] flex items-center gap-1.5 rounded-xl bg-[#2c8a7a] px-3.5 text-xs font-bold text-white hover:bg-[#35a18f] whitespace-nowrap"
              >
                <span>{t(step.primaryButtonKey)}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
