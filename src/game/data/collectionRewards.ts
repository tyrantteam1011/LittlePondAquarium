import { CollectionRewardData } from '../core/types';

/**
 * 20 Collection Milestones — Award Coins, Gems, Research Points, Decorations & Income Bonuses
 */
export const COLLECTION_REWARDS: CollectionRewardData[] = [
  {
    id: 'col_global_2',
    requiredDiscovered: 2,
    title: 'First Pairing',
    reward: { coins: 220, gems: 5, researchPoints: 10, incomeBonusPercent: 3, label: '+3% Income · +10 RP' },
  },
  {
    id: 'col_global_3',
    requiredDiscovered: 3,
    title: 'Budding Collector',
    reward: { coins: 400, gems: 6, researchPoints: 15, label: '+400 c · +15 RP' },
  },
  {
    id: 'col_global_4',
    requiredDiscovered: 4,
    title: 'Colorful Shallows',
    reward: { coins: 650, gems: 8, researchPoints: 18, incomeBonusPercent: 4, label: '+4% Income · +18 RP' },
  },
  {
    id: 'col_global_5',
    requiredDiscovered: 5,
    title: '5 Species Milestone',
    reward: { coins: 1200, gems: 12, researchPoints: 25, incomeBonusPercent: 5, label: '+5% Income · +25 RP' },
  },
  {
    id: 'col_global_7',
    requiredDiscovered: 7,
    title: 'Vibrant Community',
    reward: { coins: 2600, gems: 15, researchPoints: 30, incomeBonusPercent: 5, label: '+5% Income · +30 RP' },
  },
  {
    id: 'col_global_9',
    requiredDiscovered: 9,
    title: 'Waterways Curator',
    reward: { coins: 5000, gems: 18, researchPoints: 35, unlockDecorationId: 'lotus_lily', label: 'Free Lotus Lily · +35 RP' },
  },
  {
    id: 'col_global_11',
    requiredDiscovered: 11,
    title: '11 Species Milestone',
    reward: { coins: 9500, gems: 22, researchPoints: 45, unlockDecorationId: 'aqua_bonsai', label: 'Moss Bonsai · +45 RP' },
  },
  {
    id: 'col_global_14',
    requiredDiscovered: 14,
    title: 'Estuary Naturalist',
    reward: { coins: 22000, gems: 28, researchPoints: 55, incomeBonusPercent: 8, label: '+8% Income · +55 RP' },
  },
  {
    id: 'col_global_17',
    requiredDiscovered: 17,
    title: 'Reef Archivist',
    reward: { coins: 55000, gems: 35, researchPoints: 70, incomeBonusPercent: 10, label: '+10% Income · +70 RP' },
  },
  {
    id: 'col_global_20',
    requiredDiscovered: 20,
    title: 'Pelagic Explorer',
    reward: { coins: 120000, gems: 45, researchPoints: 90, unlockDecorationId: 'pearl_clam', label: 'Moonpearl Clam · +90 RP' },
  },
  {
    id: 'col_global_23',
    requiredDiscovered: 23,
    title: 'Abyssal Scholar',
    reward: { coins: 240000, gems: 60, researchPoints: 120, incomeBonusPercent: 12, label: '+12% Income · +120 RP' },
  },
  {
    id: 'col_global_26',
    requiredDiscovered: 26,
    title: 'Grand Aquarist',
    reward: { coins: 500000, gems: 120, researchPoints: 180, incomeBonusPercent: 20, label: '+20% Income · +180 RP' },
  },

  // Habitat-Specific Collection Rewards (8 Maps)
  {
    id: 'col_hab_pond',
    habitatId: 'pond',
    requiredDiscovered: 6,
    title: 'Little Pond Complete',
    reward: { coins: 4500, gems: 25, researchPoints: 40, incomeBonusPercent: 8, label: '+8% Income · +40 RP' },
  },
  {
    id: 'col_hab_lake',
    habitatId: 'lake',
    requiredDiscovered: 5,
    title: 'Forest Lake Complete',
    reward: { coins: 18000, gems: 30, researchPoints: 50, incomeBonusPercent: 8, label: '+8% Income · +50 RP' },
  },
  {
    id: 'col_hab_river',
    habitatId: 'river',
    requiredDiscovered: 3,
    title: 'Flowing River Complete',
    reward: { coins: 32000, gems: 30, researchPoints: 55, incomeBonusPercent: 8, label: '+8% Income · +55 RP' },
  },
  {
    id: 'col_hab_wetland',
    habitatId: 'wetland',
    requiredDiscovered: 3,
    title: 'Misty Wetland Complete',
    reward: { coins: 65000, gems: 35, researchPoints: 65, incomeBonusPercent: 10, label: '+10% Income · +65 RP' },
  },
  {
    id: 'col_hab_mangrove',
    habitatId: 'mangrove',
    requiredDiscovered: 2,
    title: 'Mangrove Cove Complete',
    reward: { coins: 95000, gems: 35, researchPoints: 70, incomeBonusPercent: 10, label: '+10% Income · +70 RP' },
  },
  {
    id: 'col_hab_coral',
    habitatId: 'coral_reef',
    requiredDiscovered: 5,
    title: 'Coral Reef Complete',
    reward: { coins: 180000, gems: 45, researchPoints: 95, incomeBonusPercent: 12, label: '+12% Income · +95 RP' },
  },
  {
    id: 'col_hab_ocean',
    habitatId: 'open_ocean',
    requiredDiscovered: 2,
    title: 'Open Ocean Complete',
    reward: { coins: 340000, gems: 55, researchPoints: 110, incomeBonusPercent: 12, label: '+12% Income · +110 RP' },
  },
  {
    id: 'col_hab_deep',
    habitatId: 'deep_ocean',
    requiredDiscovered: 2,
    title: 'Deep Ocean Complete',
    reward: { coins: 650000, gems: 75, researchPoints: 150, incomeBonusPercent: 15, label: '+15% Income · +150 RP' },
  },
];
