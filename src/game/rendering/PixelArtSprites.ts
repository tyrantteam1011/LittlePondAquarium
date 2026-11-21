import {
  CreatureData,
  DecorationData,
  FishData,
  GeneticVariant,
} from '../core/types';

/**
 * Original 16-Bit Pixel Art Sprite Generator & Cache for Coralia
 * Renders crisp offscreen HTMLCanvasElement sprites for:
 * - All 9 Fish bodyShape templates + 6 surface patterns + 6 genetic variants (2 frames)
 * - All 15 Creature types (2 frames)
 * - All 34 Decoration shapes at exact catalog width × height
 * - Breeding Eggs tinted by parent species & genetic variant
 */

const spriteCache = new Map<string, HTMLCanvasElement>();

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  w = 1,
  h = 1
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  palette: Record<string, string>,
  offsetX = 0,
  offsetY = 0
): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(offsetX + x, offsetY + y, 1, 1);
      }
    }
  }
}

function resolveFishPalette(
  fish: FishData,
  variant: GeneticVariant
): {
  primary: string;
  secondary: string;
  accent: string;
  fin: string;
  outline: string;
  eye: string;
  eyeHighlight: string;
} {
  const base = fish.palette;
  switch (variant) {
    case 'golden':
      return {
        primary: '#f7c948',
        secondary: '#ffd970',
        accent: '#fff7cc',
        fin: '#f0a52c',
        outline: '#4d310e',
        eye: '#1c1824',
        eyeHighlight: '#ffffff',
      };
    case 'albino':
      return {
        primary: '#fcf7f0',
        secondary: '#f5dbe2',
        accent: '#ffffff',
        fin: '#fae6ec',
        outline: '#735a64',
        eye: '#d94862',
        eyeHighlight: '#ffffff',
      };
    case 'sakura':
      return {
        primary: '#f7a6c2',
        secondary: '#ffdbe8',
        accent: '#fff7fa',
        fin: '#f282a8',
        outline: '#4a2135',
        eye: '#1e1b29',
        eyeHighlight: '#ffffff',
      };
    case 'prism':
      return {
        primary: '#63e8ff',
        secondary: '#c88df2',
        accent: '#fff4a8',
        fin: '#7cf5d4',
        outline: '#1b2b4d',
        eye: '#162038',
        eyeHighlight: '#ffffff',
      };
    case 'longfin':
    case 'normal':
    default:
      return {
        primary: base.primary,
        secondary: base.secondary,
        accent: base.accent,
        fin: base.fin,
        outline: base.outline,
        eye: '#161f2b',
        eyeHighlight: '#ffffff',
      };
  }
}

// ============================================================================
// FISH SPRITE TEMPLATES (facing RIGHT; mirrored via ctx.scale(facing, 1))
// Legend: O=outline, P=primary, S=secondary, A=accent, F=fin, E=eye, W=white
// ============================================================================

const FISH_SLEEK_F0 = [
  '........OOOO........',
  '......OOFFFFOO......',
  '.OO..OOPPPPPPOO.....',
  'OFO.OPAAAPPPPPPO....',
  'OFFOOPPPPPPPPPEWO...',
  'OFFOOPSSSSSSSSPPO...',
  'OFFOOPPPPPPPPPPPO...',
  'OFO.OPPPPPPFFFPO....',
  '.OO..OOPPPPPPOO.....',
  '.......OFFFFO.......',
  '........OOOO........',
];

const FISH_SLEEK_F1 = [
  '........OOOO........',
  '......OOFFFFOO......',
  '..OO.OOPPPPPPOO.....',
  '.OFOOPAAAPPPPPPO....',
  '.OFOOPPPPPPPPPEWO...',
  'OFFOOPSSSSSSSSPPO...',
  '.OFOOPPPPPPPPPPPO...',
  '.OFOOPPPPPPFFFPO....',
  '..OO.OOPPPPPPOO.....',
  '.......OFFFFO.......',
  '........OOOO........',
];

const FISH_ROUND_F0 = [
  '.......OOOOOO.......',
  '.....OOFFFFFFOO.....',
  '....OPPPAAAAPPPPO...',
  '.OOOPPPPPPSSPPPPPO..',
  'OFOOPPPPPSSPPPEWPO..',
  'OFFOPPPPSSPPPPPPPO..',
  'OFFOPPPPSSPPFFPPPO..',
  'OFOOPPPPPSSPPPPPO...',
  '.OOOPPPPPPPPPPPPO...',
  '....OOPPFFFFPPOO....',
  '......OOOOOOOO......',
];

const FISH_ROUND_F1 = [
  '.......OOOOOO.......',
  '.....OOFFFFFFOO.....',
  '....OPPPAAAAPPPPO...',
  '..OOPPPPPPSSPPPPPO..',
  '.OFOPPPPPSSPPPEWPO..',
  'OFFOPPPPSSPPPPPPPO..',
  'OFFOPPPPSSPPFFPPPO..',
  '.OFOPPPPPSSPPPPPO...',
  '..OOPPPPPPPPPPPPO...',
  '....OOPPFFFFPPOO....',
  '......OOOOOOOO......',
];

const FISH_ANGEL_F0 = [
  '........OOO.........',
  '.......OFO..........',
  '......OFFO..........',
  '.....OFFFO..........',
  '....OFFFFFO.........',
  '...OOPSSPPPO........',
  '.OOOPPSSPAAOO.......',
  'OFOPPPSSPPPEWO......',
  'OFFOPPSSPPPPPPO.....',
  'OFOPPPSSPPPFFO......',
  '.OOOPPSSPPOOO.......',
  '...OOPSSPPPO........',
  '....OFFFFFO.........',
  '.....OFFFO..........',
  '......OFFO..........',
  '.......OFO..........',
  '........OO..........',
];

const FISH_ANGEL_F1 = [
  '.......OOO..........',
  '......OFO...........',
  '.....OFFO...........',
  '.....OFFFO..........',
  '....OFFFFFO.........',
  '...OOPSSPPPO........',
  '..OOPPSSPAAOO.......',
  '.OFOPPSSPPPEWO......',
  'OFFOPPSSPPPPPPO.....',
  '.OFOPPSSPPPFFO......',
  '..OOPPSSPPOOO.......',
  '...OOPSSPPPO........',
  '....OFFFFFO.........',
  '.....OFFFO..........',
  '......OFFO..........',
  '.......OFO..........',
  '........OO..........',
];

const FISH_BETTA_F0 = [
  '....OOOOOO..........',
  '..OOFFFFFFOO........',
  '.OFFFFSSFFFFOO......',
  'OFFFSSPPAAPPPPO.....',
  'OFFFFPPPPPPPPEWO....',
  'OFFFSPPPSSPPPPPO....',
  'OFFFFPPPPPPFFFPO....',
  'OFFFSSPPAAPPPPO.....',
  '.OFFFFSSFFFFOO......',
  '..OOFFFFFFOO........',
  '....OOOOOO..........',
];

const FISH_BETTA_F1 = [
  '.....OOOOOO.........',
  '...OOFFFFFFOO.......',
  '..OFFFFSSFFFFOO.....',
  '.OFFFSSPPAAPPPPO....',
  'OFFFFPPPPPPPPEWO....',
  'OFFFSPPPSSPPPPPO....',
  'OFFFFPPPPPPFFFPO....',
  '.OFFFSSPPAAPPPPO....',
  '..OFFFFSSFFFFOO.....',
  '...OOFFFFFFOO.......',
  '.....OOOOOO.........',
];

const FISH_LONG_F0 = [
  '..........OOOOOO........',
  '........OOFFFFFFOO......',
  '.OO...OOPPPAAAAPPPOO....',
  'OFO..OPPPSSPPSSPPPPPO...',
  'OFFOOPPPPPPPPPPPPPEWOO..',
  'OFFOOPPSSSSSSSSPPPPPPO..',
  'OFO..OPPPPPPPPFFFPPPO...',
  '.OO...OOPPPPPPPPPPOO....',
  '.........OOFFFFOO.......',
  '...........OOOO.........',
];

const FISH_LONG_F1 = [
  '..........OOOOOO........',
  '........OOFFFFFFOO......',
  '..OO..OOPPPAAAAPPPOO....',
  '.OFO.OPPPSSPPSSPPPPPO...',
  '.OFOOPPPPPPPPPPPPPEWOO..',
  'OFFOOPPSSSSSSSSPPPPPPO..',
  '.OFO.OPPPPPPPPFFFPPPO...',
  '..OO..OOPPPPPPPPPPOO....',
  '.........OOFFFFOO.......',
  '...........OOOO.........',
];

const FISH_FLAT_F0 = [
  '.......OOOOOO.......',
  '.....OOFFFFFFOO.....',
  '...OOPPAAAAPPPPOO...',
  '.OOPPPSSPPSSPPPPO...',
  'OFOPPPPPPPPPPEWPO...',
  'OFFOPPPPPPPPPPPO....',
  'OFOPSSSSSSSSSSPO....',
  '.OOOOOOOOOOOOOOOO...',
];

const FISH_FLAT_F1 = [
  '.......OOOOOO.......',
  '.....OOFFFFFFOO.....',
  '...OOPPAAAAPPPPOO...',
  '..OPPPSSPPSSPPPPO...',
  '.OFOPPPPPPPPPEWPO...',
  'OFFOPPPPPPPPPPPO....',
  '.OFOPSSSSSSSSSPO....',
  '..OOOOOOOOOOOOOO....',
];

const FISH_SEAHORSE_F0 = [
  '.....OOOO....',
  '....OAAAAO...',
  '...OPPPPEWO..',
  '...OPPPPPPPO.',
  '....OPPPPOO..',
  '...OFFPPO....',
  '..OOFPPPO....',
  '...OFPSSPO...',
  '....OPSSPO...',
  '....OPPPO....',
  '.....OPPO....',
  '....OPPOO....',
  '...OPOO......',
  '...OPO.OO....',
  '....OOOO.....',
];

const FISH_SEAHORSE_F1 = [
  '.....OOOO....',
  '....OAAAAO...',
  '...OPPPPEWO..',
  '...OPPPPPPPO.',
  '....OPPPPOO..',
  '..OOFFPPO....',
  '...OFPPPO....',
  '...OFPSSPO...',
  '....OPSSPO...',
  '....OPPPO....',
  '.....OPPO....',
  '....OPPOO....',
  '...OPOO......',
  '...OPO.OO....',
  '....OOOO.....',
];

const FISH_JELLY_F0 = [
  '....OOOOOO....',
  '..OOPAAAAPOO..',
  '.OPPPSSSSPPPO.',
  'OPPPAAAAAAPPPO',
  'OPPPPPPPPPPPPO',
  'OOFFOOFFOOFFOO',
  '..OF..OF..OF..',
  '.OF...OF...OF.',
  '..OF..OF..OF..',
  '...OF.OF.OF...',
  '..OF...OF..OF.',
  '...O...O...O..',
];

const FISH_JELLY_F1 = [
  '...OOOOOOOO...',
  '.OOPPAAAAPPOO.',
  'OPPPPSSSSPPPPO',
  'OPPPAAAAAAPPPO',
  '.OOPPPPPPPPOO.',
  '..OFOOFOOFOO..',
  '..OF..OF..OF..',
  '...OF.OF.OF...',
  '..OF..OF..OF..',
  '.OF...OF...OF.',
  '..OF..OF..OF..',
  '..O....O...O..',
];

const FISH_RAY_F0 = [
  '............OO..........',
  '..........OOFO..........',
  '........OOFFFO..........',
  '.......OFPAPPO..........',
  '.....OOPPPPPPPO.........',
  'OOOOOPPPPPPPPEWO........',
  'OOOOOPSSPPPPPPPPO.......',
  '.....OOPPPPPPPPO........',
  '.......OFPAPPO..........',
  '........OOFFFO..........',
  '..........OOFO..........',
  '............OO..........',
];

const FISH_RAY_F1 = [
  '...........OO...........',
  '.........OOFO...........',
  '........OFFFO...........',
  '......OOFPAPPO..........',
  '.....OOPPPPPPPO.........',
  'OOOOOPPPPPPPPEWO........',
  'OOOOOPSSPPPPPPPPO.......',
  '.....OOPPPPPPPPO........',
  '......OOFPAPPO..........',
  '........OFFFO...........',
  '.........OOFO...........',
  '...........OO...........',
];

function applyFishPattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pattern: FishData['palette']['pattern'],
  pal: ReturnType<typeof resolveFishPalette>
): void {
  const cx = Math.floor(w * 0.54);
  const cy = Math.floor(h * 0.5);
  if (pattern === 'spots') {
    px(ctx, cx - 2, cy - 1, pal.secondary, 2, 1);
    px(ctx, cx + 1, cy, pal.secondary, 1, 1);
    px(ctx, cx - 1, cy + 1, pal.accent, 1, 1);
  } else if (pattern === 'stripe') {
    px(ctx, cx - 4, cy, pal.accent, 6, 1);
    px(ctx, cx - 3, cy + 1, pal.secondary, 5, 1);
  } else if (pattern === 'banded') {
    px(ctx, cx - 3, cy - 2, pal.secondary, 2, 4);
    px(ctx, cx + 1, cy - 2, pal.secondary, 1, 4);
  } else if (pattern === 'ornate') {
    px(ctx, cx - 2, cy - 1, pal.accent, 2, 1);
    px(ctx, cx, cy, pal.secondary, 2, 1);
    px(ctx, cx - 1, cy + 1, pal.accent, 2, 1);
  } else if (pattern === 'gradient') {
    px(ctx, cx - 3, cy - 2, pal.accent, 4, 1);
    px(ctx, cx - 3, cy + 1, pal.secondary, 5, 1);
  }
}

export function getFishSprite(
  fish: FishData,
  frame: 0 | 1,
  variant: GeneticVariant = 'normal'
): HTMLCanvasElement {
  const key = `fish:${fish.id}:${frame}:${variant}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const pal = resolveFishPalette(fish, variant);
  const map: Record<string, string> = {
    O: pal.outline,
    P: pal.primary,
    S: pal.secondary,
    A: pal.accent,
    F: pal.fin,
    E: pal.eye,
    W: pal.eyeHighlight,
  };

  let grid: string[];
  switch (fish.palette.bodyShape) {
    case 'round':
      grid = frame === 0 ? FISH_ROUND_F0 : FISH_ROUND_F1;
      break;
    case 'angel':
      grid = frame === 0 ? FISH_ANGEL_F0 : FISH_ANGEL_F1;
      break;
    case 'betta':
      grid = frame === 0 ? FISH_BETTA_F0 : FISH_BETTA_F1;
      break;
    case 'long':
      grid = frame === 0 ? FISH_LONG_F0 : FISH_LONG_F1;
      break;
    case 'flat':
      grid = frame === 0 ? FISH_FLAT_F0 : FISH_FLAT_F1;
      break;
    case 'seahorse':
      grid = frame === 0 ? FISH_SEAHORSE_F0 : FISH_SEAHORSE_F1;
      break;
    case 'jelly':
      grid = frame === 0 ? FISH_JELLY_F0 : FISH_JELLY_F1;
      break;
    case 'ray':
      grid = frame === 0 ? FISH_RAY_F0 : FISH_RAY_F1;
      break;
    case 'sleek':
    default:
      grid = frame === 0 ? FISH_SLEEK_F0 : FISH_SLEEK_F1;
      break;
  }

  const extraLeft = variant === 'longfin' ? 4 : 0;
  const w = grid[0].length + extraLeft;
  const h = grid.length;
  const [canvas, ctx] = createCanvas(w, h);

  if (variant === 'longfin') {
    const midY = Math.floor(h / 2);
    px(ctx, 0, midY - 3 + frame, pal.outline, 5, 1);
    px(ctx, 1, midY - 2 + frame, pal.fin, 4, 2);
    px(ctx, 0, midY + 1 - frame, pal.outline, 5, 1);
    px(ctx, 1, midY - frame, pal.accent, 4, 1);
  }

  drawGrid(ctx, grid, map, extraLeft, 0);

  if (
    fish.palette.bodyShape !== 'seahorse' &&
    fish.palette.bodyShape !== 'jelly' &&
    fish.palette.bodyShape !== 'ray'
  ) {
    applyFishPattern(ctx, w, h, fish.palette.pattern, pal);
  }

  if (variant === 'golden' || variant === 'prism') {
    px(ctx, Math.floor(w * 0.65), 1, '#ffffff', 1, 1);
  }

  spriteCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// CREATURE SPRITES (15 Types, 2 frames each)
// ============================================================================

export function getCreatureSprite(creature: CreatureData, frame: 0 | 1): HTMLCanvasElement {
  const key = `creature:${creature.id}:${frame}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const p = creature.palette;
  const map: Record<string, string> = {
    O: p.outline,
    P: p.primary,
    S: p.secondary,
    A: p.accent,
    E: '#161f2b',
    W: '#ffffff',
  };

  let grid: string[];
  switch (creature.type) {
    case 'snail':
      grid =
        frame === 0
          ? [
              '....OOOOO.....',
              '..OOPAAAPOO...',
              '.OPPSOOSSPPO..',
              '.OPSOAAPSPPO..',
              '.OPSSPPSSPPO..',
              '..OOPPPPPO..O.',
              '.OSSSSSSSSOOO.',
              'OSSSSSSSSSSPEO',
              '.OOOOOOOOOOOO.',
            ]
          : [
              '....OOOOO.....',
              '..OOPAAAPOO...',
              '.OPPSOOSSPPO..',
              '.OPSOAAPSPPO..',
              '.OPSSPPSSPPO..',
              '..OOPPPPPO.O..',
              '.OSSSSSSSSOOO.',
              'OSSSSSSSSSSPEO',
              '.OOOOOOOOOOOO.',
            ];
      break;
    case 'crab':
      grid =
        frame === 0
          ? [
              '.OO........OO.',
              'OPPO......OPPO',
              '.OPO.OOOO.OPO.',
              '..OOOPAAAPOOO.',
              '..OPPEPPPPEPO.',
              '.OOPPPPPPPPOO.',
              'O.OSSSSSSSSO.O',
              'O..O.O..O.O..O',
            ]
          : [
              '..OO......OO..',
              '.OPPO....OPPO.',
              '..OPO.OO.OPO..',
              '..OOOPAAAPOOO.',
              '..OPPEPPPPEPO.',
              '.OOPPPPPPPPOO.',
              '.OOSSSSSSSSOO.',
              '..O.O....O.O..',
            ];
      break;
    case 'shrimp':
      grid =
        frame === 0
          ? [
              '..........O..O',
              '.....OOOOO.O..',
              '...OOPAAAPPO..',
              '..OPPSPPPEWO..',
              '.OPPSPPPPPPO..',
              'OFO.OSSSSOO...',
              '.O..O.O.O.....',
            ]
          : [
              '.........O..O.',
              '.....OOOOO.O..',
              '...OOPAAAPPO..',
              '..OPPSPPPEWO..',
              '.OPPSPPPPPPO..',
              '.OF.OSSSSOO...',
              '..O..O.O.O....',
            ];
      break;
    case 'crayfish':
      grid =
        frame === 0
          ? [
              '.............OO.',
              '....OOOOOO..OPPO',
              '.OOOPPAAPPOOOOPO',
              'OSSOPPSPPPEWPOO.',
              '.OOOPPPPPPPPOO..',
              '....O.O.O.O.....',
            ]
          : [
              '............OO..',
              '....OOOOOO.OPPO.',
              '..OOPPAAPPOOOOPO',
              '.OSOPPSPPPEWPOO.',
              '..OOPPPPPPPPOO..',
              '.....O.O.O.O....',
            ];
      break;
    case 'clam':
    case 'mussel':
      grid =
        frame === 0
          ? [
              '....OOOOOO....',
              '..OOPAPAAPOO..',
              '.OPPSPPPPSPPO.',
              'OPPPPPPPPPPPPO',
              'OOSSSSSSSSSSOO',
              '.OOPPAWAAPPOO.',
              '..OOOOOOOOOO..',
            ]
          : [
              '....OOOOOO....',
              '..OOPAPAAPOO..',
              '.OPPSPPPPSPPO.',
              'OPPPPPPPPPPPPO',
              'OOSSAAWAAASSOO',
              '.OOPPPPPPPPOO.',
              '..OOOOOOOOOO..',
            ];
      break;
    case 'turtle':
      grid =
        frame === 0
          ? [
              '.....OOOOOO......',
              '...OOPPSSPPOO....',
              '..OPPAAPPAAPPO...',
              '.OPPSSSSSSSPPOOO.',
              'OOPPPPPPPPPPOPEWO',
              '.OOSSSSSSSSOOOPO.',
              '..OPO....OPO..OO.',
              '..OO......OO.....',
            ]
          : [
              '.....OOOOOO......',
              '...OOPPSSPPOO....',
              '..OPPAAPPAAPPO...',
              '.OPPSSSSSSSPPOOO.',
              'OOPPPPPPPPPPOPEWO',
              '.OOSSSSSSSSOOOPO.',
              '...OPO..OPO...OO.',
              '...OO....OO......',
            ];
      break;
    case 'shark':
      grid =
        frame === 0
          ? [
              '..........OOO...........',
              '.........OPPO...........',
              '.OO.....OPPPO...........',
              'OPPO..OOPPPPPPPOOO......',
              '.OPPOOPPPPPPPPPPPPOO....',
              '..OOPPPPPPPPPPPPPEWOO...',
              '..OOPPSSSSSSSSSSSSSSOO..',
              '.OPPO.OOPPPPPOOOOOOO....',
              '.OO......OPO............',
              '..........OO............',
            ]
          : [
              '..........OOO...........',
              '.........OPPO...........',
              '..OO....OPPPO...........',
              '.OPPO.OOPPPPPPPOOO......',
              '..OPPOPPPPPPPPPPPPOO....',
              '..OOPPPPPPPPPPPPPEWOO...',
              '..OOPPSSSSSSSSSSSSSSOO..',
              '..OPO.OOPPPPPOOOOOOO....',
              '..OO.....OPO............',
              '..........OO............',
            ];
      break;
    case 'ray':
      grid = frame === 0 ? FISH_RAY_F0 : FISH_RAY_F1;
      break;
    case 'jellyfish':
      grid = frame === 0 ? FISH_JELLY_F0 : FISH_JELLY_F1;
      break;
    case 'seahorse':
      grid = frame === 0 ? FISH_SEAHORSE_F0 : FISH_SEAHORSE_F1;
      break;
    case 'squid':
      grid =
        frame === 0
          ? [
              '........OOOOOO....',
              '......OOPPAAAPOO..',
              'OOOOOOPPPPPPPPPPO.',
              '.OSSSSOPPPPEWPPPO.',
              'OOOOOOPPPPPPPPPPO.',
              '......OOPPSSSSOO..',
              '........OOOOOO....',
            ]
          : [
              '........OOOOOO....',
              '......OOPPAAAPOO..',
              '.OOOOOPPPPPPPPPPO.',
              'OSSSSSOPPPPEWPPPO.',
              '.OOOOOPPPPPPPPPPO.',
              '......OOPPSSSSOO..',
              '........OOOOOO....',
            ];
      break;
    case 'octopus':
      grid =
        frame === 0
          ? [
              '....OOOOOO....',
              '..OOPPAAAPOO..',
              '.OOPPPPPPPPOO.',
              'OAPPPPEWEPPPAO',
              '.OPPPPPPPPPPO.',
              '..OOSSSSSSOO..',
              '.OPO.OPO.OPO..',
              'OO..OO..OO.OO.',
            ]
          : [
              '....OOOOOO....',
              '..OOPPAAAPOO..',
              'OOOPPPPPPPPOOO',
              '.APPPPEWEPPPA.',
              '.OPPPPPPPPPPO.',
              '..OOSSSSSSOO..',
              '..OPO.OPO.OPO.',
              '.OO..OO..OO...',
            ];
      break;
    case 'starfish':
      grid =
        frame === 0
          ? [
              '.....OO.....',
              '....OPPO....',
              'OOOOAPPOOOOO',
              'OPPPAAPPPPPO',
              '.OOPPPPPPOO.',
              '..OPPPPPPO..',
              '.OPPO..OPPO.',
              '.OO......OO.',
            ]
          : [
              '.....OO.....',
              '....OPPO....',
              'OOOOAPPOOOOO',
              'OPPPAAAPPPPO',
              '.OOPPPPPPOO.',
              '..OPPPPPPO..',
              '.OPPO..OPPO.',
              '..OO....OO..',
            ];
      break;
    case 'frog':
    default:
      grid =
        frame === 0
          ? [
              '....OO..OO....',
              '...OEWO.OEWO..',
              '..OOPPPPPPOO..',
              '.OPPPAAAAPPPO.',
              'OPPPSSSSSSPPPO',
              'OOSSSSSSSSSSOO',
              '.OPO......OPO.',
              'OOO........OOO',
            ]
          : [
              '....OO..OO....',
              '...OEWO.OEWO..',
              '..OOPPPPPPOO..',
              '.OPPPAAAAPPPO.',
              'OPPPSSSSSSPPPO',
              '.OSSSSSSSSSSO.',
              '..OPO....OPO..',
              '..OO......OO..',
            ];
      break;
  }

  const w = grid[0].length;
  const h = grid.length;
  const [canvas, ctx] = createCanvas(w, h);
  drawGrid(ctx, grid, map, 0, 0);

  spriteCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// DECORATION SPRITES (All 34 Shapes at exact catalog width × height)
// ============================================================================

export function getDecorationSprite(decor: DecorationData): HTMLCanvasElement {
  const key = `decor:${decor.id}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const w = Math.max(12, decor.width);
  const h = Math.max(12, decor.height);
  const p = decor.palette;
  const [canvas, ctx] = createCanvas(w, h);

  switch (decor.shape) {
    case 'fern': {
      const cx = Math.floor(w / 2);
      for (const offset of [-4, -1, 2, 4]) {
        const stemH = h - 3 - Math.abs(offset);
        for (let y = 0; y < stemH; y++) {
          const sx = cx + offset + Math.round(Math.sin(y * 0.35 + offset) * 1.4);
          const sy = h - 2 - y;
          px(ctx, sx - 1, sy, p.outline, 4, 1);
          px(ctx, sx, sy, y % 3 === 0 ? p.accent : p.primary, 2, 1);
        }
      }
      px(ctx, cx - 5, h - 2, p.secondary, 10, 2);
      break;
    }

    case 'sword_plant': {
      const cx = Math.floor(w / 2);
      const blades = [
        { dx: -5, top: 6, bw: 4 },
        { dx: -2, top: 2, bw: 5 },
        { dx: 3, top: 4, bw: 4 },
      ];
      for (const b of blades) {
        for (let y = b.top; y < h - 2; y++) {
          const t = (y - b.top) / Math.max(1, h - 2 - b.top);
          const cw = Math.max(2, Math.round(Math.sin(t * Math.PI) * b.bw));
          const sx = cx + b.dx - Math.floor(cw / 2);
          px(ctx, sx - 1, y, p.outline, cw + 2, 1);
          px(ctx, sx, y, t < 0.35 ? p.accent : p.primary, cw, 1);
          px(ctx, sx + Math.floor(cw / 2), y, p.secondary, 1, 1);
        }
      }
      px(ctx, cx - 4, h - 2, p.outline, 8, 2);
      break;
    }

    case 'kelp': {
      const strands = [Math.floor(w * 0.32), Math.floor(w * 0.65)];
      for (let s = 0; s < strands.length; s++) {
        const bx = strands[s];
        for (let y = 2 + s * 3; y < h - 1; y++) {
          const sway = Math.round(Math.sin(y * 0.4 + s * 2) * 2);
          px(ctx, bx + sway - 1, y, p.outline, 4, 1);
          px(ctx, bx + sway, y, y % 4 === 0 ? p.accent : p.primary, 2, 1);
          if (y % 5 === 0) {
            px(ctx, bx + sway + (s === 0 ? 2 : -2), y, p.secondary, 2, 2);
          }
        }
      }
      px(ctx, 3, h - 2, p.outline, w - 6, 2);
      break;
    }

    case 'bush_plant': {
      const cx = Math.floor(w / 2);
      const puffs = [
        [cx - 4, h - 7, 5],
        [cx + 4, h - 7, 5],
        [cx, h - 10, 6],
        [cx, h - 5, 7],
      ];
      for (const [bx, by, r] of puffs) {
        px(ctx, bx - r, by - r + 1, p.outline, r * 2, r * 2 - 2);
      }
      for (const [bx, by, r] of puffs) {
        px(ctx, bx - r + 1, by - r + 2, p.secondary, r * 2 - 2, r * 2 - 4);
        px(ctx, bx - r + 2, by - r + 2, p.primary, r * 2 - 4, r - 1);
        px(ctx, bx - 1, by - r + 2, p.accent, 2, 2);
      }
      break;
    }

    case 'lotus': {
      const cx = Math.floor(w / 2);
      // Stems & floating pad
      px(ctx, cx - 1, 9, p.outline, 3, h - 10);
      px(ctx, cx, 9, p.secondary, 1, h - 10);
      px(ctx, 2, h - 6, p.outline, w - 4, 5);
      px(ctx, 3, h - 5, p.secondary, w - 6, 3);
      // Pink blossom petals
      px(ctx, cx - 6, 4, p.outline, 12, 7);
      px(ctx, cx - 5, 5, p.primary, 10, 5);
      px(ctx, cx - 3, 2, p.outline, 6, 4);
      px(ctx, cx - 2, 3, p.accent, 4, 3);
      px(ctx, cx - 1, 5, '#ffe694', 2, 2);
      break;
    }

    case 'rock_boulder': {
      px(ctx, 2, h - 9, p.outline, w - 4, 9);
      px(ctx, 4, 3, p.outline, w - 8, h - 4);
      px(ctx, 3, h - 8, p.secondary, w - 6, 7);
      px(ctx, 5, 4, p.primary, w - 10, h - 7);
      px(ctx, 6, 5, p.accent, Math.max(4, w - 14), 3);
      break;
    }

    case 'rock_arch': {
      // Left & right pillars
      px(ctx, 2, 6, p.outline, 8, h - 6);
      px(ctx, w - 10, 6, p.outline, 8, h - 6);
      // Top span
      px(ctx, 4, 2, p.outline, w - 8, 8);
      px(ctx, 3, 7, p.secondary, 6, h - 8);
      px(ctx, w - 9, 7, p.secondary, 6, h - 8);
      px(ctx, 5, 3, p.primary, w - 10, 6);
      px(ctx, 7, 4, p.accent, w - 14, 2);
      break;
    }

    case 'pagoda_rock': {
      const tiers = 4;
      for (let i = 0; i < tiers; i++) {
        const tw = w - 4 - i * 3;
        const ty = h - 6 - i * Math.floor((h - 6) / tiers);
        const tx = Math.floor((w - tw) / 2);
        px(ctx, tx, ty, p.outline, tw, 6);
        px(ctx, tx + 1, ty + 1, i % 2 === 0 ? p.primary : p.secondary, tw - 2, 4);
        px(ctx, tx + 2, ty + 1, p.accent, Math.max(2, tw - 6), 1);
      }
      break;
    }

    case 'crystal': {
      const spires = [
        { x: Math.floor(w * 0.25), top: Math.floor(h * 0.35), sw: 5 },
        { x: Math.floor(w * 0.5), top: 2, sw: 6 },
        { x: Math.floor(w * 0.72), top: Math.floor(h * 0.42), sw: 5 },
      ];
      for (const sp of spires) {
        const sx = sp.x - Math.floor(sp.sw / 2);
        px(ctx, sx, sp.top + 2, p.outline, sp.sw, h - sp.top - 2);
        px(ctx, sx + 1, sp.top, p.outline, sp.sw - 2, 3);
        px(ctx, sx + 1, sp.top + 2, p.primary, sp.sw - 2, h - sp.top - 3);
        px(ctx, sx + 1, sp.top + 1, p.accent, Math.max(1, sp.sw - 3), Math.max(3, Math.floor((h - sp.top) * 0.5)));
        px(ctx, sx + sp.sw - 2, sp.top + 3, p.secondary, 1, h - sp.top - 4);
      }
      break;
    }

    case 'staghorn': {
      const cx = Math.floor(w / 2);
      px(ctx, cx - 3, h - 7, p.outline, 6, 7);
      px(ctx, cx - 2, h - 6, p.secondary, 4, 5);
      const branches = [
        [-6, 5, 5],
        [-2, 2, 4],
        [3, 4, 5],
        [6, 8, 4],
      ];
      for (const [dx, top, bw] of branches) {
        px(ctx, cx + dx - 1, top, p.outline, bw, h - top - 5);
        px(ctx, cx + dx, top + 1, p.primary, bw - 2, h - top - 6);
        px(ctx, cx + dx, top + 1, p.accent, Math.max(1, bw - 2), 2);
      }
      break;
    }

    case 'brain_coral': {
      px(ctx, 2, 4, p.outline, w - 4, h - 4);
      px(ctx, 4, 2, p.outline, w - 8, h - 2);
      px(ctx, 3, 5, p.secondary, w - 6, h - 6);
      px(ctx, 5, 3, p.primary, w - 10, h - 6);
      for (let y = 5; y < h - 4; y += 3) {
        px(ctx, 5, y, p.accent, w - 10, 1);
        px(ctx, 6, y + 1, p.secondary, w - 12, 1);
      }
      break;
    }

    case 'sea_fan': {
      const cx = Math.floor(w / 2);
      px(ctx, cx - 2, h - 6, p.outline, 4, 6);
      px(ctx, cx - 1, h - 5, p.secondary, 2, 4);
      for (let y = 3; y < h - 5; y += 2) {
        const span = Math.round(Math.sin(((y - 2) / Math.max(1, h - 6)) * Math.PI) * (w * 0.44));
        for (let x = -span; x <= span; x += 3) {
          px(ctx, cx + x - 1, y, p.outline, 3, 3);
          px(ctx, cx + x, y, y < h * 0.4 ? p.accent : p.primary, 1, 2);
        }
      }
      break;
    }

    case 'anemone': {
      const cx = Math.floor(w / 2);
      px(ctx, 4, h - 7, p.outline, w - 8, 7);
      px(ctx, 5, h - 6, p.secondary, w - 10, 5);
      for (let x = 4; x < w - 4; x += 3) {
        const th = 6 + ((x * 7) % 6);
        px(ctx, x - 1, h - 6 - th, p.outline, 4, th + 1);
        px(ctx, x, h - 5 - th, p.primary, 2, th);
        px(ctx, x, h - 6 - th, p.accent, 2, 2);
      }
      px(ctx, cx - 2, h - 5, p.primary, 4, 2);
      break;
    }

    case 'driftwood':
    case 'sunken_log': {
      px(ctx, 2, h - 9, p.outline, w - 4, 8);
      px(ctx, 3, h - 8, p.secondary, w - 6, 6);
      px(ctx, 4, h - 7, p.primary, w - 8, 3);
      px(ctx, 6, h - 13, p.outline, 5, 6);
      px(ctx, 7, h - 12, p.primary, 3, 5);
      px(ctx, Math.floor(w * 0.55), h - 12, p.outline, 6, 5);
      px(ctx, Math.floor(w * 0.55) + 1, h - 11, p.accent, 4, 3);
      break;
    }

    case 'bonsai': {
      const cx = Math.floor(w / 2);
      // Trunk
      px(ctx, cx - 3, h - 13, p.outline, 6, 13);
      px(ctx, cx - 2, h - 12, p.primary, 4, 11);
      px(ctx, cx - 6, h - 4, p.outline, 12, 4);
      px(ctx, cx - 5, h - 3, p.primary, 10, 2);
      // Moss canopies
      const pads = [
        [cx - 7, 8, 12, 7],
        [cx + 1, 5, 13, 8],
        [cx - 3, 2, 12, 7],
      ];
      for (const [bx, by, bw, bh] of pads) {
        px(ctx, bx, by, p.outline, bw, bh);
        px(ctx, bx + 1, by + 1, p.secondary, bw - 2, bh - 2);
        px(ctx, bx + 2, by + 1, p.accent, bw - 4, 2);
      }
      break;
    }

    case 'substrate_sand':
    case 'substrate_pebbles':
    case 'substrate_volcanic': {
      px(ctx, 1, 2, p.outline, w - 2, h - 3);
      px(ctx, 2, 3, p.primary, w - 4, h - 5);
      px(ctx, 2, h - 4, p.secondary, w - 4, 2);
      for (let x = 4; x < w - 4; x += 4) {
        px(ctx, x, 4 + (x % 3), p.accent, 2, 1);
      }
      break;
    }

    case 'amphora': {
      const cx = Math.floor(w / 2);
      px(ctx, cx - 4, 2, p.outline, 8, 4);
      px(ctx, cx - 3, 3, p.primary, 6, 2);
      px(ctx, cx - 6, 6, p.outline, 12, h - 7);
      px(ctx, cx - 5, 7, p.secondary, 10, h - 9);
      px(ctx, cx - 4, 7, p.primary, 7, h - 10);
      px(ctx, cx - 3, 8, p.accent, 2, 4);
      break;
    }

    case 'lantern': {
      const cx = Math.floor(w / 2);
      // Roof
      px(ctx, cx - 7, 3, p.outline, 14, 4);
      px(ctx, cx - 5, 1, p.outline, 10, 3);
      px(ctx, cx - 6, 4, p.primary, 12, 2);
      // Glowing chamber
      px(ctx, cx - 4, 7, p.outline, 8, 7);
      px(ctx, cx - 3, 8, p.accent, 6, 5);
      // Pillar & base
      px(ctx, cx - 2, 14, p.outline, 4, h - 17);
      px(ctx, cx - 1, 14, p.secondary, 2, h - 17);
      px(ctx, cx - 5, h - 4, p.outline, 10, 4);
      px(ctx, cx - 4, h - 3, p.primary, 8, 2);
      break;
    }

    case 'torii': {
      // Top beam
      px(ctx, 1, 3, p.outline, w - 2, 4);
      px(ctx, 2, 4, p.accent, w - 4, 1);
      px(ctx, 2, 5, p.primary, w - 4, 2);
      // Second lintel
      px(ctx, 4, 9, p.outline, w - 8, 3);
      px(ctx, 5, 10, p.primary, w - 10, 1);
      // Pillars
      px(ctx, 6, 7, p.outline, 4, h - 7);
      px(ctx, w - 10, 7, p.outline, 4, h - 7);
      px(ctx, 7, 7, p.primary, 2, h - 8);
      px(ctx, w - 9, 7, p.primary, 2, h - 8);
      break;
    }

    case 'castle':
    case 'gazebo': {
      // Main keep
      px(ctx, 4, 10, p.outline, w - 8, h - 10);
      px(ctx, 5, 11, p.primary, w - 10, h - 12);
      // Left & right towers
      px(ctx, 2, 4, p.outline, 8, h - 4);
      px(ctx, w - 10, 4, p.outline, 8, h - 4);
      px(ctx, 3, 5, p.secondary, 6, h - 6);
      px(ctx, w - 9, 5, p.secondary, 6, h - 6);
      // Roof spires
      px(ctx, 3, 2, p.accent, 6, 3);
      px(ctx, w - 9, 2, p.accent, 6, 3);
      // Arched doorway
      const cx = Math.floor(w / 2);
      px(ctx, cx - 3, h - 9, p.outline, 6, 9);
      px(ctx, cx - 2, h - 8, '#172838', 4, 8);
      break;
    }

    case 'chest': {
      px(ctx, 2, 4, p.outline, w - 4, h - 4);
      px(ctx, 3, 5, p.primary, w - 6, h - 6);
      px(ctx, 3, 9, p.outline, w - 6, 2);
      px(ctx, 4, 6, p.secondary, w - 8, 3);
      px(ctx, Math.floor(w / 2) - 2, 8, p.secondary, 4, 4);
      px(ctx, Math.floor(w / 2) - 1, 9, p.accent, 2, 2);
      break;
    }

    case 'pearl_clam': {
      const cx = Math.floor(w / 2);
      px(ctx, 2, 4, p.outline, w - 4, h - 5);
      px(ctx, 3, 5, p.secondary, w - 6, h - 7);
      px(ctx, 4, 6, p.primary, w - 8, 5);
      // Luminous pearl center
      px(ctx, cx - 3, Math.floor(h * 0.45), p.outline, 6, 6);
      px(ctx, cx - 2, Math.floor(h * 0.45) + 1, p.accent, 4, 4);
      px(ctx, cx - 1, Math.floor(h * 0.45) + 2, '#ffffff', 2, 2);
      break;
    }

    case 'air_stone': {
      px(ctx, 2, 4, p.outline, w - 4, h - 5);
      px(ctx, 3, 5, p.secondary, w - 6, h - 7);
      px(ctx, 4, 5, p.primary, w - 8, 4);
      px(ctx, 5, 6, p.accent, 2, 2);
      px(ctx, w - 8, 6, p.accent, 2, 2);
      break;
    }

    case 'filter_box': {
      px(ctx, 3, 3, p.outline, w - 6, h - 4);
      px(ctx, 4, 4, p.secondary, w - 8, h - 6);
      px(ctx, 5, 5, p.primary, w - 10, h - 10);
      for (let y = 7; y < h - 6; y += 3) {
        px(ctx, 6, y, p.outline, w - 12, 1);
      }
      px(ctx, Math.floor(w / 2) - 1, 2, p.accent, 3, 2);
      break;
    }

    case 'water_pump': {
      px(ctx, 2, 5, p.outline, w - 4, h - 6);
      px(ctx, 3, 6, p.secondary, w - 6, h - 8);
      px(ctx, 4, 7, p.primary, w - 8, h - 11);
      px(ctx, w - 6, 7, p.accent, 3, 4);
      px(ctx, 5, 9, p.accent, 3, 2);
      break;
    }

    case 'heater':
    case 'chiller': {
      const cx = Math.floor(w / 2);
      px(ctx, cx - 4, 2, p.outline, 8, h - 3);
      px(ctx, cx - 3, 3, p.secondary, 6, h - 5);
      px(ctx, cx - 2, 6, p.primary, 4, h - 10);
      px(ctx, cx - 1, 8, p.accent, 2, 4);
      break;
    }

    case 'reef_light':
    case 'bg_tint':
    case 'submarine':
    default: {
      px(ctx, 2, 3, p.outline, w - 4, h - 6);
      px(ctx, 3, 4, p.secondary, w - 6, h - 8);
      px(ctx, 4, 5, p.primary, w - 8, Math.max(4, h - 11));
      px(ctx, 6, 6, p.accent, Math.max(4, w - 12), 2);
      break;
    }
  }

  spriteCache.set(key, canvas);
  return canvas;
}

// ============================================================================
// BREEDING EGG SPRITE
// ============================================================================

export function getEggSprite(
  baseColor: string,
  variant: GeneticVariant = 'normal'
): HTMLCanvasElement {
  const key = `egg:${baseColor}:${variant}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const [canvas, ctx] = createCanvas(8, 9);
  const fill =
    variant === 'golden'
      ? '#ffd966'
      : variant === 'sakura'
        ? '#f7a6c2'
        : variant === 'prism'
          ? '#7cf5e8'
          : variant === 'albino'
            ? '#fff7f0'
            : baseColor;
  const outline = variant === 'golden' ? '#5e3c10' : '#1b3145';

  const grid = [
    '..OOOO..',
    '.OPPPPO.',
    'OPWAPPPO',
    'OPPPPPPO',
    'OPPPPPPO',
    'OPPPPPPO',
    '.OPPPPO.',
    '..OOOO..',
  ];

  drawGrid(ctx, grid, {
    O: outline,
    P: fill,
    A: '#fff8de',
    W: '#ffffff',
  });

  spriteCache.set(key, canvas);
  return canvas;
}
