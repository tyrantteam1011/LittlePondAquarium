import { MissionData } from '../core/types';

/**
 * Daily Ecosystem Missions — Award Coins, Gems, Research Points (RP), and Map Tokens
 */
export const MISSION_CATALOG: MissionData[] = [
  {
    id: 'daily_feed_2',
    title: 'Treat Time',
    description: 'Feed your fish 2 times.',
    metric: 'feed_fish',
    target: 2,
    reward: { coins: 260, gems: 4, researchPoints: 10, mapTokens: 2, xp: 30, label: '+260 c · +10 RP · +2 Tokens' },
  },
  {
    id: 'daily_collect_creatures_3',
    title: 'Shell Collector',
    description: 'Collect 3 Shell Coins or Pearls from creatures.',
    metric: 'collect_creature_coins',
    target: 3,
    reward: { coins: 320, gems: 5, researchPoints: 12, mapTokens: 3, xp: 35, label: '+320 c · +12 RP · +3 Tokens' },
  },
  {
    id: 'daily_place_decor_2',
    title: 'Ecosystem Builder',
    description: 'Place 2 plants, filters, or decorations.',
    metric: 'place_decoration',
    target: 2,
    reward: { coins: 380, gems: 5, researchPoints: 14, mapTokens: 2, xp: 35, label: '+380 c · +14 RP · +5 Gems' },
  },
  {
    id: 'daily_discover_1',
    title: 'New Fin Friend',
    description: 'Discover 1 new fish species.',
    metric: 'discover_fish',
    target: 1,
    reward: { coins: 550, gems: 8, researchPoints: 18, mapTokens: 3, xp: 50, label: '+550 c · +18 RP · +8 Gems' },
  },
  {
    id: 'daily_grow_2',
    title: 'Growing Strong',
    description: 'Watch 2 fish grow to their next life stage.',
    metric: 'grow_fish',
    target: 2,
    reward: { coins: 480, gems: 6, researchPoints: 16, mapTokens: 3, xp: 45, label: '+480 c · +16 RP · +6 Gems' },
  },
  {
    id: 'daily_breed_1',
    title: 'New Life',
    description: 'Hatch 1 baby fish from an aquarium egg.',
    metric: 'breed_fish',
    target: 1,
    reward: { coins: 750, gems: 10, researchPoints: 25, mapTokens: 4, xp: 60, label: '+750 c · +25 RP · +10 Gems' },
  },
  {
    id: 'daily_research_1',
    title: 'Marine Scholar',
    description: 'Complete 1 node in the Research Center.',
    metric: 'complete_research',
    target: 1,
    reward: { coins: 600, gems: 8, researchPoints: 15, mapTokens: 3, xp: 45, label: '+600 c · +15 RP · +8 Gems' },
  },
  {
    id: 'daily_earn_2000',
    title: 'Steady Ripples',
    description: 'Earn 2,000 Coins in total.',
    metric: 'earn_coins',
    target: 2000,
    reward: { coins: 500, gems: 5, researchPoints: 12, mapTokens: 2, xp: 35, label: '+500 c · +12 RP · +5 Gems' },
  },
  {
    id: 'daily_rare_visitor_1',
    title: 'Lucky Sighting',
    description: 'Tap 1 Rare Visitor fish swimming through.',
    metric: 'tap_rare_visitor',
    target: 1,
    reward: { coins: 850, gems: 10, researchPoints: 22, mapTokens: 4, xp: 55, label: '+850 c · +22 RP · +10 Gems' },
  },
  {
    id: 'daily_beauty_30',
    title: 'Harmonious Tank',
    description: 'Reach a Beauty Score of 30.',
    metric: 'reach_beauty',
    target: 30,
    reward: { coins: 700, gems: 8, researchPoints: 18, mapTokens: 3, xp: 45, label: '+700 c · +18 RP · +8 Gems' },
  },
];

export const MISSION_BY_ID: Record<string, MissionData> = Object.fromEntries(
  MISSION_CATALOG.map((m) => [m.id, m])
);
