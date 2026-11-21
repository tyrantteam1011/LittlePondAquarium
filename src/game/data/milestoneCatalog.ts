import { HabitatId } from '../core/types';

export type MilestoneCategory =
  | 'Discovery'
  | 'Breeding'
  | 'Aquarium'
  | 'Maps'
  | 'Population'
  | 'Beauty'
  | 'Feeding'
  | 'Research';

export type GlobalMilestoneBonusKey =
  | 'growth_pct'
  | 'breeding_pct'
  | 'offline_pct'
  | 'rare_discovery_pct'
  | 'food_efficiency_pct';

export interface MilestoneData {
  id: string;
  category: MilestoneCategory;
  title: string;
  description: string;
  target: number;
  metric:
    | 'discover_species'
    | 'breed_fish'
    | 'aquarium_level'
    | 'complete_maps'
    | 'population_born'
    | 'beauty_score'
    | 'times_fed'
    | 'research_levels';
  reward: {
    gems: number;
    researchPoints: number;
    coins?: number;
    globalBonusKey?: GlobalMilestoneBonusKey;
    globalBonusValue?: number; // Moderate permanent % e.g. 5 or 10
    retroactiveMapExpansion?: {
      habitatId: HabitatId;
      tier: number;
      label: string;
    };
    badgeLabel: string;
  };
}

export const MILESTONE_CATALOG: MilestoneData[] = [
  // DISCOVERY
  {
    id: 'ms_discover_5',
    category: 'Discovery',
    title: 'Novice Naturalist',
    description: 'Discover 5 unique species in the Encyclopedia.',
    target: 5,
    metric: 'discover_species',
    reward: {
      gems: 15,
      researchPoints: 30,
      coins: 500,
      globalBonusKey: 'rare_discovery_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Rare Discovery',
    },
  },
  {
    id: 'ms_discover_10',
    category: 'Discovery',
    title: 'Aquatic Archivist',
    description: 'Discover 10 unique species across your habitats.',
    target: 10,
    metric: 'discover_species',
    reward: {
      gems: 30,
      researchPoints: 60,
      coins: 3500,
      globalBonusKey: 'rare_discovery_pct',
      globalBonusValue: 5,
      retroactiveMapExpansion: {
        habitatId: 'pond',
        tier: 1,
        label: 'Pond Expansion II (75 Cap)',
      },
      badgeLabel: 'Pond Expansion II + 5% Rare',
    },
  },
  {
    id: 'ms_discover_25',
    category: 'Discovery',
    title: 'Master Biologist',
    description: 'Discover 25 unique fish and aquatic creatures.',
    target: 25,
    metric: 'discover_species',
    reward: {
      gems: 65,
      researchPoints: 140,
      coins: 45000,
      globalBonusKey: 'rare_discovery_pct',
      globalBonusValue: 10,
      retroactiveMapExpansion: {
        habitatId: 'lake',
        tier: 1,
        label: 'Forest Lake Expansion II',
      },
      badgeLabel: '+10% Rare · Lake Expansion II',
    },
  },
  {
    id: 'ms_discover_50',
    category: 'Discovery',
    title: 'Grand Encyclopedia Curator',
    description: 'Discover 50 unique aquatic species worldwide.',
    target: 50,
    metric: 'discover_species',
    reward: {
      gems: 150,
      researchPoints: 350,
      coins: 400000,
      globalBonusKey: 'rare_discovery_pct',
      globalBonusValue: 10,
      retroactiveMapExpansion: {
        habitatId: 'pond',
        tier: 2,
        label: 'Pond Expansion III (100 Cap)',
      },
      badgeLabel: 'Pond Expansion III · +10% Rare',
    },
  },

  // BREEDING
  {
    id: 'ms_breed_5',
    category: 'Breeding',
    title: 'Cozy Hatchery',
    description: 'Successfully hatch 5 fish through aquarium breeding.',
    target: 5,
    metric: 'breed_fish',
    reward: {
      gems: 15,
      researchPoints: 35,
      globalBonusKey: 'breeding_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Breeding Speed',
    },
  },
  {
    id: 'ms_breed_10',
    category: 'Breeding',
    title: 'Living Nursery',
    description: 'Successfully breed 10 fish.',
    target: 10,
    metric: 'breed_fish',
    reward: {
      gems: 28,
      researchPoints: 65,
      globalBonusKey: 'breeding_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Breeding Speed',
    },
  },
  {
    id: 'ms_breed_50',
    category: 'Breeding',
    title: 'Master Breeder',
    description: 'Successfully breed 50 fish across your aquariums.',
    target: 50,
    metric: 'breed_fish',
    reward: {
      gems: 70,
      researchPoints: 180,
      globalBonusKey: 'breeding_pct',
      globalBonusValue: 8,
      retroactiveMapExpansion: {
        habitatId: 'river',
        tier: 1,
        label: 'Flowing River Expansion II',
      },
      badgeLabel: '+8% Breeding · River Expansion',
    },
  },
  {
    id: 'ms_breed_100',
    category: 'Breeding',
    title: 'Dynasty of Fin & Scale',
    description: 'Successfully breed 100 fish.',
    target: 100,
    metric: 'breed_fish',
    reward: {
      gems: 140,
      researchPoints: 320,
      globalBonusKey: 'breeding_pct',
      globalBonusValue: 10,
      badgeLabel: '+10% Breeding Speed',
    },
  },

  // AQUARIUM LEVEL
  {
    id: 'ms_level_5',
    category: 'Aquarium',
    title: 'Rising Aquarist',
    description: 'Reach Global Aquarium Rank 5.',
    target: 5,
    metric: 'aquarium_level',
    reward: {
      gems: 18,
      researchPoints: 40,
      globalBonusKey: 'growth_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Fish Growth',
    },
  },
  {
    id: 'ms_level_10',
    category: 'Aquarium',
    title: 'Established Sanctuary',
    description: 'Reach Global Aquarium Rank 10.',
    target: 10,
    metric: 'aquarium_level',
    reward: {
      gems: 35,
      researchPoints: 80,
      globalBonusKey: 'offline_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Offline Efficiency',
    },
  },
  {
    id: 'ms_level_25',
    category: 'Aquarium',
    title: 'World-Class Curator',
    description: 'Reach Global Aquarium Rank 25.',
    target: 25,
    metric: 'aquarium_level',
    reward: {
      gems: 90,
      researchPoints: 200,
      globalBonusKey: 'growth_pct',
      globalBonusValue: 8,
      retroactiveMapExpansion: {
        habitatId: 'coral_reef',
        tier: 1,
        label: 'Coral Reef Expansion II',
      },
      badgeLabel: '+8% Growth · Reef Expansion',
    },
  },
  {
    id: 'ms_level_50',
    category: 'Aquarium',
    title: 'Legendary Aquascape Sovereign',
    description: 'Reach Global Aquarium Rank 50.',
    target: 50,
    metric: 'aquarium_level',
    reward: {
      gems: 220,
      researchPoints: 500,
      globalBonusKey: 'offline_pct',
      globalBonusValue: 10,
      badgeLabel: '+10% Offline Efficiency',
    },
  },

  // MAP COMPLETION
  {
    id: 'ms_maps_1',
    category: 'Maps',
    title: 'First Map Master',
    description: 'Reach 100% species discovery in 1 map.',
    target: 1,
    metric: 'complete_maps',
    reward: {
      gems: 30,
      researchPoints: 65,
      globalBonusKey: 'growth_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Fish Growth',
    },
  },
  {
    id: 'ms_maps_3',
    category: 'Maps',
    title: 'Tri-Biome Explorer',
    description: 'Reach 100% species discovery in 3 maps.',
    target: 3,
    metric: 'complete_maps',
    reward: {
      gems: 65,
      researchPoints: 140,
      globalBonusKey: 'offline_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Offline Efficiency',
    },
  },
  {
    id: 'ms_maps_5',
    category: 'Maps',
    title: 'Voyager of Five Waters',
    description: 'Reach 100% species discovery in 5 maps.',
    target: 5,
    metric: 'complete_maps',
    reward: {
      gems: 110,
      researchPoints: 240,
      globalBonusKey: 'food_efficiency_pct',
      globalBonusValue: 8,
      badgeLabel: '+8% Food Efficiency',
    },
  },
  {
    id: 'ms_maps_10',
    category: 'Maps',
    title: 'Continental Ichthyologist',
    description: 'Reach 100% species discovery in 10 maps.',
    target: 10,
    metric: 'complete_maps',
    reward: {
      gems: 190,
      researchPoints: 420,
      globalBonusKey: 'rare_discovery_pct',
      globalBonusValue: 10,
      badgeLabel: '+10% Rare Discovery',
    },
  },
  {
    id: 'ms_maps_20',
    category: 'Maps',
    title: 'Master of All 20 Seas',
    description: 'Reach 100% species discovery across all 20 world maps.',
    target: 20,
    metric: 'complete_maps',
    reward: {
      gems: 400,
      researchPoints: 1000,
      globalBonusKey: 'growth_pct',
      globalBonusValue: 12,
      badgeLabel: 'Grand Master · +12% Growth',
    },
  },

  // POPULATION
  {
    id: 'ms_pop_10',
    category: 'Population',
    title: 'Thriving Shoal',
    description: 'Raise or adopt 10 fish in total.',
    target: 10,
    metric: 'population_born',
    reward: {
      gems: 12,
      researchPoints: 25,
      globalBonusKey: 'food_efficiency_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Food Efficiency',
    },
  },
  {
    id: 'ms_pop_50',
    category: 'Population',
    title: 'Abundant Waters',
    description: 'Raise or adopt 50 fish in total.',
    target: 50,
    metric: 'population_born',
    reward: {
      gems: 40,
      researchPoints: 90,
      globalBonusKey: 'growth_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Fish Growth',
    },
  },
  {
    id: 'ms_pop_100',
    category: 'Population',
    title: 'Living Metropolis',
    description: 'Raise or adopt 100 fish in total.',
    target: 100,
    metric: 'population_born',
    reward: {
      gems: 85,
      researchPoints: 180,
      globalBonusKey: 'food_efficiency_pct',
      globalBonusValue: 8,
      badgeLabel: '+8% Food Efficiency',
    },
  },

  // BEAUTY
  {
    id: 'ms_beauty_50',
    category: 'Beauty',
    title: 'Artful Aquascaper',
    description: 'Reach 50 total Beauty Score across your habitats.',
    target: 50,
    metric: 'beauty_score',
    reward: {
      gems: 18,
      researchPoints: 35,
      globalBonusKey: 'offline_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Offline Efficiency',
    },
  },
  {
    id: 'ms_beauty_100',
    category: 'Beauty',
    title: 'Living Gallery',
    description: 'Reach 100 combined Beauty Score across habitats.',
    target: 100,
    metric: 'beauty_score',
    reward: {
      gems: 45,
      researchPoints: 95,
      globalBonusKey: 'rare_discovery_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Rare Discovery',
    },
  },
  {
    id: 'ms_beauty_500',
    category: 'Beauty',
    title: 'Radiant Panorama',
    description: 'Reach 500 combined Beauty Score across habitats.',
    target: 500,
    metric: 'beauty_score',
    reward: {
      gems: 130,
      researchPoints: 260,
      globalBonusKey: 'offline_pct',
      globalBonusValue: 8,
      badgeLabel: '+8% Offline Efficiency',
    },
  },

  // FEEDING
  {
    id: 'ms_feed_10',
    category: 'Feeding',
    title: 'Caring Keeper',
    description: 'Feed your aquarium 10 times.',
    target: 10,
    metric: 'times_fed',
    reward: {
      gems: 12,
      researchPoints: 25,
      globalBonusKey: 'food_efficiency_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Food Efficiency',
    },
  },
  {
    id: 'ms_feed_50',
    category: 'Feeding',
    title: 'Devoted Caretaker',
    description: 'Feed your aquarium 50 times.',
    target: 50,
    metric: 'times_fed',
    reward: {
      gems: 35,
      researchPoints: 75,
      globalBonusKey: 'food_efficiency_pct',
      globalBonusValue: 6,
      badgeLabel: '+6% Food Efficiency',
    },
  },
  {
    id: 'ms_feed_1000',
    category: 'Feeding',
    title: 'Feast Master',
    description: 'Feed your aquariums 1,000 times (manual + auto).',
    target: 1000,
    metric: 'times_fed',
    reward: {
      gems: 150,
      researchPoints: 350,
      globalBonusKey: 'food_efficiency_pct',
      globalBonusValue: 10,
      badgeLabel: '+10% Food Efficiency',
    },
  },

  // RESEARCH
  {
    id: 'ms_research_5',
    category: 'Research',
    title: 'Lab Apprentice',
    description: 'Complete 5 total Research upgrades.',
    target: 5,
    metric: 'research_levels',
    reward: {
      gems: 20,
      researchPoints: 45,
      globalBonusKey: 'growth_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Fish Growth',
    },
  },
  {
    id: 'ms_research_10',
    category: 'Research',
    title: 'Marine Scientist',
    description: 'Complete 10 total Research upgrades.',
    target: 10,
    metric: 'research_levels',
    reward: {
      gems: 45,
      researchPoints: 100,
      globalBonusKey: 'breeding_pct',
      globalBonusValue: 5,
      badgeLabel: '+5% Breeding Speed',
    },
  },
  {
    id: 'ms_research_25',
    category: 'Research',
    title: 'Chief Oceanographer',
    description: 'Complete 25 total Research upgrades.',
    target: 25,
    metric: 'research_levels',
    reward: {
      gems: 110,
      researchPoints: 250,
      globalBonusKey: 'offline_pct',
      globalBonusValue: 8,
      badgeLabel: '+8% Offline Efficiency',
    },
  },
];

export const MILESTONE_BY_ID: Record<string, MilestoneData> = Object.fromEntries(
  MILESTONE_CATALOG.map((m) => [m.id, m])
);
