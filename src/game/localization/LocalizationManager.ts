import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  CreatureData,
  DecorationCategory,
  DecorationData,
  EncyclopediaCategory,
  FishBehaviorType,
  FishData,
  FishDietType,
  GeneticVariant,
  GrowthStage,
  HabitatData,
  HabitatId,
  Rarity,
  SchoolingCategory,
  WaterQualityState,
} from '../core/types';
import { LocaleId, SUPPORTED_LANGUAGES, TranslationParams } from './types';
import { hasTranslationKey, resolveTranslation } from './localizationData';

const LOCALE_STORAGE_KEY = 'coralia_locale_v1';
const LANG_SELECTED_KEY = 'coralia_language_selected_v1';
const LOC_DEBUG_STORAGE_KEY = 'coralia_loc_debug_v1';

const VALID_LOCALE_IDS: LocaleId[] = SUPPORTED_LANGUAGES.map((l) => l.id);

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
  private listeners = new Set<LocaleListener>();
  private missingKeyLog = new Set<string>();

  constructor() {
    let saved: string | null = null;
    let selectedFlag = false;
    let savedDebug = false;
    try {
      saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      selectedFlag = localStorage.getItem(LANG_SELECTED_KEY) === 'true';
      savedDebug = localStorage.getItem(LOC_DEBUG_STORAGE_KEY) === 'true';
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

  getMissingKeyLog(): string[] {
    return Array.from(this.missingKeyLog);
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

    return text;
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
      if (minutes > 0) return `${minutes}p ${secs}s`;
      return `${secs}s`;
    }
    if (locale === 'de-DE') {
      if (hours > 0) return `${hours} Std. ${minutes} Min.`;
      if (minutes > 0) return `${minutes} Min. ${secs} Sek.`;
      return `${secs} Sek.`;
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

    // Dynamic fallback assembly from localized effect tokens (never raw English)
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
  setLocale: (locale: LocaleId) => void;
  confirmLanguage: (locale?: LocaleId) => void;
  toggleDebugMode: () => boolean;
  t: (key: string, params?: TranslationParams) => string;
  formatNumber: (value: number) => string;
  formatPercent: (value: number) => string;
  formatDuration: (seconds: number) => string;
  getHabitatName: (habitatOrId: HabitatData | HabitatId) => string;
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
  getRarityLabel: (rarity: Rarity) => string;
  getStageLabel: (stage: GrowthStage) => string;
  getVariantLabel: (variant: GeneticVariant) => string;
  getWaterStateLabel: (state: WaterQualityState) => string;
  getEncyclopediaCategoryLabel: (category: 'All' | EncyclopediaCategory) => string;
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<LocaleId>(() => LocalizationManager.getLocale());
  const [selected, setSelected] = useState<boolean>(() => LocalizationManager.hasSelectedLanguage());
  const [debugMode, setDebugModeState] = useState<boolean>(() => LocalizationManager.isDebugMode());

  useEffect(() => {
    return LocalizationManager.subscribe((next) => {
      setLocaleState(next);
      setSelected(LocalizationManager.hasSelectedLanguage());
      setDebugModeState(LocalizationManager.isDebugMode());
    });
  }, []);

  const value: LocalizationContextValue = {
    locale,
    hasSelectedLanguage: selected,
    debugMode,
    setLocale: (next) => LocalizationManager.setLocale(next, true),
    confirmLanguage: (next) => LocalizationManager.confirmLanguageSelection(next),
    toggleDebugMode: () => LocalizationManager.toggleDebugMode(),
    t: (key, params) => LocalizationManager.get(key, params, locale),
    formatNumber: (v) => LocalizationManager.formatNumber(v, locale),
    formatPercent: (v) => LocalizationManager.formatPercent(v, locale),
    formatDuration: (s) => LocalizationManager.formatDuration(s, locale),
    getHabitatName: (h) => LocalizationManager.getHabitatName(h, locale),
    getFishName: (f) => LocalizationManager.getFishName(f, locale),
    getFishDescription: (f) => LocalizationManager.getFishDescription(f, locale),
    getFishNote: (f) => LocalizationManager.getFishNote(f, locale),
    getFishHabitat: (f) => LocalizationManager.getFishHabitat(f, locale),
    getFishDiet: (d) => LocalizationManager.getFishDiet(d, locale),
    getFishBehavior: (b) => LocalizationManager.getFishBehavior(b, locale),
    getFishSchooling: (s) => LocalizationManager.getFishSchooling(s, locale),
    getFishDepth: (d) => LocalizationManager.getFishDepth(d, locale),
    getCreatureName: (c) => LocalizationManager.getCreatureName(c, locale),
    getCreatureDescription: (c) => LocalizationManager.getCreatureDescription(c, locale),
    getCreatureAbility: (c) => LocalizationManager.getCreatureAbility(c, locale),
    getDecorationName: (d) => LocalizationManager.getDecorationName(d, locale),
    getDecorationDescription: (d) => LocalizationManager.getDecorationDescription(d, locale),
    getDecorationEffect: (d) => LocalizationManager.getDecorationEffect(d, locale),
    getDecorationCategory: (c) => LocalizationManager.getDecorationCategory(c, locale),
    getRarityLabel: (r) => LocalizationManager.getRarityLabel(r, locale),
    getStageLabel: (s) => LocalizationManager.getStageLabel(s, locale),
    getVariantLabel: (v) => LocalizationManager.getVariantLabel(v, locale),
    getWaterStateLabel: (s) => LocalizationManager.getWaterStateLabel(s, locale),
    getEncyclopediaCategoryLabel: (c) => LocalizationManager.getEncyclopediaCategoryLabel(c, locale),
  };

  return React.createElement(LocalizationContext.Provider, { value }, children);
};

export function useLocalization(): LocalizationContextValue {
  const ctx = useContext(LocalizationContext);
  if (ctx) return ctx;
  const fallbackLocale = LocalizationManager.getLocale();
  return {
    locale: fallbackLocale,
    hasSelectedLanguage: LocalizationManager.hasSelectedLanguage(),
    debugMode: LocalizationManager.isDebugMode(),
    setLocale: (next) => LocalizationManager.setLocale(next, true),
    confirmLanguage: (next) => LocalizationManager.confirmLanguageSelection(next),
    toggleDebugMode: () => LocalizationManager.toggleDebugMode(),
    t: (key, params) => LocalizationManager.get(key, params, fallbackLocale),
    formatNumber: (v) => LocalizationManager.formatNumber(v, fallbackLocale),
    formatPercent: (v) => LocalizationManager.formatPercent(v, fallbackLocale),
    formatDuration: (s) => LocalizationManager.formatDuration(s, fallbackLocale),
    getHabitatName: (h) => LocalizationManager.getHabitatName(h, fallbackLocale),
    getFishName: (f) => LocalizationManager.getFishName(f, fallbackLocale),
    getFishDescription: (f) => LocalizationManager.getFishDescription(f, fallbackLocale),
    getFishNote: (f) => LocalizationManager.getFishNote(f, fallbackLocale),
    getFishHabitat: (f) => LocalizationManager.getFishHabitat(f, fallbackLocale),
    getFishDiet: (d) => LocalizationManager.getFishDiet(d, fallbackLocale),
    getFishBehavior: (b) => LocalizationManager.getFishBehavior(b, fallbackLocale),
    getFishSchooling: (s) => LocalizationManager.getFishSchooling(s, fallbackLocale),
    getFishDepth: (d) => LocalizationManager.getFishDepth(d, fallbackLocale),
    getCreatureName: (c) => LocalizationManager.getCreatureName(c, fallbackLocale),
    getCreatureDescription: (c) => LocalizationManager.getCreatureDescription(c, fallbackLocale),
    getCreatureAbility: (c) => LocalizationManager.getCreatureAbility(c, fallbackLocale),
    getDecorationName: (d) => LocalizationManager.getDecorationName(d, fallbackLocale),
    getDecorationDescription: (d) => LocalizationManager.getDecorationDescription(d, fallbackLocale),
    getDecorationEffect: (d) => LocalizationManager.getDecorationEffect(d, fallbackLocale),
    getDecorationCategory: (c) => LocalizationManager.getDecorationCategory(c, fallbackLocale),
    getRarityLabel: (r) => LocalizationManager.getRarityLabel(r, fallbackLocale),
    getStageLabel: (s) => LocalizationManager.getStageLabel(s, fallbackLocale),
    getVariantLabel: (v) => LocalizationManager.getVariantLabel(v, fallbackLocale),
    getWaterStateLabel: (s) => LocalizationManager.getWaterStateLabel(s, fallbackLocale),
    getEncyclopediaCategoryLabel: (c) =>
      LocalizationManager.getEncyclopediaCategoryLabel(c, fallbackLocale),
  };
}
