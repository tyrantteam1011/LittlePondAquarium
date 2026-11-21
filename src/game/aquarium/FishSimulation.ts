import { GAME_CONFIG } from '../core/GameConfig';
import {
  CreatureMovementProfile,
  GeneticVariant,
  GrowthStage,
  HabitatId,
  PlacedCreature,
  PlacedFish,
} from '../core/types';
import { FISH_BY_ID, FISH_CATALOG } from '../data/fishCatalog';
import { CREATURE_BY_ID } from '../data/creatureCatalog';
import { HABITAT_BY_ID } from '../data/habitatCatalog';
import { getHungerMultipliers } from '../feeding/HungerSystem';

export interface SimulatedFish {
  instanceId: string;
  fishId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  phase: number;
  pauseTimer: number;
  burstTimer: number;
  targetY: number;
  happyTimer: number;
  sparkleTimer: number;
  growthStage: GrowthStage;
  variant: GeneticVariant;
  stressStage: number;
  health: number;
  hunger: number;
}

export interface DyingFishEffect {
  fishId: string;
  variant: GeneticVariant;
  growthStage: GrowthStage;
  x: number;
  y: number;
  facing: 1 | -1;
  life: number;
  maxLife: number;
}

export interface SimulatedCreature {
  instanceId: string;
  creatureId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  phase: number;
  burstTimer: number;
  dropTimerSec: number;
  walkMode: 'floor' | 'mid' | 'stationary';
  movementProfile: CreatureMovementProfile;
}

export interface FloatingCreatureCoin {
  id: string;
  creatureId: string;
  x: number;
  y: number;
  value: number;
  phase: number;
  isPearl: boolean;
  ageSec: number;
}

export interface FoodPellet {
  id: number;
  x: number;
  y: number;
  vy: number;
  swayOffset: number;
  active: boolean;
  color: string;
  isAutoFeed?: boolean;
}

export interface BubbleParticle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wobblePhase: number;
  alpha: number;
}

export interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface WaterRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export interface RareVisitorState {
  active: boolean;
  fishId: string;
  x: number;
  y: number;
  facing: 1 | -1;
  speed: number;
  phase: number;
  remainingMs: number;
}

export class FishSimulation {
  worldWidth = 360;
  worldHeight = 240;

  fishes: SimulatedFish[] = [];
  dyingFishes: DyingFishEffect[] = [];
  creatures: SimulatedCreature[] = [];
  creatureCoins: FloatingCreatureCoin[] = [];
  pellets: FoodPellet[] = [];
  bubbles: BubbleParticle[] = [];
  sparkles: SparkleParticle[] = [];
  ripples: WaterRipple[] = [];
  rareVisitor: RareVisitorState | null = null;

  private nextPelletId = 1;
  private nextRareVisitorCountdownMs = 38_000;
  private currentHabitatId: HabitatId = 'pond';
  private activeDiscoveredIds: string[] = ['guppy'];
  private currentOxygen = 90;
  private autoCollectEnabled = false;
  private coinValueResolver: ((creatureId: string) => number) | null = null;
  private autoCollectCallback: ((coin: FloatingCreatureCoin) => void) | null = null;

  constructor() {
    for (let i = 0; i < 24; i++) {
      this.bubbles.push({
        x: Math.random() * this.worldWidth,
        y: Math.random() * this.worldHeight,
        radius: Math.random() < 0.65 ? 1.5 : 2.5,
        speed: 10 + Math.random() * 16,
        wobblePhase: Math.random() * Math.PI * 2,
        alpha: 0.25 + Math.random() * 0.4,
      });
    }
  }

  configureEcosystemBridge(
    oxygen: number,
    autoCollectEnabled: boolean,
    coinValueResolver: (creatureId: string) => number,
    autoCollectCallback: (coin: FloatingCreatureCoin) => void
  ): void {
    this.currentOxygen = oxygen;
    this.autoCollectEnabled = autoCollectEnabled;
    this.coinValueResolver = coinValueResolver;
    this.autoCollectCallback = autoCollectCallback;
  }

  resize(width: number, height: number): void {
    const prevW = this.worldWidth || 360;
    const prevH = this.worldHeight || 240;
    this.worldWidth = Math.max(220, width);
    this.worldHeight = Math.max(180, height);

    const sx = this.worldWidth / prevW;
    const sy = this.worldHeight / prevH;

    for (const f of this.fishes) {
      f.x = Math.max(22, Math.min(this.worldWidth - 22, f.x * sx));
      f.y = Math.max(34, Math.min(this.worldHeight - 36, f.y * sy));
      f.targetY = Math.max(34, Math.min(this.worldHeight - 36, f.targetY * sy));
    }
    for (const c of this.creatures) {
      c.x = Math.max(18, Math.min(this.worldWidth - 18, c.x * sx));
      c.y = Math.max(this.worldHeight * 0.35, Math.min(this.worldHeight * 0.88, c.y * sy));
    }
    for (const coin of this.creatureCoins) {
      coin.x = Math.max(18, Math.min(this.worldWidth - 18, coin.x * sx));
      coin.y = Math.max(this.worldHeight * 0.24, Math.min(this.worldHeight * 0.84, coin.y * sy));
    }
    for (const b of this.bubbles) {
      b.x = Math.random() * this.worldWidth;
      b.y = Math.random() * this.worldHeight;
    }
  }

  syncPlacedFish(
    placedFish: PlacedFish[],
    activeHabitatId: HabitatId,
    discoveredFishIds: string[]
  ): void {
    this.activeDiscoveredIds = discoveredFishIds;
    const habitatChanged = this.currentHabitatId !== activeHabitatId;
    this.currentHabitatId = activeHabitatId;

    if (habitatChanged) {
      this.creatureCoins = [];
    }

    const inTank = placedFish.filter((f) => f.habitatId === activeHabitatId);
    const existingMap = new Map(this.fishes.map((f) => [f.instanceId, f]));

    const nextFishes: SimulatedFish[] = [];
    for (const pf of inTank) {
      const existing = !habitatChanged ? existingMap.get(pf.instanceId) : undefined;
      if (existing) {
        existing.growthStage = pf.growthStage;
        existing.variant = pf.variant;
        existing.stressStage = pf.stressStage;
        existing.health = pf.health;
        existing.hunger = pf.hunger ?? 90;
        nextFishes.push(existing);
      } else {
        const def = FISH_BY_ID[pf.fishId];
        const depth = def?.preferredDepth ?? 'mid';
        const minY =
          depth === 'surface'
            ? this.worldHeight * 0.17
            : depth === 'bottom'
              ? this.worldHeight * 0.72
              : depth === 'deep'
                ? this.worldHeight * 0.45
                : this.worldHeight * 0.24;
        const maxY =
          depth === 'surface'
            ? this.worldHeight * 0.45
            : depth === 'bottom'
              ? this.worldHeight * 0.84
              : this.worldHeight * 0.74;
        const y = minY + Math.random() * Math.max(10, maxY - minY);
        const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        const speed = (def?.speed ?? 36) * (0.75 + Math.random() * 0.45);
        nextFishes.push({
          instanceId: pf.instanceId,
          fishId: pf.fishId,
          x: 34 + Math.random() * Math.max(40, this.worldWidth - 68),
          y,
          vx: dir * speed,
          vy: (Math.random() - 0.5) * 6,
          facing: dir,
          phase: Math.random() * Math.PI * 2,
          pauseTimer: 0,
          burstTimer: 0,
          targetY: y,
          happyTimer: 1.5,
          sparkleTimer: 0.6 + Math.random() * 1.4,
          growthStage: pf.growthStage,
          variant: pf.variant,
          stressStage: pf.stressStage,
          health: pf.health,
          hunger: pf.hunger ?? 90,
        });
      }
    }

    this.fishes = nextFishes;
  }

  triggerFishDeathAnimation(instanceId: string): void {
    const found = this.fishes.find((f) => f.instanceId === instanceId);
    if (!found) return;
    this.dyingFishes.push({
      fishId: found.fishId,
      variant: found.variant,
      growthStage: found.growthStage,
      x: found.x,
      y: found.y,
      facing: found.facing,
      life: 2.2,
      maxLife: 2.2,
    });
    for (let i = 0; i < 6; i++) {
      this.sparkles.push({
        x: found.x + (Math.random() - 0.5) * 10,
        y: found.y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 10,
        vy: -14 - Math.random() * 10,
        life: 0.9,
        maxLife: 0.9,
        color: '#c7e8ff',
        size: 2,
      });
    }
  }

  syncPlacedCreatures(placedCreatures: PlacedCreature[], activeHabitatId: HabitatId): void {
    const inTank = placedCreatures.filter((c) => c.habitatId === activeHabitatId);
    const existingMap = new Map(this.creatures.map((c) => [c.instanceId, c]));
    const nextCreatures: SimulatedCreature[] = [];

    for (const pc of inTank) {
      const existing = existingMap.get(pc.instanceId);
      if (existing) {
        nextCreatures.push(existing);
      } else {
        const def = CREATURE_BY_ID[pc.creatureId];
        const profile: CreatureMovementProfile =
          def?.movementProfile ??
          (def?.type === 'squid'
            ? 'squid_dart'
            : def?.type === 'octopus'
              ? 'octopus_burst'
              : def?.type === 'clam' || def?.type === 'mussel' || def?.type === 'starfish'
                ? 'stationary'
                : def?.type === 'snail'
                  ? 'snail_crawl'
                  : def?.type === 'shrimp'
                    ? 'shrimp_dart'
                    : 'crab_scuttle');

        const isMid =
          profile === 'shark_sweep' ||
          profile === 'ray_glide' ||
          profile === 'turtle_swim' ||
          profile === 'jelly_drift' ||
          profile === 'squid_dart' ||
          profile === 'octopus_burst' ||
          profile === 'seahorse_bob' ||
          profile === 'frog_hop';
        const isStationary = profile === 'stationary';
        const walkMode: SimulatedCreature['walkMode'] = isMid
          ? 'mid'
          : isStationary
            ? 'stationary'
            : 'floor';

        const y =
          profile === 'frog_hop'
            ? this.worldHeight * (0.22 + Math.random() * 0.25)
            : isMid
              ? this.worldHeight * (0.26 + Math.random() * 0.42)
              : this.worldHeight * (0.83 + Math.random() * 0.05);
        const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        const speedByProfile: Record<CreatureMovementProfile, number> = {
          shark_sweep: 28,
          ray_glide: 18,
          turtle_swim: 15,
          jelly_drift: 6,
          squid_dart: 26,
          octopus_burst: 14,
          snail_crawl: 5.5,
          crab_scuttle: 11,
          stationary: 0,
          seahorse_bob: 7,
          frog_hop: 16,
          shrimp_dart: 18,
        };
        nextCreatures.push({
          instanceId: pc.instanceId,
          creatureId: pc.creatureId,
          x: 28 + Math.random() * Math.max(40, this.worldWidth - 56),
          y,
          vx: dir * speedByProfile[profile],
          vy: 0,
          facing: dir,
          phase: Math.random() * Math.PI * 2,
          burstTimer: 0,
          dropTimerSec: (def?.coinDropIntervalSec ?? 12) * (0.35 + Math.random() * 0.5),
          walkMode,
          movementProfile: profile,
        });
      }
    }

    this.creatures = nextCreatures;
  }

  dropFood(
    count: number = GAME_CONFIG.FEED_PELLETS_COUNT,
    color = '#f4b35b',
    isAutoFeed = false
  ): void {
    for (let i = 0; i < count; i++) {
      this.pellets.push({
        id: this.nextPelletId++,
        x: this.worldWidth * (0.18 + Math.random() * 0.64),
        y: this.worldHeight * 0.1 + Math.random() * 10,
        vy: 14 + Math.random() * 8,
        swayOffset: Math.random() * Math.PI * 2,
        active: true,
        color,
        isAutoFeed,
      });
    }
    for (const fish of this.fishes) {
      fish.happyTimer = isAutoFeed ? 3.2 : 6;
      fish.pauseTimer = 0;
    }
  }

  addRipple(x: number, y: number, color = '#c7f9ff'): void {
    this.ripples.push({
      x,
      y,
      radius: 4,
      maxRadius: 26,
      alpha: 0.75,
    });
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.5;
      this.sparkles.push({
        x,
        y,
        vx: Math.cos(angle) * (14 + Math.random() * 12),
        vy: Math.sin(angle) * (14 + Math.random() * 12) - 6,
        life: 0.55,
        maxLife: 0.55,
        color,
        size: 2,
      });
    }
  }

  spawnCelebrationBurst(x: number, y: number, color = '#ffe58f'): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
      const spd = 22 + Math.random() * 34;
      this.sparkles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 10,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        color,
        size: Math.random() < 0.5 ? 2 : 3,
      });
    }
  }

  spawnRareVisitorNow(preferredFishId?: string): void {
    let candidateId = preferredFishId;
    if (!candidateId) {
      const undiscovered = FISH_CATALOG.filter(
        (f) =>
          !this.activeDiscoveredIds.includes(f.id) &&
          (f.rarity === 'Rare' || f.rarity === 'Epic' || f.rarity === 'Legendary')
      );
      const pool =
        undiscovered.length > 0
          ? undiscovered
          : FISH_CATALOG.filter((f) => f.rarity !== 'Common');
      const pick = pool[Math.floor(Math.random() * pool.length)] ?? FISH_CATALOG[0];
      candidateId = pick.id;
    }

    const fromLeft = Math.random() < 0.5;
    this.rareVisitor = {
      active: true,
      fishId: candidateId,
      x: fromLeft ? -26 : this.worldWidth + 26,
      y: this.worldHeight * (0.26 + Math.random() * 0.36),
      facing: fromLeft ? 1 : -1,
      speed: 26,
      phase: 0,
      remainingMs: GAME_CONFIG.RARE_VISITOR_SWIM_DURATION_MS,
    };
  }

  hitTestCreatureCoin(x: number, y: number): FloatingCreatureCoin | null {
    for (let i = this.creatureCoins.length - 1; i >= 0; i--) {
      const coin = this.creatureCoins[i];
      const dx = x - coin.x;
      const dy = y - coin.y;
      if (dx * dx + dy * dy <= 22 * 22) {
        this.creatureCoins.splice(i, 1);
        this.spawnCelebrationBurst(coin.x, coin.y, coin.isPearl ? '#e3f9ff' : '#ffe58f');
        return coin;
      }
    }
    return null;
  }

  takeAllCreatureCoins(): FloatingCreatureCoin[] {
    const taken = [...this.creatureCoins];
    for (const c of taken) {
      this.spawnCelebrationBurst(c.x, c.y, c.isPearl ? '#e3f9ff' : '#ffe58f');
    }
    this.creatureCoins = [];
    return taken;
  }

  hitTestRareVisitor(x: number, y: number): RareVisitorState | null {
    if (!this.rareVisitor || !this.rareVisitor.active) return null;
    const dx = x - this.rareVisitor.x;
    const dy = y - this.rareVisitor.y;
    if (dx * dx + dy * dy <= 34 * 34) {
      const captured = { ...this.rareVisitor };
      this.spawnCelebrationBurst(captured.x, captured.y, '#ffe896');
      this.rareVisitor = null;
      this.resetRareVisitorTimer();
      return captured;
    }
    return null;
  }

  hitTestFish(x: number, y: number): SimulatedFish | null {
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const f = this.fishes[i];
      const dx = x - f.x;
      const dy = y - f.y;
      if (dx * dx + dy * dy <= 24 * 24) {
        f.happyTimer = 3.5;
        f.burstTimer = 0.65;
        this.addRipple(f.x, f.y, '#ffe58f');
        return f;
      }
    }
    return null;
  }

  private resetRareVisitorTimer(): void {
    const min = GAME_CONFIG.RARE_VISITOR_MIN_INTERVAL_MS;
    const max = GAME_CONFIG.RARE_VISITOR_MAX_INTERVAL_MS;
    this.nextRareVisitorCountdownMs = min + Math.random() * (max - min);
  }

  update(dtSeconds: number): void {
    const dt = Math.min(dtSeconds, 0.06);
    const waterTop = this.worldHeight * 0.14;
    const floorY = this.worldHeight * 0.85;
    const habitat = HABITAT_BY_ID[this.currentHabitatId];
    const currentStrength = habitat?.currentStrength ?? 0;

    // 1. Update food pellets
    for (const p of this.pellets) {
      if (!p.active) continue;
      p.y += p.vy * dt;
      p.x += (Math.sin(p.y * 0.08 + p.swayOffset) * 8 + currentStrength * 14) * dt;
      if (p.y >= floorY) p.active = false;
    }
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      if (!this.pellets[i].active) this.pellets.splice(i, 1);
    }

    // 1.5 Update Dying Fish graceful fade/fall animation
    for (let i = this.dyingFishes.length - 1; i >= 0; i--) {
      const df = this.dyingFishes[i];
      df.life -= dt;
      df.y += 10 * dt;
      if (df.life <= 0) {
        this.dyingFishes.splice(i, 1);
      }
    }

    // 2. Update autonomous fish with Dynamic Safe Boundaries, Hunger Slowdown & Natural Schooling
    for (let i = 0; i < this.fishes.length; i++) {
      const fish = this.fishes[i];
      const def = FISH_BY_ID[fish.fishId];
      const stageSpeedMult = GAME_CONFIG.GROWTH_STAGE_SPEED_MULT[fish.growthStage] ?? 1;
      const stressSlowdown = fish.stressStage >= 4 ? 0.62 : fish.stressStage >= 2 ? 0.82 : 1.0;
      const hungerSpeedMult = getHungerMultipliers(fish.hunger ?? 90).speedMult;
      const baseSpeed = (def?.speed ?? 36) * stageSpeedMult * stressSlowdown * hungerSpeedMult;
      const behavior = def?.behavior ?? 'schooling';
      const isBottom = behavior === 'bottom' || def?.preferredDepth === 'bottom';
      const isSurface = def?.preferredDepth === 'surface';
      const fishRadius = Math.round(
        10 * (def?.size ?? 1) * (GAME_CONFIG.GROWTH_STAGE_VISUAL_SCALE[fish.growthStage] ?? 1)
      );

      fish.phase += dt * (fish.burstTimer > 0 ? 11 : 5.2 * stressSlowdown * hungerSpeedMult);
      if (fish.happyTimer > 0) fish.happyTimer = Math.max(0, fish.happyTimer - dt);
      if (fish.burstTimer > 0) fish.burstTimer = Math.max(0, fish.burstTimer - dt);

      // Look for nearest active food pellet (starving fish actively search wider!)
      let nearestPellet: FoodPellet | null = null;
      const seekRange = (fish.hunger ?? 90) < 40 ? 280 : 180;
      let nearestDistSq = seekRange * seekRange;
      for (const p of this.pellets) {
        if (!p.active) continue;
        const dx = p.x - fish.x;
        const dy = p.y - fish.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < nearestDistSq) {
          nearestDistSq = dSq;
          nearestPellet = p;
        }
      }

      if (nearestPellet) {
        const dx = nearestPellet.x - fish.x;
        const dy = nearestPellet.y - fish.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const seekSpeed = baseSpeed * 1.55;
        fish.vx += ((dx / dist) * seekSpeed - fish.vx) * dt * 4;
        fish.vy += ((dy / dist) * seekSpeed - fish.vy) * dt * 4;
        if (dist < 10) {
          nearestPellet.active = false;
          fish.happyTimer = 4;
          this.sparkles.push({
            x: nearestPellet.x,
            y: nearestPellet.y,
            vx: (Math.random() - 0.5) * 14,
            vy: -16,
            life: 0.55,
            maxLife: 0.55,
            color: '#fff2a6',
            size: 2,
          });
        }
      } else {
        if (fish.pauseTimer > 0) {
          fish.pauseTimer -= dt;
          fish.vx *= 0.94;
          fish.vy *= 0.92;
        } else {
          if (Math.random() < dt * (behavior === 'glider' ? 0.14 : 0.07)) {
            fish.pauseTimer = 0.65 + Math.random() * 1.0;
          }
          if (Math.random() < dt * (behavior === 'fast' ? 0.25 : 0.08)) {
            fish.burstTimer = 0.55 + Math.random() * 0.65;
          }

          // Vertical depth target (drift slightly higher if oxygen is low)
          if (Math.random() < dt * 0.35) {
            const lowO2Lift = this.currentOxygen < 55 ? -this.worldHeight * 0.15 : 0;
            const minY = isBottom
              ? this.worldHeight * 0.67
              : waterTop + fishRadius + 4;
            const maxY = isBottom
              ? floorY - fishRadius * 0.5
              : isSurface
                ? this.worldHeight * 0.52
                : this.worldHeight * 0.76;
            fish.targetY = Math.max(
              waterTop + fishRadius + 4,
              minY + Math.random() * Math.max(8, maxY - minY) + lowO2Lift
            );
          }

          // Natural Schooling: Cohesion + Alignment + Separation
          const isSchooler = def && def.schoolingBehavior !== 'solitary';
          if (isSchooler) {
            let avgX = 0;
            let avgY = 0;
            let avgVx = 0;
            let avgVy = 0;
            let count = 0;
            let sepX = 0;
            let sepY = 0;
            for (let j = 0; j < this.fishes.length; j++) {
              if (i === j) continue;
              const other = this.fishes[j];
              if (other.fishId !== fish.fishId) continue;
              const dx = other.x - fish.x;
              const dy = other.y - fish.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < 110 * 110 && distSq > 1) {
                avgX += other.x;
                avgY += other.y;
                avgVx += other.vx;
                avgVy += other.vy;
                count++;
                if (distSq < 18 * 18) {
                  const dist = Math.sqrt(distSq);
                  sepX -= (dx / dist) * 26;
                  sepY -= (dy / dist) * 22;
                }
              }
            }
            if (count > 0) {
              avgX /= count;
              avgY /= count;
              avgVx /= count;
              avgVy /= count;
              fish.vx += ((avgX - fish.x) * 0.32 + (avgVx - fish.vx) * 0.5 + sepX) * dt;
              fish.vy += ((avgY - fish.y) * 0.32 + (avgVy - fish.vy) * 0.4 + sepY) * dt;
            }
          } else {
            // Solo personal space
            for (let j = 0; j < this.fishes.length; j++) {
              if (i === j) continue;
              const other = this.fishes[j];
              const dx = fish.x - other.x;
              const dy = fish.y - other.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < 54 * 54 && distSq > 1) {
                const dist = Math.sqrt(distSq);
                fish.vx += (dx / dist) * 24 * dt;
                fish.vy += (dy / dist) * 18 * dt;
              }
            }
          }

          const desiredSpeed =
            baseSpeed * (fish.burstTimer > 0 ? 1.55 : 0.85 + Math.sin(fish.phase * 0.25) * 0.15);
          const dir = fish.vx >= 0 ? 1 : -1;
          fish.vx += (dir * desiredSpeed - fish.vx) * dt * 1.6;
          fish.vy += ((fish.targetY - fish.y) * 0.9 - fish.vy) * dt * 2.0;

          // Subtle directional river current nudge
          if (currentStrength > 0.1) {
            fish.vx += currentStrength * 6.5 * dt;
          }

          if (
            Math.random() < dt * 0.08 &&
            fish.x > fishRadius + 30 &&
            fish.x < this.worldWidth - fishRadius - 30
          ) {
            fish.vx = -fish.vx;
          }
        }
      }

      fish.x += fish.vx * dt;
      const bobAmp = def?.animationStyle === 'pulse' ? 7.5 : 3.5;
      fish.y += fish.vy * dt + Math.sin(fish.phase) * bobAmp * dt;

      // Dynamic Safe Boundaries (guaranteed inside water volume)
      const marginX = Math.max(18, fishRadius + 8);
      if (fish.x < marginX) {
        fish.x = marginX;
        fish.vx = Math.abs(fish.vx) + 12;
      } else if (fish.x > this.worldWidth - marginX) {
        fish.x = this.worldWidth - marginX;
        fish.vx = -Math.abs(fish.vx) - 12;
      }

      const minY = isBottom ? this.worldHeight * 0.64 : waterTop + fishRadius + 2;
      const maxY = isBottom ? floorY - 3 : floorY - fishRadius * 0.6;
      if (fish.y < minY) {
        fish.y = minY;
        fish.vy = Math.abs(fish.vy);
      } else if (fish.y > maxY) {
        fish.y = maxY;
        fish.vy = -Math.abs(fish.vy);
      }

      if (Math.abs(fish.vx) > 2.2) {
        fish.facing = fish.vx >= 0 ? 1 : -1;
      }

      // Shimmer particles for Rare+ or Rare Genetic Variants!
      if (
        (def && (def.rarity === 'Epic' || def.rarity === 'Legendary' || def.rarity === 'Rare')) ||
        fish.variant !== 'normal'
      ) {
        fish.sparkleTimer -= dt;
        if (fish.sparkleTimer <= 0) {
          fish.sparkleTimer =
            fish.variant !== 'normal'
              ? 0.55
              : def?.rarity === 'Legendary'
                ? 0.55
                : def?.rarity === 'Epic'
                  ? 0.9
                  : 1.6;
          this.sparkles.push({
            x: fish.x - fish.facing * 7 + (Math.random() - 0.5) * 6,
            y: fish.y + (Math.random() - 0.5) * 6,
            vx: -fish.facing * 6,
            vy: -10 - Math.random() * 8,
            life: 0.72,
            maxLife: 0.72,
            color:
              fish.variant === 'golden'
                ? '#fff099'
                : fish.variant === 'sakura'
                  ? '#ffc2da'
                  : fish.variant === 'prism'
                    ? '#9ef7f0'
                    : def?.rarity === 'Legendary'
                      ? '#fff3a1'
                      : def?.rarity === 'Epic'
                        ? '#d5b8ff'
                        : '#a3f7ff',
            size: 2,
          });
        }
      }
    }

    // 3. Update Map-Specific Creatures with Distinct Movement Profiles & Coin Drops
    for (const c of this.creatures) {
      const def = CREATURE_BY_ID[c.creatureId];
      if (!def) continue;
      const profile = c.movementProfile;
      c.phase += dt * (profile === 'jelly_drift' ? 2.6 : profile === 'shark_sweep' ? 5.2 : c.walkMode === 'mid' ? 4.2 : 3.2);
      if (c.burstTimer > 0) c.burstTimer = Math.max(0, c.burstTimer - dt);

      const padX = Math.round(18 * (def.sizeScale ?? 1));

      switch (profile) {
        case 'shark_sweep': {
          // Large smooth continuous horizontal sweep with gentle deep curve
          c.x += c.vx * dt;
          c.y += Math.sin(c.phase * 0.45) * 6 * dt;
          if (c.x < padX + 10) {
            c.x = padX + 10;
            c.vx = Math.abs(c.vx);
          } else if (c.x > this.worldWidth - padX - 10) {
            c.x = this.worldWidth - padX - 10;
            c.vx = -Math.abs(c.vx);
          }
          c.y = Math.max(waterTop + 26, Math.min(floorY - 28, c.y));
          c.facing = c.vx >= 0 ? 1 : -1;
          break;
        }
        case 'ray_glide': {
          // Slow elegant wide-wing vertical wave glide
          c.x += c.vx * dt;
          c.y += Math.sin(c.phase * 0.55) * 11 * dt;
          if (c.x < padX + 8) {
            c.x = padX + 8;
            c.vx = Math.abs(c.vx);
          } else if (c.x > this.worldWidth - padX - 8) {
            c.x = this.worldWidth - padX - 8;
            c.vx = -Math.abs(c.vx);
          }
          c.y = Math.max(waterTop + 24, Math.min(floorY - 24, c.y));
          c.facing = c.vx >= 0 ? 1 : -1;
          break;
        }
        case 'turtle_swim': {
          // Slow steady flipper glide with occasional gentle diagonal ascent
          const stroke = 0.75 + 0.35 * Math.sin(c.phase * 0.9);
          c.x += c.vx * stroke * dt;
          c.y += Math.cos(c.phase * 0.4) * 7 * dt;
          if (c.x < padX + 6) {
            c.x = padX + 6;
            c.vx = Math.abs(c.vx);
          } else if (c.x > this.worldWidth - padX - 6) {
            c.x = this.worldWidth - padX - 6;
            c.vx = -Math.abs(c.vx);
          }
          c.y = Math.max(waterTop + 20, Math.min(floorY - 22, c.y));
          c.facing = c.vx >= 0 ? 1 : -1;
          break;
        }
        case 'jelly_drift': {
          // Rhythmic vertical pulse upward, slow graceful sink downward
          const pulseUp = Math.sin(c.phase) > 0.25 ? -13 : 5.5;
          c.y += pulseUp * dt;
          c.x += (c.vx * 0.65 + Math.sin(c.phase * 0.5) * 5) * dt;
          if (c.x < 22) {
            c.x = 22;
            c.vx = Math.abs(c.vx);
          } else if (c.x > this.worldWidth - 22) {
            c.x = this.worldWidth - 22;
            c.vx = -Math.abs(c.vx);
          }
          if (c.y < waterTop + 22) c.y = waterTop + 22;
          if (c.y > floorY - 24) c.y = floorY - 24;
          break;
        }
        case 'squid_dart': {
          // Fast directional jet darts with brief glide recovery
          if (c.burstTimer <= 0 && Math.random() < dt * 0.55) {
            c.burstTimer = 0.45;
            if (Math.random() < 0.35) c.vx = -c.vx;
          }
          const dartMult = c.burstTimer > 0 ? 2.1 : 0.65;
          c.x += c.vx * dartMult * dt;
          c.y += Math.sin(c.phase * 0.8) * 10 * dt;
          if (c.x < 22) {
            c.x = 22;
            c.vx = Math.abs(c.vx);
          } else if (c.x > this.worldWidth - 22) {
            c.x = this.worldWidth - 22;
            c.vx = -Math.abs(c.vx);
          }
          c.y = Math.max(waterTop + 20, Math.min(floorY - 18, c.y));
          c.facing = c.vx >= 0 ? 1 : -1;
          break;
        }
        case 'octopus_burst': {
          // Short bursts alternating with calm hovering
          if (c.burstTimer <= 0 && Math.random() < dt * 0.4) {
            c.burstTimer = 0.6;
          }
          const burstMult = c.burstTimer > 0 ? 1.85 : 0.35;
          c.x += c.vx * burstMult * dt;
          c.y += Math.sin(c.phase * 0.6) * 8 * dt;
          if (c.x < 22) {
            c.x = 22;
            c.vx = Math.abs(c.vx);
          } else if (c.x > this.worldWidth - 22) {
            c.x = this.worldWidth - 22;
            c.vx = -Math.abs(c.vx);
          }
          c.y = Math.max(waterTop + 26, Math.min(floorY - 14, c.y));
          c.facing = c.vx >= 0 ? 1 : -1;
          break;
        }
        case 'seahorse_bob': {
          c.x += c.vx * 0.7 * dt;
          c.y += Math.sin(c.phase * 1.1) * 9 * dt;
          if (c.x < 20) {
            c.x = 20;
            c.vx = Math.abs(c.vx);
          } else if (c.x > this.worldWidth - 20) {
            c.x = this.worldWidth - 20;
            c.vx = -Math.abs(c.vx);
          }
          c.y = Math.max(waterTop + 22, Math.min(floorY - 18, c.y));
          c.facing = c.vx >= 0 ? 1 : -1;
          break;
        }
        case 'frog_hop': {
          if (c.burstTimer <= 0 && Math.random() < dt * 0.45) {
            c.burstTimer = 0.5;
          }
          const kick = c.burstTimer > 0 ? 1.7 : 0.4;
          c.x += c.vx * kick * dt;
          c.y += Math.sin(c.phase * 1.2) * 8 * dt;
          if (c.x < 20) {
            c.x = 20;
            c.vx = Math.abs(c.vx);
          } else if (c.x > this.worldWidth - 20) {
            c.x = this.worldWidth - 20;
            c.vx = -Math.abs(c.vx);
          }
          c.y = Math.max(waterTop + 14, Math.min(this.worldHeight * 0.56, c.y));
          c.facing = c.vx >= 0 ? 1 : -1;
          break;
        }
        case 'stationary':
          break;
        case 'snail_crawl':
        case 'crab_scuttle':
        case 'shrimp_dart':
        default: {
          c.x += c.vx * dt;
          if (Math.random() < dt * (profile === 'shrimp_dart' ? 0.28 : 0.14)) {
            c.vx = -c.vx;
          }
          if (c.x < 18) {
            c.x = 18;
            c.vx = Math.abs(c.vx);
          } else if (c.x > this.worldWidth - 18) {
            c.x = this.worldWidth - 18;
            c.vx = -Math.abs(c.vx);
          }
          c.facing = c.vx >= 0 ? 1 : -1;
          break;
        }
      }

      // Drop Shell Coins / Pearls periodically
      c.dropTimerSec -= dt;
      if (c.dropTimerSec <= 0) {
        c.dropTimerSec = Math.max(5, def.coinDropIntervalSec * (0.85 + Math.random() * 0.3));
        const val = this.coinValueResolver ? this.coinValueResolver(c.creatureId) : def.coinDropValue;
        const coin: FloatingCreatureCoin = {
          id: `ccoin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          creatureId: c.creatureId,
          x: Math.max(20, Math.min(this.worldWidth - 20, c.x + (Math.random() - 0.5) * 8)),
          y: Math.max(waterTop + 24, c.y - 12),
          value: val,
          phase: Math.random() * Math.PI * 2,
          isPearl: def.type === 'clam' || def.type === 'mussel' || def.type === 'octopus',
          ageSec: 0,
        };

        if (this.autoCollectEnabled && this.autoCollectCallback) {
          this.spawnCelebrationBurst(coin.x, coin.y, coin.isPearl ? '#dff9ff' : '#ffe58f');
          this.autoCollectCallback(coin);
        } else if (this.creatureCoins.length < 14) {
          this.creatureCoins.push(coin);
        }
      }
    }

    // Gentle bobbing for floating creature coins
    for (let i = this.creatureCoins.length - 1; i >= 0; i--) {
      const coin = this.creatureCoins[i];
      coin.phase += dt * 3.5;
      coin.ageSec += dt;
      if (this.autoCollectEnabled && this.autoCollectCallback && coin.ageSec > 0.6) {
        this.creatureCoins.splice(i, 1);
        this.spawnCelebrationBurst(coin.x, coin.y, '#ffe58f');
        this.autoCollectCallback(coin);
      }
    }

    // 4. Update Rare Visitor event
    if (this.rareVisitor && this.rareVisitor.active) {
      const rv = this.rareVisitor;
      rv.phase += dt * 6;
      rv.x += rv.facing * rv.speed * dt;
      rv.y += Math.sin(rv.phase * 0.8) * 14 * dt;
      rv.remainingMs -= dt * 1000;

      if (Math.random() < dt * 8) {
        this.sparkles.push({
          x: rv.x - rv.facing * 10,
          y: rv.y + (Math.random() - 0.5) * 8,
          vx: -rv.facing * 10,
          vy: -10 - Math.random() * 10,
          life: 0.8,
          maxLife: 0.8,
          color: '#ffe680',
          size: 2,
        });
      }

      const offscreen =
        (rv.facing === 1 && rv.x > this.worldWidth + 36) ||
        (rv.facing === -1 && rv.x < -36);
      if (offscreen || rv.remainingMs <= 0) {
        this.rareVisitor = null;
        this.resetRareVisitorTimer();
      }
    } else {
      this.nextRareVisitorCountdownMs -= dt * 1000;
      if (this.nextRareVisitorCountdownMs <= 0) {
        this.spawnRareVisitorNow();
      }
    }

    // 5. Update rising bubbles
    for (const b of this.bubbles) {
      b.y -= b.speed * dt;
      b.wobblePhase += dt * 2.4;
      b.x += (Math.sin(b.wobblePhase) * 4.5 + currentStrength * 10) * dt;
      if (b.x > this.worldWidth) b.x = 0;
      if (b.y < waterTop) {
        b.y = floorY + Math.random() * 12;
        b.x = Math.random() * this.worldWidth;
      }
    }

    // 6. Update sparkles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) this.sparkles.splice(i, 1);
    }
    if (this.sparkles.length > 68) {
      this.sparkles.splice(0, this.sparkles.length - 68);
    }

    // 7. Update tap ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 34 * dt;
      r.alpha -= 1.2 * dt;
      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }
}
