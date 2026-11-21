import { GAME_CONFIG } from '../core/GameConfig';
import { PlacedDecoration, SaveGameState } from '../core/types';
import { FISH_BY_ID } from '../data/fishCatalog';
import { DECORATION_BY_ID } from '../data/decorationCatalog';
import { CREATURE_BY_ID } from '../data/creatureCatalog';
import { HABITAT_BY_ID } from '../data/habitatCatalog';
import { FishSimulation } from '../aquarium/FishSimulation';
import {
  getCreatureSprite,
  getDecorationSprite,
  getEggSprite,
  getFishSprite,
} from './PixelArtSprites';

/**
 * Crisp Integer-Scaled 16-Bit Pixel Art Aquarium Renderer (v2)
 * Renders water clarity & glass algae, river current streaks, equipment micro-bubbles,
 * breeding eggs, animated creatures, tappable Shell Coins/Pearls, and growth-scaled fish.
 */
export class AquariumRenderer {
  private bufferCanvas: HTMLCanvasElement;
  private bufferCtx: CanvasRenderingContext2D;
  pixelScale = 3;

  constructor() {
    this.bufferCanvas = document.createElement('canvas');
    this.bufferCanvas.width = 360;
    this.bufferCanvas.height = 240;
    this.bufferCtx = this.bufferCanvas.getContext('2d')!;
    this.bufferCtx.imageSmoothingEnabled = false;
  }

  render(
    targetCanvas: HTMLCanvasElement,
    state: SaveGameState,
    sim: FishSimulation,
    timeSec: number,
    options: {
      selectedDecorId: string | null;
      placingDecorId: string | null;
      hoverNormPos: { x: number; y: number } | null;
    }
  ): { worldWidth: number; worldHeight: number } {
    const cssW = targetCanvas.clientWidth || 360;
    const cssH = targetCanvas.clientHeight || 560;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const desiredTargetW = Math.round(cssW * dpr);
    const desiredTargetH = Math.round(cssH * dpr);
    if (targetCanvas.width !== desiredTargetW || targetCanvas.height !== desiredTargetH) {
      targetCanvas.width = desiredTargetW;
      targetCanvas.height = desiredTargetH;
    }

    this.pixelScale = cssW >= 900 ? 3 : 2.5;
    const worldW = Math.max(180, Math.round(cssW / this.pixelScale));
    const worldH = Math.max(200, Math.round(cssH / this.pixelScale));

    if (this.bufferCanvas.width !== worldW || this.bufferCanvas.height !== worldH) {
      this.bufferCanvas.width = worldW;
      this.bufferCanvas.height = worldH;
      this.bufferCtx.imageSmoothingEnabled = false;
      sim.resize(worldW, worldH);
    }

    const ctx = this.bufferCtx;
    const habitat = HABITAT_BY_ID[state.activeHabitatId] ?? HABITAT_BY_ID.pond;
    const mapState = state.mapStates[state.activeHabitatId];
    const pal = habitat.palette;
    const activeBg = state.activeBackgrounds[state.activeHabitatId];
    const hasGoldenTint = activeBg === 'golden_hour_tint';
    const hasReefLight = activeBg === 'reef_light';
    const waterLineY = Math.floor(worldH * 0.11);
    const floorY = Math.floor(worldH * 0.84);

    // 1. Stepped Pixel Water Gradient
    const bandCount = 12;
    const bandH = Math.ceil((worldH - waterLineY) / bandCount);
    ctx.fillStyle = pal.waterTop;
    ctx.fillRect(0, 0, worldW, waterLineY + 2);

    const grad = ctx.createLinearGradient(0, waterLineY, 0, worldH);
    grad.addColorStop(0, pal.waterTop);
    grad.addColorStop(0.45, pal.waterMid);
    grad.addColorStop(1, pal.waterBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, waterLineY, worldW, worldH - waterLineY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let i = 0; i < bandCount; i += 2) {
      ctx.fillRect(0, waterLineY + i * bandH, worldW, Math.floor(bandH * 0.5));
    }

    if (hasGoldenTint || hasReefLight) {
      const warm = ctx.createLinearGradient(0, 0, 0, worldH);
      warm.addColorStop(
        0,
        hasReefLight ? 'rgba(225, 252, 255, 0.22)' : 'rgba(255, 214, 128, 0.24)'
      );
      warm.addColorStop(
        0.65,
        hasReefLight ? 'rgba(170, 238, 255, 0.08)' : 'rgba(245, 185, 102, 0.08)'
      );
      warm.addColorStop(1, 'rgba(20, 40, 60, 0)');
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, worldW, worldH);
    }

    // 2. Soft Animated Diagonal Sunbeams
    ctx.save();
    ctx.fillStyle = hasGoldenTint ? 'rgba(255, 232, 168, 0.16)' : pal.sunbeamColor;
    for (let i = 0; i < 4; i++) {
      const sway = Math.sin(timeSec * 0.45 + i * 1.4) * 8;
      const bx = Math.floor(worldW * (0.12 + i * 0.24) + sway);
      const beamW = 14 + (i % 2) * 8;
      ctx.beginPath();
      ctx.moveTo(bx, waterLineY);
      ctx.lineTo(bx + beamW, waterLineY);
      ctx.lineTo(bx + beamW + 28, floorY + 8);
      ctx.lineTo(bx + 18, floorY + 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 3. Layered Parallax Distant Silhouettes
    this.drawParallaxBackdrop(ctx, worldW, floorY, pal.farSilhouette, pal.midSilhouette, timeSec);

    // 4. Undulating Water Surface & Shimmer
    ctx.fillStyle = 'rgba(235, 255, 255, 0.22)';
    for (let x = 0; x < worldW; x += 2) {
      const wy = Math.round(waterLineY + Math.sin(x * 0.09 + timeSec * 2.1) * 1.6);
      ctx.fillRect(x, wy, 2, 2);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let x = 0; x < worldW; x += 4) {
      const wy = Math.round(waterLineY + 4 + Math.cos(x * 0.07 + timeSec * 1.6) * 1.2);
      ctx.fillRect(x, wy, 3, 1);
    }

    // 5. Substrate Floor
    const activeSubstrateId = state.activeSubstrates[state.activeHabitatId];
    const substrateDef = activeSubstrateId ? DECORATION_BY_ID[activeSubstrateId] : null;
    const sandTop = substrateDef ? substrateDef.palette.primary : pal.sandTop;
    const sandBottom = substrateDef ? substrateDef.palette.secondary : pal.sandBottom;
    const sandHighlight = substrateDef ? substrateDef.palette.accent : '#f5e4be';

    for (let x = 0; x < worldW; x += 2) {
      const hill = Math.round(Math.sin(x * 0.045) * 2.5 + Math.cos(x * 0.09) * 1.2);
      const sy = floorY + hill;
      ctx.fillStyle = sandHighlight;
      ctx.fillRect(x, sy, 2, 2);
      ctx.fillStyle = sandTop;
      ctx.fillRect(x, sy + 2, 2, 10);
      ctx.fillStyle = sandBottom;
      ctx.fillRect(x, sy + 12, 2, worldH - (sy + 12));
    }

    for (let i = 0; i < 28; i++) {
      const gx = (i * 37 + 11) % worldW;
      const gy = floorY + 4 + ((i * 19) % Math.max(10, worldH - floorY - 6));
      ctx.fillStyle = i % 3 === 0 ? sandHighlight : sandBottom;
      ctx.fillRect(gx, gy, i % 4 === 0 ? 3 : 2, 1);
    }

    // 6. Ambient Bubbles, River Current Streaks & Map Particles
    for (const b of sim.bubbles) {
      ctx.fillStyle = `rgba(224, 252, 255, ${b.alpha.toFixed(2)})`;
      const r = Math.round(b.radius);
      ctx.fillRect(Math.round(b.x), Math.round(b.y), r, r);
      if (r >= 2) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.85, b.alpha + 0.25).toFixed(2)})`;
        ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
      }
    }

    if (habitat.ambientEffect === 'current') {
      ctx.fillStyle = 'rgba(225, 252, 255, 0.16)';
      for (let i = 0; i < 8; i++) {
        const sx = Math.round((i * 67 + timeSec * 46) % (worldW + 24)) - 20;
        const sy = Math.round(waterLineY + 18 + (i * 23) % Math.max(20, floorY - waterLineY - 26));
        ctx.fillRect(sx, sy, 14 + (i % 3) * 5, 1);
      }
    } else if (
      habitat.ambientEffect === 'bioluminescence' ||
      habitat.ambientEffect === 'plankton' ||
      habitat.ambientEffect === 'spores'
    ) {
      ctx.fillStyle = pal.ambientParticle;
      for (let i = 0; i < 16; i++) {
        const mx = Math.round((i * 53 + timeSec * (4 + (i % 3))) % worldW);
        const my = Math.round(
          waterLineY +
            14 +
            ((i * 29 + Math.sin(timeSec + i) * 6) % Math.max(20, floorY - waterLineY - 20))
        );
        const twinkle = 0.25 + 0.48 * (0.5 + 0.5 * Math.sin(timeSec * 2.5 + i));
        ctx.globalAlpha = twinkle;
        ctx.fillRect(mx, my, 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    // 7. Placed Decorations & Equipment
    const habitatDecors = state.placedDecorations
      .filter((d) => d.habitatId === state.activeHabitatId)
      .slice()
      .sort((a, b) => a.y - b.y);

    for (const decor of habitatDecors) {
      this.drawPlacedDecoration(
        ctx,
        decor,
        worldW,
        worldH,
        timeSec,
        options.selectedDecorId === decor.instanceId
      );
    }

    // 8. Ghost Preview when placing decoration
    if (options.placingDecorId && options.hoverNormPos) {
      const def = DECORATION_BY_ID[options.placingDecorId];
      if (def) {
        const sprite = getDecorationSprite(def);
        const dx = Math.round(options.hoverNormPos.x * worldW - sprite.width / 2);
        const dy = Math.round(options.hoverNormPos.y * worldH - sprite.height);
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.drawImage(sprite, dx, dy);
        ctx.strokeStyle = '#9bf5d8';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx - 1, dy - 1, sprite.width + 2, sprite.height + 2);
        ctx.restore();
      }
    }

    // 9. Breeding Eggs nestled near floor
    const activeEggs = state.placedEggs.filter((e) => e.habitatId === state.activeHabitatId);
    for (const egg of activeEggs) {
      const def = FISH_BY_ID[egg.fishId];
      const sprite = getEggSprite(def?.palette.primary ?? '#ffd980', egg.variant);
      const ex = Math.round(egg.x * worldW);
      const ey = Math.round(egg.y * worldH + Math.sin(timeSec * 3.5 + egg.x * 10) * 1.2);
      // Soft glowing aura around egg
      ctx.fillStyle =
        egg.variant !== 'normal' ? 'rgba(255, 232, 140, 0.28)' : 'rgba(180, 245, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(ex, ey, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(sprite, Math.round(ex - sprite.width / 2), Math.round(ey - sprite.height / 2));
    }

    // 10. Animated Map-Specific & Large Exotic Creatures
    for (const c of sim.creatures) {
      const def = CREATURE_BY_ID[c.creatureId];
      if (!def) continue;
      const frame: 0 | 1 = Math.sin(c.phase) >= 0 ? 0 : 1;
      const sprite = getCreatureSprite(def, frame);
      const scale = def.sizeScale ?? 1;
      const drawW = Math.round(sprite.width * scale);
      const drawH = Math.round(sprite.height * scale);
      ctx.save();
      ctx.translate(Math.round(c.x), Math.round(c.y));
      ctx.scale(c.facing, 1);
      ctx.drawImage(sprite, Math.round(-drawW / 2), Math.round(-drawH / 2), drawW, drawH);
      ctx.restore();
    }

    // 11. Sinking Food Pellets (Map-themed colors + gentle cyan halo on Auto Feed pellets)
    for (const p of sim.pellets) {
      if (!p.active) continue;
      if (p.isAutoFeed) {
        ctx.fillStyle = 'rgba(130, 240, 255, 0.35)';
        ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 6, 6);
      }
      ctx.fillStyle = '#4a2b19';
      ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 4, 4);
      ctx.fillStyle = p.color || '#f4b35b';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }

    // 11.5 Dying Fish Graceful Fade/Fall Animation
    for (const df of sim.dyingFishes) {
      const def = FISH_BY_ID[df.fishId];
      if (!def) continue;
      const sprite = getFishSprite(def, 0, df.variant);
      const stageScale = GAME_CONFIG.GROWTH_STAGE_VISUAL_SCALE[df.growthStage] ?? 1;
      const totalScale = def.size * stageScale;
      const drawW = Math.max(8, Math.round(sprite.width * totalScale));
      const drawH = Math.max(6, Math.round(sprite.height * totalScale));
      const alpha = Math.max(0, df.life / df.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha * 0.85;
      ctx.translate(Math.round(df.x), Math.round(df.y));
      ctx.scale(df.facing, -1); // Gentle belly-up fade
      ctx.drawImage(sprite, Math.round(-drawW / 2), Math.round(-drawH / 2), drawW, drawH);
      ctx.restore();
    }

    // 12. Autonomous Swimming Pixel Fish (Growth-scaled, Variant-tinted, Flexible Sway)
    const sortedFish = sim.fishes.slice().sort((a, b) => a.y - b.y);
    for (const fish of sortedFish) {
      const def = FISH_BY_ID[fish.fishId];
      if (!def) continue;
      const frame: 0 | 1 = Math.sin(fish.phase) >= 0 ? 0 : 1;
      const sprite = getFishSprite(def, frame, fish.variant);
      const stageScale = GAME_CONFIG.GROWTH_STAGE_VISUAL_SCALE[fish.growthStage] ?? 1;
      const totalScale = def.size * stageScale;
      const drawW = Math.max(8, Math.round(sprite.width * totalScale));
      const drawH = Math.max(6, Math.round(sprite.height * totalScale));

      const pitch =
        def.animationStyle === 'pulse'
          ? Math.sin(fish.phase) * 0.06
          : Math.max(-0.22, Math.min(0.22, fish.vy * 0.008));

      ctx.save();
      ctx.translate(Math.round(fish.x), Math.round(fish.y));
      ctx.scale(fish.facing, 1);
      ctx.rotate(pitch);
      ctx.drawImage(sprite, Math.round(-drawW / 2), Math.round(-drawH / 2), drawW, drawH);
      ctx.restore();

      // Happy heart glint right after feeding or petting
      if (fish.happyTimer > 2.2) {
        const hx = Math.round(fish.x);
        const hy = Math.round(fish.y - drawH / 2 - 5);
        ctx.fillStyle = '#ff9bb3';
        ctx.fillRect(hx - 1, hy, 1, 1);
        ctx.fillRect(hx + 1, hy, 1, 1);
        ctx.fillRect(hx - 1, hy + 1, 3, 1);
        ctx.fillRect(hx, hy + 2, 1, 1);
      } else if ((fish.hunger ?? 90) < 25) {
        // Urgent coral-red hungry pulse above starving/critical fish
        const blink = Math.sin(timeSec * 8) > -0.2;
        if (blink) {
          const sx = Math.round(fish.x);
          const sy = Math.round(fish.y - drawH / 2 - 5);
          ctx.fillStyle = '#ff6b6b';
          ctx.fillRect(sx - 1, sy, 3, 3);
          ctx.fillStyle = '#fff3f0';
          ctx.fillRect(sx, sy + 1, 1, 1);
        }
      } else if ((fish.hunger ?? 90) < 55 || fish.stressStage >= 3) {
        // Gentle amber warning dot above hungry or stressed fish
        const sx = Math.round(fish.x);
        const sy = Math.round(fish.y - drawH / 2 - 4);
        ctx.fillStyle = '#ffcf70';
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    // 13. Floating Tappable Shell Coins & Pearls from Creatures
    for (const coin of sim.creatureCoins) {
      const cx = Math.round(coin.x);
      const cy = Math.round(coin.y + Math.sin(coin.phase) * 2.5);
      const pulse = 0.32 + 0.22 * Math.sin(timeSec * 5 + coin.phase);

      ctx.fillStyle = coin.isPearl
        ? `rgba(186, 246, 255, ${pulse.toFixed(2)})`
        : `rgba(255, 224, 125, ${pulse.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();

      // Pixel Shell Coin or Luminous Pearl icon
      ctx.fillStyle = coin.isPearl ? '#2a5673' : '#5e3c14';
      ctx.fillRect(cx - 3, cy - 3, 7, 7);
      ctx.fillStyle = coin.isPearl ? '#d6f9ff' : '#ffd86b';
      ctx.fillRect(cx - 2, cy - 2, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
    }

    // 14. Shimmering Rare Visitor Fish
    if (sim.rareVisitor && sim.rareVisitor.active) {
      const rv = sim.rareVisitor;
      const def = FISH_BY_ID[rv.fishId];
      if (def) {
        const frame: 0 | 1 = Math.sin(rv.phase) >= 0 ? 0 : 1;
        const sprite = getFishSprite(def, frame, 'normal');
        const scale = def.size * 1.2;
        const drawW = Math.round(sprite.width * scale);
        const drawH = Math.round(sprite.height * scale);

        const pulse = 0.45 + 0.35 * Math.sin(timeSec * 6);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 232, 140, ${pulse.toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(Math.round(rv.x), Math.round(rv.y), Math.max(drawW, drawH) * 0.68, 0, Math.PI * 2);
        ctx.stroke();

        ctx.translate(Math.round(rv.x), Math.round(rv.y));
        ctx.scale(rv.facing, 1);
        ctx.drawImage(sprite, Math.round(-drawW / 2), Math.round(-drawH / 2), drawW, drawH);
        ctx.restore();
      }
    }

    // 15. Water Quality Cloudiness & Glass Algae Visual Feedback!
    const waterQ = mapState?.waterQuality ?? 92;
    if (waterQ < 70) {
      const murkAlpha = Math.min(0.32, ((70 - waterQ) / 70) * 0.34);
      ctx.fillStyle = `rgba(54, 110, 74, ${murkAlpha.toFixed(2)})`;
      ctx.fillRect(0, waterLineY, worldW, worldH - waterLineY);
    }

    const algae = mapState?.algaeLevel ?? 0;
    if (algae >= 18) {
      this.drawGlassAlgae(ctx, worldW, worldH, waterLineY, algae);
    }

    // 16. Tap Ripples & Sparkle Particles
    for (const r of sim.ripples) {
      ctx.strokeStyle = `rgba(210, 250, 255, ${Math.max(0, r.alpha).toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(Math.round(r.x), Math.round(r.y), Math.round(r.radius), 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const s of sim.sparkles) {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
    }
    ctx.globalAlpha = 1;

    // 17. Crisp Nearest-Neighbor Blit
    const targetCtx = targetCanvas.getContext('2d');
    if (targetCtx) {
      targetCtx.imageSmoothingEnabled = false;
      targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      targetCtx.drawImage(
        this.bufferCanvas,
        0,
        0,
        worldW,
        worldH,
        0,
        0,
        targetCanvas.width,
        targetCanvas.height
      );
    }

    return { worldWidth: worldW, worldHeight: worldH };
  }

  private drawGlassAlgae(
    ctx: CanvasRenderingContext2D,
    worldW: number,
    worldH: number,
    waterLineY: number,
    algaeLevel: number
  ): void {
    // Organic pixel algae clusters hugging left/right/bottom corners of the glass
    const intensity = Math.min(1, (algaeLevel - 15) / 85);
    const patchCount = Math.round(4 + intensity * 18);
    ctx.save();
    for (let i = 0; i < patchCount; i++) {
      const side = i % 3;
      const pxX =
        side === 0
          ? 2 + ((i * 7) % 16)
          : side === 1
            ? worldW - 8 - ((i * 9) % 16)
            : 14 + ((i * 37) % Math.max(20, worldW - 28));
      const pxY =
        side === 2
          ? worldH - 14 - ((i * 5) % 12)
          : waterLineY + 12 + ((i * 23) % Math.max(20, worldH - waterLineY - 28));
      const size = 3 + (i % 4);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(84, 156, 84, 0.38)' : 'rgba(118, 184, 94, 0.28)';
      ctx.fillRect(pxX, pxY, size, size);
      ctx.fillRect(pxX + 2, pxY - 1, Math.max(2, size - 1), Math.max(2, size - 1));
    }
    ctx.restore();
  }

  private drawParallaxBackdrop(
    ctx: CanvasRenderingContext2D,
    worldW: number,
    floorY: number,
    farColor: string,
    midColor: string,
    timeSec: number
  ): void {
    ctx.fillStyle = farColor;
    for (let x = 0; x < worldW; x += 2) {
      const h = Math.round(18 + Math.sin(x * 0.025) * 10 + Math.cos(x * 0.055 + 1.2) * 6);
      ctx.fillRect(x, floorY - h, 2, h + 6);
    }

    ctx.fillStyle = midColor;
    for (let x = 0; x < worldW; x += 2) {
      const h = Math.round(10 + Math.sin(x * 0.04 + 2.4) * 6 + Math.cos(x * 0.08) * 3);
      ctx.fillRect(x, floorY - h, 2, h + 4);
    }

    const reedPositions = [0.09, 0.14, 0.84, 0.91];
    for (const rp of reedPositions) {
      const rx = Math.floor(worldW * rp);
      for (let i = 0; i < 24; i++) {
        const sway = Math.round(Math.sin(timeSec * 1.4 + i * 0.25 + rp * 10) * (i / 10));
        ctx.fillRect(rx + sway, floorY - i, 2, 1);
      }
    }
  }

  private drawPlacedDecoration(
    ctx: CanvasRenderingContext2D,
    decor: PlacedDecoration,
    worldW: number,
    worldH: number,
    timeSec: number,
    isSelected: boolean
  ): void {
    const def = DECORATION_BY_ID[decor.decorationId];
    if (!def) return;
    const sprite = getDecorationSprite(def);

    const anchorX = Math.round(decor.x * worldW);
    const anchorY = Math.round(decor.y * worldH);

    const isSwaying =
      def.category === 'Plants' || def.shape === 'sea_fan' || def.shape === 'anemone';
    const swayOffset = isSwaying ? Math.round(Math.sin(timeSec * 1.8 + decor.x * 12) * 1.1) : 0;

    ctx.save();
    ctx.translate(anchorX, anchorY);
    if (decor.flipped) ctx.scale(-1, 1);

    ctx.fillStyle = 'rgba(7, 22, 34, 0.26)';
    ctx.fillRect(-Math.floor(sprite.width * 0.42), -1, Math.floor(sprite.width * 0.84), 2);

    ctx.drawImage(
      sprite,
      Math.round(-sprite.width / 2 + swayOffset * 0.5),
      Math.round(-sprite.height)
    );

    if (def.shape === 'lantern') {
      ctx.fillStyle = 'rgba(255, 232, 148, 0.16)';
      ctx.beginPath();
      ctx.arc(0, -sprite.height + 9, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (
      def.shape === 'air_stone' ||
      def.shape === 'filter_box' ||
      def.shape === 'water_pump' ||
      def.shape === 'chest' ||
      def.shape === 'pearl_clam'
    ) {
      // Rising oxygen micro-bubble curtain!
      const streamCount = def.shape === 'air_stone' ? 4 : 2;
      for (let b = 0; b < streamCount; b++) {
        const bubbleY = -sprite.height - ((timeSec * (16 + b * 4) + decor.x * 40 + b * 11) % 44);
        const bubbleX = Math.round(Math.sin(timeSec * 4 + b * 2) * 3 + (b - 1.5) * 2);
        ctx.fillStyle = 'rgba(225, 252, 255, 0.72)';
        ctx.fillRect(bubbleX, Math.round(bubbleY), 2, 2);
      }
    }

    if (isSelected) {
      ctx.strokeStyle = '#ffe58f';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        Math.round(-sprite.width / 2) - 2,
        Math.round(-sprite.height) - 2,
        sprite.width + 4,
        sprite.height + 4
      );
    }

    ctx.restore();
  }
}
