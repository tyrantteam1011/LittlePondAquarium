import { ConservationProjectData } from '../core/types';

/**
 * Ocean Conservation Project — Soft Prestige without losing your aquariums!
 * Players contribute resources to permanently restore aquatic ecosystems worldwide.
 */
export const CONSERVATION_CATALOG: ConservationProjectData[] = [
  {
    id: 'cons_wetland_filter',
    name: 'Restore Coastal Wetlands',
    description: 'Replant natural marsh reedbeds to purify waterways globally.',
    coinCost: 5000,
    rpCost: 30,
    minDiscoveredSpecies: 4,
    permanentBonusLabel: '+10% Global Water Efficiency',
    bonusKey: 'water_efficiency_pct',
    bonusValue: 10,
  },
  {
    id: 'cons_spawning_sanctuary',
    name: 'Protect Spawning Grounds',
    description: 'Establish peaceful breeding corridors for endangered freshwater & reef fish.',
    coinCost: 18000,
    rpCost: 60,
    minDiscoveredSpecies: 7,
    permanentBonusLabel: '+12% Global Breeding Speed',
    bonusKey: 'breeding_efficiency_pct',
    bonusValue: 12,
  },
  {
    id: 'cons_coral_nursery',
    name: 'Rebuild Coral Reef Nursery',
    description: 'Cultivate resilient staghorn corals attracting rare oceanic species.',
    coinCost: 65000,
    rpCost: 110,
    minDiscoveredSpecies: 11,
    permanentBonusLabel: '+15% Rare Fish Discovery',
    bonusKey: 'rare_discovery_pct',
    bonusValue: 15,
  },
  {
    id: 'cons_genetic_ark',
    name: 'Living Chromatic Ark',
    description: 'Preserve rare color morphs and shimmering heritage lineages.',
    coinCost: 180000,
    rpCost: 180,
    minDiscoveredSpecies: 15,
    permanentBonusLabel: '+8% Genetic Variant Chance',
    bonusKey: 'variant_chance_pct',
    bonusValue: 8,
  },
  {
    id: 'cons_blue_horizon',
    name: 'Global Marine Reserve',
    description: 'Unite all 8 aquatic habitats under permanent ocean stewardship.',
    coinCost: 500000,
    rpCost: 300,
    minDiscoveredSpecies: 20,
    permanentBonusLabel: '+25% Global Aquarium Income',
    bonusKey: 'global_income_pct',
    bonusValue: 25,
  },
];
