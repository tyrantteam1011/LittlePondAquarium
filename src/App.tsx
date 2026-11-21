import React, { useEffect, useMemo, useState } from 'react';
import { ActivePanelId } from './game/core/types';
import { EngineSnapshot, GameEngine } from './game/core/GameEngine';
import { useLocalization } from './game/localization/LocalizationManager';
import { AquariumCanvas } from './components/AquariumCanvas';
import { TopHud } from './components/TopHud';
import { BottomBar } from './components/BottomBar';
import { TutorialOverlay } from './components/tutorial/TutorialOverlay';
import { FeedbackOverlay } from './components/FeedbackOverlay';
import { FishPanel } from './components/panels/FishPanel';
import { DecorPanel } from './components/panels/DecorPanel';
import { ResearchPanel } from './components/panels/ResearchPanel';
import { CollectionPanel } from './components/panels/CollectionPanel';
import { UpgradePanel } from './components/panels/UpgradePanel';
import { HabitatPanel } from './components/panels/HabitatPanel';
import { MissionsPanel } from './components/panels/MissionsPanel';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { FeedingPanel } from './components/panels/FeedingPanel';
import { OfflineEarningsModal } from './components/modals/OfflineEarningsModal';
import { DiscoveryModal } from './components/modals/DiscoveryModal';
import { LevelUpModal } from './components/modals/LevelUpModal';
import { AdSimulationModal } from './components/modals/AdSimulationModal';
import { LanguageSelectionModal } from './components/modals/LanguageSelectionModal';
import { DebugPanel } from './components/modals/DebugPanel';
import { AudioService } from './game/services/AudioService';
import { useViewportScale } from './game/layout/useViewportScale';
import { computeSafeSwimBounds } from './game/layout/scaleTiers';
import { X } from 'lucide-react';

const PANEL_TITLE_KEYS: Record<Exclude<ActivePanelId, null>, string> = {
  fish: 'PANEL_FISH',
  decor: 'PANEL_DECOR',
  research: 'PANEL_RESEARCH',
  collection: 'PANEL_COLLECTION',
  upgrades: 'PANEL_UPGRADES',
  habitats: 'PANEL_HABITATS',
  missions: 'PANEL_MISSIONS',
  settings: 'UI_SETTINGS',
  feeding: 'PANEL_FEEDING',
};

export default function App() {
  const { t, debugMode, missingKeyLog, clearMissingKeyLog } = useLocalization();
  const engine = useMemo(() => new GameEngine(), []);
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(() => engine.getSnapshot());
  const [activePanel, setActivePanel] = useState<ActivePanelId>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [expandMissingKeys, setExpandMissingKeys] = useState(false);
  const [hudTopPx, setHudTopPx] = useState(64);
  const [hudBottomPx, setHudBottomPx] = useState(118);

  const viewport = useViewportScale(snapshot.state.settings.displaySize ?? 'auto');
  const safeBounds = useMemo(
    () =>
      computeSafeSwimBounds(
        viewport.viewportWidth,
        viewport.viewportHeight,
        hudTopPx,
        hudBottomPx,
        viewport.safeArea
      ),
    [viewport.viewportWidth, viewport.viewportHeight, viewport.safeArea, hudTopPx, hudBottomPx]
  );

  useEffect(() => {
    const unsubscribe = engine.subscribe(setSnapshot);
    engine.start();
    AudioService.ensureAmbientLoop();
    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [engine]);

  // Automatically close drawers when entering interactive aquarium-placement tutorial steps
  const activeTutStepId = snapshot.activeTutorialStep?.stepId;
  useEffect(() => {
    if (
      activeTutStepId === 'place_first_fish' ||
      activeTutStepId === 'watch_fish' ||
      activeTutStepId === 'place_plant' ||
      activeTutStepId === 'place_airstone' ||
      activeTutStepId === 'place_shelter' ||
      activeTutStepId === 'first_feed' ||
      activeTutStepId === 'tutorial_complete'
    ) {
      setActivePanel(null);
    }
  }, [activeTutStepId]);

  const handleTogglePanel = (panel: ActivePanelId) => {
    AudioService.playClick();
    setActivePanel(panel);
    if (panel !== null) {
      engine.startPlacingDecoration(null);
      engine.selectPlacedDecoration(null);
      if (panel === 'fish') engine.notifyTutorialEvent('panel_fish_opened');
      if (panel === 'decor') engine.notifyTutorialEvent('panel_decor_opened');
      if (panel === 'habitats') engine.notifyTutorialEvent('panel_map_opened');
    }
  };

  return (
    <main
      className="relative h-dvh w-screen overflow-hidden bg-[#081b26] text-[#f0f7fa]"
      style={
        {
          '--ui-scale': String(viewport.uiScale),
          '--hud-top-px': `${hudTopPx}px`,
          '--hud-bottom-px': `${hudBottomPx}px`,
          '--kb-height-px': `${viewport.keyboardHeight}px`,
        } as React.CSSProperties
      }
    >
      {/* Primary Focal Screen: Full-Viewport Living Pixel Art Aquarium */}
      <div className="absolute inset-0">
        <AquariumCanvas
          engine={engine}
          snapshot={snapshot}
          viewport={viewport}
          safeBounds={safeBounds}
          hudTopPx={hudTopPx}
          hudBottomPx={hudBottomPx}
        />
      </div>

      {/* Compact Translucent Top HUD */}
      <TopHud
        engine={engine}
        snapshot={snapshot}
        viewport={viewport}
        activePanel={activePanel}
        onTogglePanel={handleTogglePanel}
        showDebug={showDebug}
        onToggleDebug={() => setShowDebug((v) => !v)}
        onHeightChange={setHudTopPx}
      />

      {/* Interactive First-10-Min Tutorial & Post-Tutorial Contextual Hints */}
      <TutorialOverlay
        engine={engine}
        snapshot={snapshot}
        activePanel={activePanel}
        onOpenPanel={handleTogglePanel}
      />

      {/* Soft Translucent Glass Bottom Sheet (Mobile) / Side Drawer (Desktop) */}
      {activePanel && (
        <section
          aria-label={t(PANEL_TITLE_KEYS[activePanel])}
          className="glass-panel fixed left-2.5 right-2.5 bottom-[126px] z-30 flex max-h-[56vh] flex-col overflow-hidden rounded-2xl border border-[#7ad2e3]/45 lg:left-auto lg:right-5 lg:top-[72px] lg:bottom-[132px] lg:max-h-none lg:w-[424px]"
        >
          {/* Sheet Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[#68b6c7]/25 px-4 py-3">
            <h2 className="font-pixel text-sm sm:text-base font-bold text-white truncate pr-2">
              {t(PANEL_TITLE_KEYS[activePanel])}
            </h2>
            <button
              type="button"
              onClick={() => handleTogglePanel(null)}
              className="min-h-[36px] min-w-[36px] flex shrink-0 items-center justify-center rounded-lg text-[#9ecbd9] hover:bg-[#173e54]/80 hover:text-white"
              aria-label={t('UI_CLOSE')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Panel Content */}
          <div className="cozy-scroll flex-1 overflow-y-auto px-4 py-3">
            {activePanel === 'fish' && (
              <FishPanel engine={engine} snapshot={snapshot} />
            )}
            {activePanel === 'decor' && (
              <DecorPanel
                engine={engine}
                snapshot={snapshot}
                onCloseForPlacement={() => setActivePanel(null)}
              />
            )}
            {activePanel === 'research' && (
              <ResearchPanel engine={engine} snapshot={snapshot} />
            )}
            {activePanel === 'collection' && (
              <CollectionPanel engine={engine} snapshot={snapshot} />
            )}
            {activePanel === 'upgrades' && (
              <UpgradePanel engine={engine} snapshot={snapshot} />
            )}
            {activePanel === 'habitats' && (
              <HabitatPanel engine={engine} snapshot={snapshot} />
            )}
            {activePanel === 'missions' && (
              <MissionsPanel engine={engine} snapshot={snapshot} />
            )}
            {activePanel === 'settings' && (
              <SettingsPanel engine={engine} snapshot={snapshot} viewport={viewport} />
            )}
            {activePanel === 'feeding' && (
              <FeedingPanel engine={engine} snapshot={snapshot} />
            )}
          </div>
        </section>
      )}

      {/* Thumb-Friendly Bottom Navigation, Ecosystem Strip & Feed Action */}
      <BottomBar
        engine={engine}
        snapshot={snapshot}
        viewport={viewport}
        activePanel={activePanel}
        onTogglePanel={handleTogglePanel}
        onHeightChange={setHudBottomPx}
      />

      {/* Flying Pixel Coins, Popups & Toasts */}
      <FeedbackOverlay snapshot={snapshot} />

      {/* First-Launch Language Selection Screen */}
      <LanguageSelectionModal />

      {/* Translucent Glass Celebratory Modals & Rewarded Ad Preview */}
      <OfflineEarningsModal engine={engine} snapshot={snapshot} />
      <DiscoveryModal engine={engine} snapshot={snapshot} />
      <LevelUpModal engine={engine} snapshot={snapshot} />
      <AdSimulationModal />

      {/* Expanded Developer Debug Panel */}
      {showDebug && (
        <DebugPanel engine={engine} onClose={() => setShowDebug(false)} />
      )}

      {/* Dev-Mode Missing Localization Key Overlay */}
      {import.meta.env.DEV && (missingKeyLog.length > 0 || debugMode) && (
        <div className="fixed left-2.5 top-16 z-[65] max-w-xs rounded-xl border border-[#ff9b9b]/60 bg-[#2e1018]/92 px-3 py-2 text-[11px] text-[#ffd4d4] shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setExpandMissingKeys((v) => !v)}
              className="font-bold text-[#ffb0b0] hover:underline text-left"
            >
              {t('DEBUG_MISSING_OVERLAY', { count: missingKeyLog.length })}
            </button>
            {missingKeyLog.length > 0 && (
              <button
                type="button"
                onClick={clearMissingKeyLog}
                className="rounded bg-[#52202c] px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-[#6e2c3c]"
              >
                {t('UI_CLOSE')}
              </button>
            )}
          </div>
          {expandMissingKeys && missingKeyLog.length > 0 && (
            <ul className="mt-1.5 max-h-36 space-y-0.5 overflow-y-auto font-mono text-[10px] text-[#ffe1e1]">
              {missingKeyLog.map((entry) => (
                <li key={entry} className="break-all">
                  {entry}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
