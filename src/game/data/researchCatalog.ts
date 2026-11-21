import { ResearchNodeData } from '../core/types';

/**
 * Aquarium Research Center — 6 Permanent Scientific Disciplines
 * Funded exclusively by Research Points (RP) to prevent coin inflation.
 */
export const RESEARCH_CATALOG: ResearchNodeData[] = [
  // BIOLOGY
  {
    id: 'bio_growth',
    name: 'Juvenile Nutrition',
    category: 'Biology',
    description: 'Accelerates fish growth from Baby to Breeding Adult across all maps.',
    rpCost: 15,
    maxLevel: 5,
    effectPerLevel: 20,
    effectUnit: '% Growth Speed',
    effectKey: 'growth_speed',
  },
  {
    id: 'bio_breeding',
    name: 'Spawning Nests',
    category: 'Biology',
    description: 'Shortens breeding cooldowns and egg incubation time.',
    rpCost: 25,
    maxLevel: 5,
    effectPerLevel: 18,
    effectUnit: '% Breeding Speed',
    requiresId: 'bio_growth',
    effectKey: 'breeding_speed',
  },
  {
    id: 'bio_schooling',
    name: 'Calm Shoaling',
    category: 'Biology',
    description: 'Reduces stress penalties when building new schools.',
    rpCost: 30,
    maxLevel: 4,
    effectPerLevel: 20,
    effectUnit: '% Stress Resistance',
    effectKey: 'school_resilience',
  },

  // WATER SCIENCE
  {
    id: 'water_filtration',
    name: 'Bio-Media Filtration',
    category: 'Water Science',
    description: 'Strengthens filtration power of all plants, filters, and cleaner creatures.',
    rpCost: 15,
    maxLevel: 5,
    effectPerLevel: 18,
    effectUnit: '% Filtration',
    effectKey: 'filtration_power',
  },
  {
    id: 'water_oxygen',
    name: 'Micro-Bubble Diffusion',
    category: 'Water Science',
    description: 'Increases oxygen output from air stones, pumps, and aquatic plants.',
    rpCost: 20,
    maxLevel: 5,
    effectPerLevel: 18,
    effectUnit: '% Oxygen Output',
    effectKey: 'oxygen_efficiency',
  },
  {
    id: 'water_algae',
    name: 'Crystal Glass Coating',
    category: 'Water Science',
    description: 'Slows down algae growth on aquarium glass across every map.',
    rpCost: 25,
    maxLevel: 5,
    effectPerLevel: 15,
    effectUnit: '% Slower Algae',
    requiresId: 'water_filtration',
    effectKey: 'algae_resistance',
  },

  // AQUACULTURE
  {
    id: 'aqua_income',
    name: 'Sustainable Aquaculture',
    category: 'Aquaculture',
    description: 'Permanently boosts coin production of healthy adult fish.',
    rpCost: 20,
    maxLevel: 5,
    effectPerLevel: 15,
    effectUnit: '% Fish Income',
    effectKey: 'fish_income_pct',
  },

  // DECORATION
  {
    id: 'decor_synergy',
    name: 'Aquascape Botany',
    category: 'Decoration',
    description: 'Amplifies ecosystem benefits and shelter of all placed decorations.',
    rpCost: 22,
    maxLevel: 5,
    effectPerLevel: 15,
    effectUnit: '% Decor Effects',
    effectKey: 'decoration_effect_pct',
  },
  {
    id: 'decor_beauty',
    name: 'Golden Ratio Framing',
    category: 'Decoration',
    description: 'Increases the coin multiplier granted by your Beauty Score.',
    rpCost: 30,
    maxLevel: 5,
    effectPerLevel: 12,
    effectUnit: '% Beauty Bonus',
    requiresId: 'decor_synergy',
    effectKey: 'beauty_bonus_pct',
  },

  // EXPLORATION
  {
    id: 'exp_rare',
    name: 'Current Tracking',
    category: 'Exploration',
    description: 'Increases Rare Visitor frequency and discovery rewards.',
    rpCost: 25,
    maxLevel: 5,
    effectPerLevel: 15,
    effectUnit: '% Rare Discovery',
    effectKey: 'rare_discovery_pct',
  },
  {
    id: 'exp_variants',
    name: 'Chromatic Genetics',
    category: 'Exploration',
    description: 'Increases chance of breeding rare Golden, Sakura, or Prism fish variants.',
    rpCost: 40,
    maxLevel: 5,
    effectPerLevel: 6,
    effectUnit: '% Variant Chance',
    requiresId: 'exp_rare',
    effectKey: 'variant_chance_pct',
  },

  // AUTOMATION (Manual -> Assisted -> Automated!)
  {
    id: 'auto_collector',
    name: 'Auto Shell Collector',
    category: 'Automation',
    description: 'Automatically gathers floating creature Shell Coins & Pearls for you.',
    rpCost: 20,
    maxLevel: 3,
    effectPerLevel: 1,
    effectUnit: 'Tier (Lv.1+ Active)',
    effectKey: 'auto_collector',
  },
  {
    id: 'auto_maintenance',
    name: 'Ecosystem Manager',
    category: 'Automation',
    description: 'Gently cleans excess glass algae and stabilizes water automatically.',
    rpCost: 45,
    maxLevel: 3,
    effectPerLevel: 10,
    effectUnit: '% Auto-Clean Power',
    requiresId: 'auto_collector',
    effectKey: 'auto_maintenance',
  },
  {
    id: 'auto_offline',
    name: 'Night-Watch Circulation',
    category: 'Automation',
    description: 'Increases offline coin and Research Point efficiency while away.',
    rpCost: 30,
    maxLevel: 5,
    effectPerLevel: 10,
    effectUnit: '% Offline Bonus',
    effectKey: 'offline_bonus_pct',
  },
];

export const RESEARCH_BY_ID: Record<string, ResearchNodeData> = Object.fromEntries(
  RESEARCH_CATALOG.map((r) => [r.id, r])
);
