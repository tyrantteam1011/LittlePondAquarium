import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AutoFeederUpgradeId,
  CollectionRewardData,
  ConservationProjectData,
  CreatureData,
  DecorationCategory,
  DecorationData,
  EncyclopediaCategory,
  EventThemeData,
  FishBehaviorType,
  FishData,
  FishDietType,
  GeneticVariant,
  GrowthStage,
  HabitatData,
  HabitatId,
  LocalUpgradeData,
  MissionData,
  Rarity,
  ResearchCategory,
  ResearchNodeData,
  SchoolingCategory,
  SpecialistData,
  UpgradeData,
  WaterQualityState,
} from '../core/types';
import { MilestoneCategory, MilestoneData } from '../data/milestoneCatalog';
import { LocaleId, SUPPORTED_LANGUAGES, TranslationParams } from './types';
import { hasTranslationKey, resolveTranslation } from './localizationData';

const LOCALE_STORAGE_KEY = 'coralia_locale_v1';
const LANG_SELECTED_KEY = 'coralia_language_selected_v1';
const LOC_DEBUG_STORAGE_KEY = 'coralia_loc_debug_v1';
const LOC_PSEUDO_STORAGE_KEY = 'coralia_loc_pseudo_v1';

const VALID_LOCALE_IDS: LocaleId[] = SUPPORTED_LANGUAGES.map((l) => l.id);

const PSEUDO_CHAR_MAP: Record<string, string> = {
  a: 'à',
  A: 'À',
  e: 'ë',
  E: 'Ë',
  i: 'ï',
  I: 'Ï',
  o: 'ô',
  O: 'Ô',
  u: 'ü',
  U: 'Ü',
  c: 'ç',
  C: 'Ç',
  n: 'ñ',
  N: 'Ñ',
  y: 'ÿ',
  Y: 'Ÿ',
  s: 'š',
  S: 'Š',
};

/**
 * Biến đổi chuỗi sang chế độ giả ngôn ngữ (+40% độ dài, thêm dấu phụ) để kiểm tra tràn bố cục UI.
 */
export function applyPseudoLocale(input: string): string {
  // Giữ nguyên các cụm biến {param} nếu còn sót lại
  const parts = input.split(/(\{[a-zA-Z0-9_]+\})/g);
  const transformed = parts
    .map((part) => {
      if (part.startsWith('{') && part.endsWith('}')) return part;
      let out = '';
      for (const ch of part) {
        out += PSEUDO_CHAR_MAP[ch] ?? ch;
      }
      return out;
    })
    .join('');

  const padLen = Math.max(2, Math.ceil(input.length * 0.4));
  const pad = '~'.repeat(Math.min(24, padLen));
  return `[${transformed} ${pad}]`;
}

export function detectDeviceLocale(): LocaleId {
  try {
    const candidates = [
      ...(Array.isArray(navigator.languages) ? navigator.languages : []),
      navigator.language,
    ].filter(Boolean);

    for (const raw of candidates) {
      const lower = raw.toLowerCase();
      if (lower.startsWith('vi')) return 'vi-VN';
      if (lower.startsWith('de')) return 'de-DE';
      if (lower.startsWith('pt')) return 'pt-PT';
      if (lower.startsWith('ms') || lower.startsWith('id')) return 'ms-MY';
      if (lower.startsWith('zh')) return 'zh-CN';
      if (lower.startsWith('en')) return 'en-US';
    }
  } catch {
    // Fallback to en-US
  }
  return 'en-US';
}

type LocaleListener = (locale: LocaleId) => void;

class LocalizationService {
  private currentLocale: LocaleId;
  private languageSelected: boolean;
  private debugMode: boolean;
  private pseudoLocale: boolean;
  private listeners = new Set<LocaleListener>();
  private missingKeyLog = new Set<string>();

  constructor() {
    let saved: string | null = null;
    let selectedFlag = false;
    let savedDebug = false;
    let savedPseudo = false;
    try {
      saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      selectedFlag = localStorage.getItem(LANG_SELECTED_KEY) === 'true';
      savedDebug = localStorage.getItem(LOC_DEBUG_STORAGE_KEY) === 'true';
      savedPseudo = localStorage.getItem(LOC_PSEUDO_STORAGE_KEY) === 'true';
    } catch {
      // Ignore storage access errors
    }

    if (saved && VALID_LOCALE_IDS.includes(saved as LocaleId)) {
      this.currentLocale = saved as LocaleId;
      this.languageSelected = selectedFlag;
    } else {
      this.currentLocale = detectDeviceLocale();
      this.languageSelected = false;
    }

    this.debugMode = savedDebug;
    this.pseudoLocale = savedPseudo;
    this.applyDocumentLang(this.currentLocale);
  }

  private applyDocumentLang(locale: LocaleId): void {
    try {
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = locale;
      }
    } catch {
      // Ignore SSR/non-DOM environments
    }
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.currentLocale));
  }

  getLocale(): LocaleId {
    return this.currentLocale;
  }

  hasSelectedLanguage(): boolean {
    return this.languageSelected;
  }

  isDebugMode(): boolean {
    return this.debugMode;
  }

  isPseudoLocale(): boolean {
    return this.pseudoLocale;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    try {
      localStorage.setItem(LOC_DEBUG_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // Ignore storage access errors
    }
    this.notify();
  }

  toggleDebugMode(): boolean {
    this.setDebugMode(!this.debugMode);
    return this.debugMode;
  }

  setPseudoLocale(enabled: boolean): void {
    this.pseudoLocale = enabled;
    try {
      localStorage.setItem(LOC_PSEUDO_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // Ignore storage access errors
    }
    this.notify();
  }

  togglePseudoLocale(): boolean {
    this.setPseudoLocale(!this.pseudoLocale);
    return this.pseudoLocale;
  }

  getMissingKeyLog(): string[] {
    return Array.from(this.missingKeyLog);
  }

  clearMissingKeyLog(): void {
    this.missingKeyLog.clear();
    this.notify();
  }

  setLocale(locale: LocaleId, markSelected = true): void {
    if (!VALID_LOCALE_IDS.includes(locale)) return;
    this.currentLocale = locale;
    if (markSelected) {
      this.languageSelected = true;
    }
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      if (markSelected) {
        localStorage.setItem(LANG_SELECTED_KEY, 'true');
      }
    } catch {
      // Ignore storage quota errors
    }
    this.applyDocumentLang(locale);
    this.notify();
  }

  confirmLanguageSelection(locale?: LocaleId): void {
    this.setLocale(locale ?? this.currentLocale, true);
  }

  resetLanguageSelectionForDebug(): void {
    this.languageSelected = false;
    try {
      localStorage.removeItem(LANG_SELECTED_KEY);
    } catch {
      // Ignore
    }
    this.notify();
  }

  subscribe(listener: LocaleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Tra cứu chuỗi theo khóa bản địa hóa và thay thế biến nội suy {key}.
   */
  get(key: string, params?: TranslationParams, localeOverride?: LocaleId): string {
    const locale = localeOverride ?? this.currentLocale;
    const resolved = resolveTranslation(key, locale);

    if (resolved.status !== 'ok') {
      const logEntry = `${locale}:${resolved.status}:${key}`;
      if (!this.missingKeyLog.has(logEntry)) {
        this.missingKeyLog.add(logEntry);
        if (this.debugMode) {
          console.warn(`[Localization] ${resolved.status} for key "${key}" in locale "${locale}"`);
        }
      }
    }

    let text = resolved.text;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }

    if (this.debugMode) {
      if (resolved.status === 'missing_key') {
        return `[MISSING:${key}]`;
      }
      if (resolved.status === 'fallback_en') {
        return `[EN-FALLBACK:${key}] ${text}`;
      }
    }

    if (this.pseudoLocale && !localeOverride) {
      return applyPseudoLocale(text);
    }

    return text;
  }

  /**
   * Hỗ trợ chia số ít / số nhiều chuẩn Intl.PluralRules dựa trên cặp khóa *_ONE và *_OTHER.
   */
  getPlural(
    baseKey: string,
    count: number,
    params?: TranslationParams,
    localeOverride?: LocaleId
  ): string {
    const locale = localeOverride ?? this.currentLocale;
    let form: Intl.LDMLPluralRule = count === 1 ? 'one' : 'other';
    try {
      form = new Intl.PluralRules(locale).select(count);
    } catch {
      form = count === 1 ? 'one' : 'other';
    }
    const candidateKey = form === 'one' ? `${baseKey}_ONE` : `${baseKey}_OTHER`;
    const resolvedKey = hasTranslationKey(candidateKey)
      ? candidateKey
      : hasTranslationKey(`${baseKey}_OTHER`)
        ? `${baseKey}_OTHER`
        : baseKey;
    return this.get(resolvedKey, { count, ...params }, localeOverride);
  }

  formatNumber(value: number, localeOverride?: LocaleId): string {
    const locale = localeOverride ?? this.currentLocale;
    if (!Number.isFinite(value)) return '0';
    const abs = Math.abs(value);

    if (abs < 1000) {
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.floor(value));
    }

    if (locale === 'zh-CN') {
      if (abs >= 1e8) {
        return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value / 1e8)}亿`;
      }
      if (abs >= 1e4) {
        return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / 1e4)}万`;
      }
    }

    const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa'];
    const tier = Math.min(Math.floor(Math.log10(abs) / 3), suffixes.length - 1);
    const scaled = value / Math.pow(10, tier * 3);
    const maxFrac = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
    const formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: maxFrac,
    }).format(scaled);
    return `${formatted}${suffixes[tier]}`;
  }

  formatPercent(value: number, localeOverride?: LocaleId): string {
    const locale = localeOverride ?? this.currentLocale;
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(value))}%`;
  }

  formatDate(timestampMs: number, localeOverride?: LocaleId): string {
    const locale = localeOverride ?? this.currentLocale;
    try {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(timestampMs));
    } catch {
      return new Date(timestampMs).toLocaleDateString();
    }
  }

  formatDuration(seconds: number, localeOverride?: LocaleId): string {
    const locale = localeOverride ?? this.currentLocale;
    const safe = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;

    if (locale === 'zh-CN') {
      if (hours > 0) return `${hours}小时${minutes}分`;
      if (minutes > 0) return `${minutes}分${secs}秒`;
      return `${secs}秒`;
    }
    if (locale === 'vi-VN') {
      if (hours > 0) return `${hours}g ${minutes}p`;
      if (minutes > 0) return `${minutes}p ${secs}g`;
      return `${secs}g`;
    }
    if (locale === 'de-DE') {
      if (hours > 0) return `${hours} Std. ${minutes} Min.`;
      if (minutes > 0) return `${minutes} Min. ${secs} Sek.`;
      return `${secs} Sek.`;
    }
    if (locale === 'ms-MY') {
      if (hours > 0) return `${hours}j ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${secs}s`;
      return `${secs}s`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  // ==================== HABITAT HELPERS ====================
  getHabitatName(habitatOrId: HabitatData | HabitatId, localeOverride?: LocaleId): string {
    const id = typeof habitatOrId === 'string' ? habitatOrId : habitatOrId.id;
    return this.get(`MAP_${id}`, undefined, localeOverride);
  }

  getHabitatSpec(habitatOrId: HabitatData | HabitatId, localeOverride?: LocaleId): string {
    const id = typeof habitatOrId === 'string' ? habitatOrId : habitatOrId.id;
    return this.get(`habitat.${id}.spec`, undefined, localeOverride);
  }

  getHabitatMechanic(habitatOrId: HabitatData | HabitatId, localeOverride?: LocaleId): string {
    const id = typeof habitatOrId === 'string' ? habitatOrId : habitatOrId.id;
    return this.get(`habitat.${id}.mechanic`, undefined, localeOverride);
  }

  getHabitatToken(habitatOrId: HabitatData | HabitatId, localeOverride?: LocaleId): string {
    const id = typeof habitatOrId === 'string' ? habitatOrId : habitatOrId.id;
    return this.get(`habitat.${id}.token`, undefined, localeOverride);
  }

  getMapFoodName(habitatId: HabitatId, localeOverride?: LocaleId): string {
    return this.get(`food.map.${habitatId}`, undefined, localeOverride);
  }

  // ==================== FISH LOCALIZATION HELPERS ====================
  getFishName(fish: FishData, localeOverride?: LocaleId): string {
    const key = fish.nameKey || `fish.${fish.id}.name`;
    return this.get(key, undefined, localeOverride);
  }

  getFishDescription(fish: FishData, localeOverride?: LocaleId): string {
    const key = fish.descriptionKey || `fish.${fish.id}.description`;
    return this.get(key, undefined, localeOverride);
  }

  getFishNote(fish: FishData, localeOverride?: LocaleId): string {
    const key = fish.noteKey || `fish.${fish.id}.note`;
    return this.get(key, undefined, localeOverride);
  }

  getFishHabitat(fish: FishData, localeOverride?: LocaleId): string {
    const key = fish.habitatKey || `MAP_${fish.preferredHabitat}`;
    return this.get(key, undefined, localeOverride);
  }

  getFishDiet(diet: FishDietType, localeOverride?: LocaleId): string {
    return this.get(`diet.${diet}`, undefined, localeOverride);
  }

  getFishBehavior(behavior: FishBehaviorType, localeOverride?: LocaleId): string {
    return this.get(`behavior.${behavior}`, undefined, localeOverride);
  }

  getFishSchooling(schooling: SchoolingCategory, localeOverride?: LocaleId): string {
    return this.get(`schooling.${schooling}`, undefined, localeOverride);
  }

  getFishDepth(depth: 'surface' | 'mid' | 'deep' | 'bottom', localeOverride?: LocaleId): string {
    return this.get(`depth.${depth}`, undefined, localeOverride);
  }

  // ==================== DECORATION LOCALIZATION HELPERS ====================
  getDecorationName(decor: DecorationData, localeOverride?: LocaleId): string {
    const key = decor.nameKey || `decor.${decor.id}.name`;
    return this.get(key, undefined, localeOverride);
  }

  getDecorationDescription(decor: DecorationData, localeOverride?: LocaleId): string {
    const key = decor.descriptionKey || `decor.${decor.id}.description`;
    return this.get(key, undefined, localeOverride);
  }

  getDecorationEffect(decor: DecorationData, localeOverride?: LocaleId): string {
    const key = decor.effectDescriptionKey || `decor.${decor.id}.effect`;
    const fx = decor.effects;
    const params: TranslationParams = {
      oxygen: fx.oxygen ?? 0,
      filtration: fx.filtration ?? 0,
      shelter: fx.shelter ?? 0,
      algaeReduction: fx.algaeReduction ?? 0,
      circulation: fx.circulation ?? 0,
      temperatureDelta: fx.temperatureDelta ?? 0,
      visibilityBonus: fx.visibilityBonus ?? 0,
    };

    if (hasTranslationKey(key)) {
      return this.get(key, params, localeOverride);
    }

    const parts: string[] = [];
    if (fx.oxygen) parts.push(this.get('DECOR_EFFECT_OXYGEN', { value: fx.oxygen }, localeOverride));
    if (fx.filtration)
      parts.push(this.get('DECOR_EFFECT_FILTER', { value: fx.filtration }, localeOverride));
    if (fx.shelter)
      parts.push(this.get('DECOR_EFFECT_SHELTER', { value: fx.shelter }, localeOverride));
    if (fx.algaeReduction)
      parts.push(this.get('DECOR_EFFECT_ALGAE', { value: fx.algaeReduction }, localeOverride));
    if (fx.circulation)
      parts.push(this.get('DECOR_EFFECT_FLOW', { value: fx.circulation }, localeOverride));
    if (fx.temperatureDelta) {
      const signed = `${fx.temperatureDelta > 0 ? '+' : ''}${fx.temperatureDelta}`;
      parts.push(this.get('DECOR_EFFECT_TEMP', { value: signed }, localeOverride));
    }
    if (fx.visibilityBonus)
      parts.push(this.get('DECOR_EFFECT_LIGHT', { value: fx.visibilityBonus }, localeOverride));
    return parts.join(' · ');
  }

  getDecorationCategory(
    category: 'All' | DecorationCategory,
    localeOverride?: LocaleId
  ): string {
    return this.get(`decor.category.${category}`, undefined, localeOverride);
  }

  // ==================== CREATURE LOCALIZATION HELPERS ====================
  getCreatureName(creature: CreatureData, localeOverride?: LocaleId): string {
    const key = creature.nameKey || `creature.${creature.id}.name`;
    return this.get(key, undefined, localeOverride);
  }

  getCreatureDescription(creature: CreatureData, localeOverride?: LocaleId): string {
    const key = creature.descriptionKey || `creature.${creature.id}.description`;
    return this.get(key, undefined, localeOverride);
  }

  getCreatureAbility(creature: CreatureData, localeOverride?: LocaleId): string {
    const key = creature.abilityKey || `creature.${creature.id}.ability`;
    return this.get(key, undefined, localeOverride);
  }

  // ==================== RESEARCH, UPGRADES, MISSIONS & EVENTS HELPERS ====================
  getResearchCategory(category: ResearchCategory, localeOverride?: LocaleId): string {
    return this.get(`research.cat.${category}`, undefined, localeOverride);
  }

  getResearchName(node: ResearchNodeData | string, localeOverride?: LocaleId): string {
    const id = typeof node === 'string' ? node : node.id;
    return this.get(`research.${id}.name`, undefined, localeOverride);
  }

  getResearchDescription(node: ResearchNodeData | string, localeOverride?: LocaleId): string {
    const id = typeof node === 'string' ? node : node.id;
    return this.get(`research.${id}.desc`, undefined, localeOverride);
  }

  getResearchUnit(node: ResearchNodeData | string, localeOverride?: LocaleId): string {
    const id = typeof node === 'string' ? node : node.id;
    return this.get(`research.${id}.unit`, undefined, localeOverride);
  }

  getSpecialistName(spec: SpecialistData | string, localeOverride?: LocaleId): string {
    const id = typeof spec === 'string' ? spec : spec.id;
    return this.get(`specialist.${id}.name`, undefined, localeOverride);
  }

  getSpecialistRole(spec: SpecialistData | string, localeOverride?: LocaleId): string {
    const id = typeof spec === 'string' ? spec : spec.id;
    return this.get(`specialist.${id}.role`, undefined, localeOverride);
  }

  getSpecialistSpecialty(spec: SpecialistData | string, localeOverride?: LocaleId): string {
    const id = typeof spec === 'string' ? spec : spec.id;
    return this.get(`specialist.${id}.specialty`, undefined, localeOverride);
  }

  getSpecialistDescription(spec: SpecialistData | string, localeOverride?: LocaleId): string {
    const id = typeof spec === 'string' ? spec : spec.id;
    return this.get(`specialist.${id}.desc`, undefined, localeOverride);
  }

  getConservationName(proj: ConservationProjectData | string, localeOverride?: LocaleId): string {
    const id = typeof proj === 'string' ? proj : proj.id;
    return this.get(`conservation.${id}.name`, undefined, localeOverride);
  }

  getConservationDescription(
    proj: ConservationProjectData | string,
    localeOverride?: LocaleId
  ): string {
    const id = typeof proj === 'string' ? proj : proj.id;
    return this.get(`conservation.${id}.desc`, undefined, localeOverride);
  }

  getConservationBonus(proj: ConservationProjectData | string, localeOverride?: LocaleId): string {
    const id = typeof proj === 'string' ? proj : proj.id;
    return this.get(`conservation.${id}.bonus`, undefined, localeOverride);
  }

  getLocalUpgradeName(u: LocalUpgradeData | string, localeOverride?: LocaleId): string {
    const id = typeof u === 'string' ? u : u.id;
    return this.get(`upgrade.local.${id}.name`, undefined, localeOverride);
  }

  getLocalUpgradeDescription(u: LocalUpgradeData | string, localeOverride?: LocaleId): string {
    const id = typeof u === 'string' ? u : u.id;
    return this.get(`upgrade.local.${id}.desc`, undefined, localeOverride);
  }

  getLocalUpgradeUnit(u: LocalUpgradeData | string, localeOverride?: LocaleId): string {
    const id = typeof u === 'string' ? u : u.id;
    return this.get(`upgrade.local.${id}.unit`, undefined, localeOverride);
  }

  getGlobalUpgradeName(u: UpgradeData | string, localeOverride?: LocaleId): string {
    const id = typeof u === 'string' ? u : u.id;
    return this.get(`upgrade.global.${id}.name`, undefined, localeOverride);
  }

  getGlobalUpgradeDescription(u: UpgradeData | string, localeOverride?: LocaleId): string {
    const id = typeof u === 'string' ? u : u.id;
    return this.get(`upgrade.global.${id}.desc`, undefined, localeOverride);
  }

  getGlobalUpgradeUnit(u: UpgradeData | string, localeOverride?: LocaleId): string {
    const id = typeof u === 'string' ? u : u.id;
    return this.get(`upgrade.global.${id}.unit`, undefined, localeOverride);
  }

  getMissionTitle(m: MissionData | string, localeOverride?: LocaleId): string {
    const id = typeof m === 'string' ? m : m.id;
    return this.get(`mission.${id}.title`, undefined, localeOverride);
  }

  getMissionDescription(m: MissionData | string, localeOverride?: LocaleId): string {
    const id = typeof m === 'string' ? m : m.id;
    return this.get(`mission.${id}.desc`, undefined, localeOverride);
  }

  getMissionReward(m: MissionData | string, localeOverride?: LocaleId): string {
    const id = typeof m === 'string' ? m : m.id;
    return this.get(`mission.${id}.reward`, undefined, localeOverride);
  }

  getEventName(e: EventThemeData | string, localeOverride?: LocaleId): string {
    const id = typeof e === 'string' ? e : e.id;
    return this.get(`event.${id}.name`, undefined, localeOverride);
  }

  getEventObjective(e: EventThemeData | string, localeOverride?: LocaleId): string {
    const id = typeof e === 'string' ? e : e.id;
    return this.get(`event.${id}.objective`, undefined, localeOverride);
  }

  getEventReward(e: EventThemeData | string, localeOverride?: LocaleId): string {
    const id = typeof e === 'string' ? e : e.id;
    return this.get(`event.${id}.reward`, undefined, localeOverride);
  }

  getMilestoneCategory(category: MilestoneCategory, localeOverride?: LocaleId): string {
    return this.get(`milestone.cat.${category}`, undefined, localeOverride);
  }

  getMilestoneTitle(ms: MilestoneData | string, localeOverride?: LocaleId): string {
    const id = typeof ms === 'string' ? ms : ms.id;
    return this.get(`milestone.${id}.title`, undefined, localeOverride);
  }

  getMilestoneDescription(ms: MilestoneData | string, localeOverride?: LocaleId): string {
    const id = typeof ms === 'string' ? ms : ms.id;
    return this.get(`milestone.${id}.desc`, undefined, localeOverride);
  }

  getMilestoneBadge(ms: MilestoneData | string, localeOverride?: LocaleId): string {
    const id = typeof ms === 'string' ? ms : ms.id;
    return this.get(`milestone.${id}.badge`, undefined, localeOverride);
  }

  getCollectionRewardTitle(c: CollectionRewardData | string, localeOverride?: LocaleId): string {
    const id = typeof c === 'string' ? c : c.id;
    return this.get(`collection.${id}.title`, undefined, localeOverride);
  }

  getCollectionRewardLabel(c: CollectionRewardData | string, localeOverride?: LocaleId): string {
    const id = typeof c === 'string' ? c : c.id;
    return this.get(`collection.${id}.reward`, undefined, localeOverride);
  }

  getAutoFeederNodeName(id: AutoFeederUpgradeId, localeOverride?: LocaleId): string {
    return this.get(`autofeeder.${id}.name`, undefined, localeOverride);
  }

  getAutoFeederNodeDescription(id: AutoFeederUpgradeId, localeOverride?: LocaleId): string {
    return this.get(`autofeeder.${id}.desc`, undefined, localeOverride);
  }

  getBeautyMilestoneTitle(score: number, localeOverride?: LocaleId): string {
    return this.get(`beauty.ms.${score}.title`, undefined, localeOverride);
  }

  getBeautyMilestoneReward(score: number, localeOverride?: LocaleId): string {
    return this.get(`beauty.ms.${score}.reward`, undefined, localeOverride);
  }

  getIapName(productId: string, localeOverride?: LocaleId): string {
    return this.get(`shop.${productId}.name`, undefined, localeOverride);
  }

  getIapDescription(productId: string, localeOverride?: LocaleId): string {
    return this.get(`shop.${productId}.desc`, undefined, localeOverride);
  }

  getIapTag(productId: string, localeOverride?: LocaleId): string | null {
    const key = `shop.${productId}.tag`;
    return hasTranslationKey(key) ? this.get(key, undefined, localeOverride) : null;
  }

  // ==================== SHARED GAMEPLAY LABEL HELPERS ====================
  getRarityLabel(rarity: Rarity, localeOverride?: LocaleId): string {
    return this.get(`RARITY_${rarity}`, undefined, localeOverride);
  }

  getStageLabel(stage: GrowthStage, localeOverride?: LocaleId): string {
    return this.get(`STAGE_${stage}`, undefined, localeOverride);
  }

  getVariantLabel(variant: GeneticVariant, localeOverride?: LocaleId): string {
    return this.get(`VARIANT_${variant}`, undefined, localeOverride);
  }

  getWaterStateLabel(state: WaterQualityState, localeOverride?: LocaleId): string {
    return this.get(`water_state.${state}`, undefined, localeOverride);
  }

  getEncyclopediaCategoryLabel(
    category: 'All' | EncyclopediaCategory,
    localeOverride?: LocaleId
  ): string {
    return this.get(`encyclo.category.${category}`, undefined, localeOverride);
  }
}

export const LocalizationManager = new LocalizationService();

interface LocalizationContextValue {
  locale: LocaleId;
  hasSelectedLanguage: boolean;
  debugMode: boolean;
  pseudoLocale: boolean;
  missingKeyLog: string[];
  setLocale: (locale: LocaleId) => void;
  confirmLanguage: (locale?: LocaleId) => void;
  toggleDebugMode: () => boolean;
  togglePseudoLocale: () => boolean;
  clearMissingKeyLog: () => void;
  t: (key: string, params?: TranslationParams) => string;
  tPlural: (baseKey: string, count: number, params?: TranslationParams) => string;
  formatNumber: (value: number) => string;
  formatPercent: (value: number) => string;
  formatDate: (timestampMs: number) => string;
  formatDuration: (seconds: number) => string;
  getHabitatName: (habitatOrId: HabitatData | HabitatId) => string;
  getHabitatSpec: (habitatOrId: HabitatData | HabitatId) => string;
  getHabitatMechanic: (habitatOrId: HabitatData | HabitatId) => string;
  getHabitatToken: (habitatOrId: HabitatData | HabitatId) => string;
  getMapFoodName: (habitatId: HabitatId) => string;
  getFishName: (fish: FishData) => string;
  getFishDescription: (fish: FishData) => string;
  getFishNote: (fish: FishData) => string;
  getFishHabitat: (fish: FishData) => string;
  getFishDiet: (diet: FishDietType) => string;
  getFishBehavior: (behavior: FishBehaviorType) => string;
  getFishSchooling: (schooling: SchoolingCategory) => string;
  getFishDepth: (depth: 'surface' | 'mid' | 'deep' | 'bottom') => string;
  getCreatureName: (creature: CreatureData) => string;
  getCreatureDescription: (creature: CreatureData) => string;
  getCreatureAbility: (creature: CreatureData) => string;
  getDecorationName: (decor: DecorationData) => string;
  getDecorationDescription: (decor: DecorationData) => string;
  getDecorationEffect: (decor: DecorationData) => string;
  getDecorationCategory: (category: 'All' | DecorationCategory) => string;
  getResearchCategory: (category: ResearchCategory) => string;
  getResearchName: (node: ResearchNodeData | string) => string;
  getResearchDescription: (node: ResearchNodeData | string) => string;
  getResearchUnit: (node: ResearchNodeData | string) => string;
  getSpecialistName: (spec: SpecialistData | string) => string;
  getSpecialistRole: (spec: SpecialistData | string) => string;
  getSpecialistSpecialty: (spec: SpecialistData | string) => string;
  getSpecialistDescription: (spec: SpecialistData | string) => string;
  getConservationName: (proj: ConservationProjectData | string) => string;
  getConservationDescription: (proj: ConservationProjectData | string) => string;
  getConservationBonus: (proj: ConservationProjectData | string) => string;
  getLocalUpgradeName: (u: LocalUpgradeData | string) => string;
  getLocalUpgradeDescription: (u: LocalUpgradeData | string) => string;
  getLocalUpgradeUnit: (u: LocalUpgradeData | string) => string;
  getGlobalUpgradeName: (u: UpgradeData | string) => string;
  getGlobalUpgradeDescription: (u: UpgradeData | string) => string;
  getGlobalUpgradeUnit: (u: UpgradeData | string) => string;
  getMissionTitle: (m: MissionData | string) => string;
  getMissionDescription: (m: MissionData | string) => string;
  getMissionReward: (m: MissionData | string) => string;
  getEventName: (e: EventThemeData | string) => string;
  getEventObjective: (e: EventThemeData | string) => string;
  getEventReward: (e: EventThemeData | string) => string;
  getMilestoneCategory: (category: MilestoneCategory) => string;
  getMilestoneTitle: (ms: MilestoneData | string) => string;
  getMilestoneDescription: (ms: MilestoneData | string) => string;
  getMilestoneBadge: (ms: MilestoneData | string) => string;
  getCollectionRewardTitle: (c: CollectionRewardData | string) => string;
  getCollectionRewardLabel: (c: CollectionRewardData | string) => string;
  getAutoFeederNodeName: (id: AutoFeederUpgradeId) => string;
  getAutoFeederNodeDescription: (id: AutoFeederUpgradeId) => string;
  getBeautyMilestoneTitle: (score: number) => string;
  getBeautyMilestoneReward: (score: number) => string;
  getIapName: (productId: string) => string;
  getIapDescription: (productId: string) => string;
  getIapTag: (productId: string) => string | null;
  getRarityLabel: (rarity: Rarity) => string;
  getStageLabel: (stage: GrowthStage) => string;
  getVariantLabel: (variant: GeneticVariant) => string;
  getWaterStateLabel: (state: WaterQualityState) => string;
  getEncyclopediaCategoryLabel: (category: 'All' | EncyclopediaCategory) => string;
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

function buildContextValue(
  locale: LocaleId,
  hasSelectedLanguage: boolean,
  debugMode: boolean,
  pseudoLocale: boolean
): LocalizationContextValue {
  return {
    locale,
    hasSelectedLanguage,
    debugMode,
    pseudoLocale,
    missingKeyLog: LocalizationManager.getMissingKeyLog(),
    setLocale: (next) => LocalizationManager.setLocale(next, true),
    confirmLanguage: (next) => LocalizationManager.confirmLanguageSelection(next),
    toggleDebugMode: () => LocalizationManager.toggleDebugMode(),
    togglePseudoLocale: () => LocalizationManager.togglePseudoLocale(),
    clearMissingKeyLog: () => LocalizationManager.clearMissingKeyLog(),
    t: (key, params) => LocalizationManager.get(key, params),
    tPlural: (baseKey, count, params) => LocalizationManager.getPlural(baseKey, count, params),
    formatNumber: (v) => LocalizationManager.formatNumber(v, locale),
    formatPercent: (v) => LocalizationManager.formatPercent(v, locale),
    formatDate: (ts) => LocalizationManager.formatDate(ts, locale),
    formatDuration: (s) => LocalizationManager.formatDuration(s, locale),
    getHabitatName: (h) => LocalizationManager.getHabitatName(h),
    getHabitatSpec: (h) => LocalizationManager.getHabitatSpec(h),
    getHabitatMechanic: (h) => LocalizationManager.getHabitatMechanic(h),
    getHabitatToken: (h) => LocalizationManager.getHabitatToken(h),
    getMapFoodName: (h) => LocalizationManager.getMapFoodName(h),
    getFishName: (f) => LocalizationManager.getFishName(f),
    getFishDescription: (f) => LocalizationManager.getFishDescription(f),
    getFishNote: (f) => LocalizationManager.getFishNote(f),
    getFishHabitat: (f) => LocalizationManager.getFishHabitat(f),
    getFishDiet: (d) => LocalizationManager.getFishDiet(d),
    getFishBehavior: (b) => LocalizationManager.getFishBehavior(b),
    getFishSchooling: (s) => LocalizationManager.getFishSchooling(s),
    getFishDepth: (d) => LocalizationManager.getFishDepth(d),
    getCreatureName: (c) => LocalizationManager.getCreatureName(c),
    getCreatureDescription: (c) => LocalizationManager.getCreatureDescription(c),
    getCreatureAbility: (c) => LocalizationManager.getCreatureAbility(c),
    getDecorationName: (d) => LocalizationManager.getDecorationName(d),
    getDecorationDescription: (d) => LocalizationManager.getDecorationDescription(d),
    getDecorationEffect: (d) => LocalizationManager.getDecorationEffect(d),
    getDecorationCategory: (c) => LocalizationManager.getDecorationCategory(c),
    getResearchCategory: (c) => LocalizationManager.getResearchCategory(c),
    getResearchName: (n) => LocalizationManager.getResearchName(n),
    getResearchDescription: (n) => LocalizationManager.getResearchDescription(n),
    getResearchUnit: (n) => LocalizationManager.getResearchUnit(n),
    getSpecialistName: (s) => LocalizationManager.getSpecialistName(s),
    getSpecialistRole: (s) => LocalizationManager.getSpecialistRole(s),
    getSpecialistSpecialty: (s) => LocalizationManager.getSpecialistSpecialty(s),
    getSpecialistDescription: (s) => LocalizationManager.getSpecialistDescription(s),
    getConservationName: (p) => LocalizationManager.getConservationName(p),
    getConservationDescription: (p) => LocalizationManager.getConservationDescription(p),
    getConservationBonus: (p) => LocalizationManager.getConservationBonus(p),
    getLocalUpgradeName: (u) => LocalizationManager.getLocalUpgradeName(u),
    getLocalUpgradeDescription: (u) => LocalizationManager.getLocalUpgradeDescription(u),
    getLocalUpgradeUnit: (u) => LocalizationManager.getLocalUpgradeUnit(u),
    getGlobalUpgradeName: (u) => LocalizationManager.getGlobalUpgradeName(u),
    getGlobalUpgradeDescription: (u) => LocalizationManager.getGlobalUpgradeDescription(u),
    getGlobalUpgradeUnit: (u) => LocalizationManager.getGlobalUpgradeUnit(u),
    getMissionTitle: (m) => LocalizationManager.getMissionTitle(m),
    getMissionDescription: (m) => LocalizationManager.getMissionDescription(m),
    getMissionReward: (m) => LocalizationManager.getMissionReward(m),
    getEventName: (e) => LocalizationManager.getEventName(e),
    getEventObjective: (e) => LocalizationManager.getEventObjective(e),
    getEventReward: (e) => LocalizationManager.getEventReward(e),
    getMilestoneCategory: (c) => LocalizationManager.getMilestoneCategory(c),
    getMilestoneTitle: (m) => LocalizationManager.getMilestoneTitle(m),
    getMilestoneDescription: (m) => LocalizationManager.getMilestoneDescription(m),
    getMilestoneBadge: (m) => LocalizationManager.getMilestoneBadge(m),
    getCollectionRewardTitle: (c) => LocalizationManager.getCollectionRewardTitle(c),
    getCollectionRewardLabel: (c) => LocalizationManager.getCollectionRewardLabel(c),
    getAutoFeederNodeName: (id) => LocalizationManager.getAutoFeederNodeName(id),
    getAutoFeederNodeDescription: (id) => LocalizationManager.getAutoFeederNodeDescription(id),
    getBeautyMilestoneTitle: (s) => LocalizationManager.getBeautyMilestoneTitle(s),
    getBeautyMilestoneReward: (s) => LocalizationManager.getBeautyMilestoneReward(s),
    getIapName: (id) => LocalizationManager.getIapName(id),
    getIapDescription: (id) => LocalizationManager.getIapDescription(id),
    getIapTag: (id) => LocalizationManager.getIapTag(id),
    getRarityLabel: (r) => LocalizationManager.getRarityLabel(r),
    getStageLabel: (s) => LocalizationManager.getStageLabel(s),
    getVariantLabel: (v) => LocalizationManager.getVariantLabel(v),
    getWaterStateLabel: (s) => LocalizationManager.getWaterStateLabel(s),
    getEncyclopediaCategoryLabel: (c) => LocalizationManager.getEncyclopediaCategoryLabel(c),
  };
}

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<LocaleId>(() => LocalizationManager.getLocale());
  const [selected, setSelected] = useState<boolean>(() => LocalizationManager.hasSelectedLanguage());
  const [debugMode, setDebugModeState] = useState<boolean>(() => LocalizationManager.isDebugMode());
  const [pseudoLocale, setPseudoLocaleState] = useState<boolean>(() =>
    LocalizationManager.isPseudoLocale()
  );
  const [, setVersion] = useState(0);

  useEffect(() => {
    return LocalizationManager.subscribe((next) => {
      setLocaleState(next);
      setSelected(LocalizationManager.hasSelectedLanguage());
      setDebugModeState(LocalizationManager.isDebugMode());
      setPseudoLocaleState(LocalizationManager.isPseudoLocale());
      setVersion((v) => v + 1);
    });
  }, []);

  const value = buildContextValue(locale, selected, debugMode, pseudoLocale);
  return React.createElement(LocalizationContext.Provider, { value }, children);
};

export function useLocalization(): LocalizationContextValue {
  const ctx = useContext(LocalizationContext);
  if (ctx) return ctx;
  return buildContextValue(
    LocalizationManager.getLocale(),
    LocalizationManager.hasSelectedLanguage(),
    LocalizationManager.isDebugMode(),
    LocalizationManager.isPseudoLocale()
  );
}
