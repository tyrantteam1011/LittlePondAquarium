import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, EngineSnapshot } from '../game/core/GameEngine';
import { AquariumRenderer } from '../game/rendering/AquariumRenderer';
import { DECORATION_BY_ID } from '../game/data/decorationCatalog';
import { useLocalization } from '../game/localization/LocalizationManager';
import {
  Move,
  FlipHorizontal2,
  Trash2,
  Check,
  Sparkles,
  Droplets,
  Coins,
  MessageCircle,
  X,
} from 'lucide-react';

interface AquariumCanvasProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export const AquariumCanvas: React.FC<AquariumCanvasProps> = ({ engine, snapshot }) => {
  const { t, getDecorationName, getDecorationDescription, getDecorationEffect } = useLocalization();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<AquariumRenderer | null>(null);
  const worldSizeRef = useRef({ worldWidth: 360, worldHeight: 240 });
  const draggingDecorIdRef = useRef<string | null>(null);
  const pointerMovedRef = useRef(false);
  const hoverNormRef = useRef<{ x: number; y: number } | null>(null);
  const [hasRareVisitor, setHasRareVisitor] = useState(false);

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    if (!rendererRef.current) {
      rendererRef.current = new AquariumRenderer();
    }

    let rafId = 0;
    let lastTime = performance.now();
    let rareStateCache = false;

    const frame = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      engine.simulation.update(dt);

      const rareActive = Boolean(engine.simulation.rareVisitor?.active);
      if (rareActive !== rareStateCache) {
        rareStateCache = rareActive;
        setHasRareVisitor(rareActive);
      }

      const canvas = canvasRef.current;
      if (canvas && rendererRef.current) {
        const snap = snapshotRef.current;
        worldSizeRef.current = rendererRef.current.render(
          canvas,
          snap.state,
          engine.simulation,
          now / 1000,
          {
            selectedDecorId: snap.selectedPlacedDecorId,
            placingDecorId: snap.placingDecorationId,
            hoverNormPos: hoverNormRef.current,
          }
        );
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, [engine]);

  const getPointerCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const worldX = normX * worldSizeRef.current.worldWidth;
    const worldY = normY * worldSizeRef.current.worldHeight;
    return { normX, normY, worldX, worldY, pctX: normX * 100, pctY: normY * 100 };
  };

  const hitTestDecoration = (worldX: number, worldY: number): string | null => {
    const { worldWidth, worldHeight } = worldSizeRef.current;
    const activeDecors = snapshot.state.placedDecorations
      .filter((d) => d.habitatId === snapshot.state.activeHabitatId)
      .slice()
      .sort((a, b) => b.y - a.y);

    for (const d of activeDecors) {
      const def = DECORATION_BY_ID[d.decorationId];
      if (!def) continue;
      const cx = d.x * worldWidth;
      const bottomY = d.y * worldHeight;
      const halfW = Math.max(12, def.width * 0.65);
      const topY = bottomY - Math.max(14, def.height * 1.15);
      if (
        worldX >= cx - halfW &&
        worldX <= cx + halfW &&
        worldY >= topY &&
        worldY <= bottomY + 6
      ) {
        return d.instanceId;
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { normX, normY, worldX, worldY, pctX, pctY } = getPointerCoords(e);
    pointerMovedRef.current = false;

    // Mode 1: Actively placing an owned decoration from inventory
    if (snapshot.placingDecorationId) {
      engine.placeOwnedDecorationAt(snapshot.placingDecorationId, normX, normY);
      return;
    }

    // Mode 2: Floating Creature Coins & Rare Visitors always take priority!
    const nearCoin = engine.simulation.creatureCoins.some((c) => {
      const dx = worldX - c.x;
      const dy = worldY - c.y;
      return dx * dx + dy * dy <= 28 * 28;
    });
    if (nearCoin) {
      engine.handleCanvasTap(worldX, worldY, pctX, pctY);
      return;
    }

    if (engine.simulation.rareVisitor?.active) {
      const rv = engine.simulation.rareVisitor;
      const dx = worldX - rv.x;
      const dy = worldY - rv.y;
      if (dx * dx + dy * dy <= 34 * 34) {
        engine.handleCanvasTap(worldX, worldY, pctX, pctY);
        return;
      }
    }

    // Mode 3: Tapping/dragging a placed decoration (disabled during active tutorial placement steps)
    if (!snapshot.activeTutorialStep) {
      const hitDecorId = hitTestDecoration(worldX, worldY);
      if (hitDecorId) {
        draggingDecorIdRef.current = hitDecorId;
        engine.selectPlacedDecoration(hitDecorId);
        (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
        return;
      }
    }

    if (snapshot.selectedPlacedDecorId) {
      engine.selectPlacedDecoration(null);
    }

    // Mode 4: Pet fish, tutorial tap, or ripple water
    engine.handleCanvasTap(worldX, worldY, pctX, pctY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { normX, normY } = getPointerCoords(e);
    hoverNormRef.current = { x: normX, y: normY };

    if (draggingDecorIdRef.current) {
      pointerMovedRef.current = true;
      engine.movePlacedDecoration(draggingDecorIdRef.current, normX, normY);
    }
  };

  const handlePointerUp = () => {
    if (draggingDecorIdRef.current) {
      if (pointerMovedRef.current) {
        engine.finishMovingDecoration();
      }
      draggingDecorIdRef.current = null;
    }
  };

  const selectedDecor = snapshot.selectedPlacedDecorId
    ? snapshot.state.placedDecorations.find(
        (d) => d.instanceId === snapshot.selectedPlacedDecorId
      )
    : null;
  const selectedDecorDef = selectedDecor ? DECORATION_BY_ID[selectedDecor.decorationId] : null;
  const placingDecorDef = snapshot.placingDecorationId
    ? DECORATION_BY_ID[snapshot.placingDecorationId]
    : null;
  const { ecosystem, floatingCoinCount, visitorRemark } = snapshot;

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`h-full w-full block pixelated ${
          snapshot.placingDecorationId ? 'cursor-crosshair' : 'cursor-pointer'
        }`}
      />

      {/* Rare Visitor Prompt Banner */}
      {hasRareVisitor && !snapshot.activeTutorialStep && (
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-20">
          <div className="glass-panel flex items-center gap-2 rounded-xl border-2 border-[#f7d87c]/80 px-3.5 py-1.5 text-xs font-semibold text-[#fff3c2]">
            <Sparkles className="h-4 w-4 text-[#ffd966] shrink-0" />
            <span>{t('UI_RARE_VISITOR_BANNER')}</span>
          </div>
        </div>
      )}

      {/* Active Floating Care Actions (Collect Shells / Wipe Glass Algae) */}
      <div className="pointer-events-none fixed left-3 bottom-[148px] sm:left-5 sm:bottom-[154px] z-20 flex flex-col gap-2">
        {floatingCoinCount > 0 && (
          <button
            type="button"
            onClick={() => engine.collectAllCreatureCoins()}
            className="pointer-events-auto pixel-btn glass-panel min-h-[42px] flex items-center gap-2 rounded-xl border-2 border-[#f7d87c]/75 px-3 text-xs font-bold text-[#fff1ba] hover:brightness-110 whitespace-nowrap"
          >
            <Coins className="h-4 w-4 text-[#ffd666] shrink-0" />
            <span>{t('UI_COLLECT_SHELLS', { count: floatingCoinCount })}</span>
          </button>
        )}

        {ecosystem.algaeLevel >= 26 && (
          <button
            type="button"
            onClick={() => engine.cleanGlassAlgae()}
            className="pointer-events-auto pixel-btn glass-panel min-h-[42px] flex items-center gap-2 rounded-xl border-2 border-[#8ee6b2]/75 px-3 text-xs font-bold text-[#d4ffe7] hover:brightness-110 whitespace-nowrap"
          >
            <Droplets className="h-4 w-4 text-[#8ee6b2] shrink-0" />
            <span>{t('UI_CLEAN_GLASS', { pct: ecosystem.algaeLevel })}</span>
          </button>
        )}
      </div>

      {/* Cozy Aquarium Visitor Glass Remark (suppressed during guided tutorial to prevent overlap) */}
      {visitorRemark && !snapshot.placingDecorationId && !snapshot.activeTutorialStep && (
        <div className="pointer-events-auto fixed left-3 top-[68px] sm:left-5 sm:top-[74px] z-20 max-w-[270px] sm:max-w-xs">
          <div className="glass-panel flex items-start gap-2.5 rounded-xl border border-[#7adbc4]/45 px-3 py-2 text-xs text-[#e6f9ff]">
            <MessageCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: visitorRemark.accentColor }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span style={{ color: visitorRemark.accentColor }}>
                  {visitorRemark.visitorName}
                </span>
                <span className="font-normal text-[#8eb9c9]">· {visitorRemark.visitorRole}</span>
              </div>
              <p className="mt-0.5 leading-snug text-[#d8f1fa]">{visitorRemark.message}</p>
            </div>
            <button
              type="button"
              onClick={() => engine.dismissVisitorRemark()}
              className="text-[#86b1c2] hover:text-white"
              aria-label={t('UI_CLOSE')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Active Decoration Placement Mode Banner */}
      {snapshot.placingDecorationId && placingDecorDef && (
        <div className="glass-panel absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-xl border-2 border-[#7adbc4] px-4 py-2 text-xs text-[#e6fff8]">
          <span>
            {t('UI_TAP_TO_PLACE', { name: getDecorationName(placingDecorDef) })}
          </span>
          <button
            type="button"
            onClick={() => engine.startPlacingDecoration(null)}
            className="min-h-[32px] rounded-lg bg-[#1d485c] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#275c75]"
          >
            {t('UI_CANCEL')}
          </button>
        </div>
      )}

      {/* Selected Decoration Quick Action Bar & Localized Tooltip */}
      {selectedDecor && selectedDecorDef && !snapshot.placingDecorationId && (
        <div className="glass-panel absolute bottom-32 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-1.5 rounded-xl border-2 border-[#f2d072]/70 px-3 py-2 text-xs text-white max-w-[92vw]">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 pr-1 min-w-0">
              <Move className="h-3.5 w-3.5 text-[#f2d072] shrink-0" />
              <span className="font-semibold truncate">
                {getDecorationName(selectedDecorDef)}
              </span>
              <span className="hidden sm:inline text-[#9ec7d6] shrink-0">
                · {t('UI_DRAG_TO_MOVE')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => engine.flipPlacedDecoration(selectedDecor.instanceId)}
              className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-[#1a4357] px-2 text-[#d7f3fc] hover:bg-[#245973]"
            >
              <FlipHorizontal2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => engine.removePlacedDecoration(selectedDecor.instanceId)}
              className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-[#5e2a36] px-2 text-[#ffd5dc] hover:bg-[#783544]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => engine.selectPlacedDecoration(null)}
              className="min-h-[34px] flex items-center gap-1 rounded-lg bg-[#2d7a6e] px-2.5 font-semibold text-white hover:bg-[#389485] whitespace-nowrap"
            >
              <Check className="h-4 w-4" />
              <span>{t('UI_DONE')}</span>
            </button>
          </div>
          <div className="text-[11px] leading-snug text-[#b7e4f0]">
            <span className="font-semibold text-[#8ef0d8]">
              {getDecorationEffect(selectedDecorDef)}
            </span>
            {' · '}
            <span>{getDecorationDescription(selectedDecorDef)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
