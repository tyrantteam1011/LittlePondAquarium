import { FISH_CATALOG } from '../data/fishCatalog';
import { DECORATION_CATALOG } from '../data/decorationCatalog';
import { CREATURE_CATALOG } from '../data/creatureCatalog';
import { HABITAT_CATALOG } from '../data/habitatCatalog';
import { LOCALIZATION_TABLE } from './localizationData';
import { FISH_LOCALIZATION_TABLE } from './fishLocalizationData';
import { DECOR_LOCALIZATION_TABLE } from './decorLocalizationData';
import { LocaleId, SUPPORTED_LANGUAGES } from './types';

export interface LocalizationIssue {
  severity: 'error' | 'warning';
  code:
    | 'MISSING_KEY'
    | 'MISSING_TRANSLATION'
    | 'EMPTY_TRANSLATION'
    | 'DUPLICATE_KEY'
    | 'INVALID_KEY'
    | 'PLACEHOLDER_MISMATCH'
    | 'UNTRANSLATED';
  entityType: 'fish' | 'decor' | 'creature' | 'habitat' | 'table';
  entityId: string;
  key: string;
  locale?: LocaleId;
  message: string;
}

export interface LanguageAuditSummary {
  locale: LocaleId;
  fishChecked: number;
  fishPassed: number;
  decorChecked: number;
  decorPassed: number;
  creatureChecked: number;
  creaturePassed: number;
  missingKeys: number;
  missingTranslations: number;
  emptyTranslations: number;
  status: 'PASS' | 'FAIL';
}

export interface LocalizationAuditReport {
  totalFish: number;
  totalDecor: number;
  totalCreatures: number;
  totalHabitats: number;
  totalLanguages: number;
  totalKeysChecked: number;
  missingKeyCount: number;
  missingTranslationCount: number;
  emptyTranslationCount: number;
  duplicateKeyCount: number;
  invalidKeyCount: number;
  placeholderMismatchCount: number;
  untranslatedWarningCount: number;
  byLanguage: LanguageAuditSummary[];
  issues: LocalizationIssue[];
  passed: boolean;
}

const ALL_LOCALES: LocaleId[] = SUPPORTED_LANGUAGES.map((l) => l.id);
const PLACEHOLDER_REGEX = /\{[a-zA-Z0-9_]+\}/g;
const VALID_KEY_REGEX = /^[a-zA-Z0-9._ &/-]+$/;

function extractPlaceholders(text: string): string[] {
  const matches = text.match(PLACEHOLDER_REGEX);
  return matches ? Array.from(new Set(matches)).sort() : [];
}

/**
 * Automated Localization Validator
 * Scans all 46 Fish, 36 Decorations, 28 Creatures, 20 Habitats, and all 6 Languages
 * for missing keys, missing/empty translations, duplicates, invalid keys, and placeholder mismatches.
 */
export function validateAllLocalizations(): LocalizationAuditReport {
  const issues: LocalizationIssue[] = [];
  const checkedKeys = new Set<string>();

  // 1. Duplicate key detection across modular tables
  const fishKeys = new Set(Object.keys(FISH_LOCALIZATION_TABLE));
  for (const key of Object.keys(DECOR_LOCALIZATION_TABLE)) {
    if (fishKeys.has(key)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_KEY',
        entityType: 'table',
        entityId: 'DECOR_LOCALIZATION_TABLE',
        key,
        message: `Duplicate localization key "${key}" found in both FISH_LOCALIZATION_TABLE and DECOR_LOCALIZATION_TABLE.`,
      });
    }
  }

  // Helper to verify a required key across all 6 locales
  const verifyKey = (
    entityType: LocalizationIssue['entityType'],
    entityId: string,
    key: string,
    checkUntranslated: boolean
  ): Record<LocaleId, boolean> => {
    const localePass: Record<LocaleId, boolean> = {
      'vi-VN': true,
      'en-US': true,
      'de-DE': true,
      'pt-PT': true,
      'ms-MY': true,
      'zh-CN': true,
    };

    if (!key || !VALID_KEY_REGEX.test(key)) {
      issues.push({
        severity: 'error',
        code: 'INVALID_KEY',
        entityType,
        entityId,
        key: String(key),
        message: `Invalid localization key "${key}" on ${entityType}:${entityId}`,
      });
      for (const loc of ALL_LOCALES) localePass[loc] = false;
      return localePass;
    }

    checkedKeys.add(key);
    const entry = LOCALIZATION_TABLE[key];
    if (!entry) {
      issues.push({
        severity: 'error',
        code: 'MISSING_KEY',
        entityType,
        entityId,
        key,
        message: `Missing key "${key}" in LOCALIZATION_TABLE for ${entityType}:${entityId}`,
      });
      for (const loc of ALL_LOCALES) localePass[loc] = false;
      return localePass;
    }

    const enVal = entry['en-US'] ?? '';
    const enPlaceholders = extractPlaceholders(enVal);

    for (const locale of ALL_LOCALES) {
      const val = entry[locale];
      if (val === undefined || val === null) {
        localePass[locale] = false;
        issues.push({
          severity: 'error',
          code: 'MISSING_TRANSLATION',
          entityType,
          entityId,
          key,
          locale,
          message: `Missing ${locale} translation for key "${key}"`,
        });
        continue;
      }

      if (typeof val !== 'string' || val.trim().length === 0) {
        localePass[locale] = false;
        issues.push({
          severity: 'error',
          code: 'EMPTY_TRANSLATION',
          entityType,
          entityId,
          key,
          locale,
          message: `Empty ${locale} translation for key "${key}"`,
        });
        continue;
      }

      // Check placeholder consistency against en-US
      const locPlaceholders = extractPlaceholders(val);
      if (enPlaceholders.join(',') !== locPlaceholders.join(',')) {
        localePass[locale] = false;
        issues.push({
          severity: 'error',
          code: 'PLACEHOLDER_MISMATCH',
          entityType,
          entityId,
          key,
          locale,
          message: `Placeholder mismatch in ${locale} for "${key}": expected [${enPlaceholders.join(', ')}] got [${locPlaceholders.join(', ')}]`,
        });
      }

      // Detect accidental copy-pasted English descriptions/notes
      if (checkUntranslated && locale !== 'en-US' && val.trim() === enVal.trim() && enVal.length > 20) {
        issues.push({
          severity: 'warning',
          code: 'UNTRANSLATED',
          entityType,
          entityId,
          key,
          locale,
          message: `Potentially untranslated ${locale} text identical to en-US for "${key}"`,
        });
      }
    }

    return localePass;
  };

  const langMap: Record<LocaleId, LanguageAuditSummary> = {} as Record<
    LocaleId,
    LanguageAuditSummary
  >;
  for (const locale of ALL_LOCALES) {
    langMap[locale] = {
      locale,
      fishChecked: FISH_CATALOG.length,
      fishPassed: 0,
      decorChecked: DECORATION_CATALOG.length,
      decorPassed: 0,
      creatureChecked: CREATURE_CATALOG.length,
      creaturePassed: 0,
      missingKeys: 0,
      missingTranslations: 0,
      emptyTranslations: 0,
      status: 'PASS',
    };
  }

  // 2. Validate ALL 46 Fish
  for (const fish of FISH_CATALOG) {
    const rName = verifyKey('fish', fish.id, fish.nameKey, false);
    const rDesc = verifyKey('fish', fish.id, fish.descriptionKey, true);
    const rNote = verifyKey('fish', fish.id, fish.noteKey, true);
    const rHab = verifyKey('fish', fish.id, fish.habitatKey, false);
    const rDiet = verifyKey('fish', fish.id, fish.dietKey, false);
    const rBeh = verifyKey('fish', fish.id, fish.behaviorKey, false);
    const rSchool = verifyKey('fish', fish.id, `schooling.${fish.schoolingBehavior}`, false);
    const rDepth = verifyKey('fish', fish.id, `depth.${fish.preferredDepth}`, false);

    for (const locale of ALL_LOCALES) {
      if (
        rName[locale] &&
        rDesc[locale] &&
        rNote[locale] &&
        rHab[locale] &&
        rDiet[locale] &&
        rBeh[locale] &&
        rSchool[locale] &&
        rDepth[locale]
      ) {
        langMap[locale].fishPassed += 1;
      }
    }
  }

  // 3. Validate ALL 36 Decorations
  for (const decor of DECORATION_CATALOG) {
    const rName = verifyKey('decor', decor.id, decor.nameKey, false);
    const rDesc = verifyKey('decor', decor.id, decor.descriptionKey, true);
    const rEff = verifyKey('decor', decor.id, decor.effectDescriptionKey, false);
    const rCat = verifyKey('decor', decor.id, decor.categoryKey, false);

    for (const locale of ALL_LOCALES) {
      if (rName[locale] && rDesc[locale] && rEff[locale] && rCat[locale]) {
        langMap[locale].decorPassed += 1;
      }
    }
  }

  // 4. Validate ALL 28 Creatures
  for (const creature of CREATURE_CATALOG) {
    const rName = verifyKey('creature', creature.id, creature.nameKey, false);
    const rDesc = verifyKey('creature', creature.id, creature.descriptionKey, true);
    const rAbil = verifyKey('creature', creature.id, creature.abilityKey, true);
    const rHab = verifyKey('creature', creature.id, creature.habitatKey, false);

    for (const locale of ALL_LOCALES) {
      if (rName[locale] && rDesc[locale] && rAbil[locale] && rHab[locale]) {
        langMap[locale].creaturePassed += 1;
      }
    }
  }

  // 5. Validate ALL 20 Habitats
  for (const habitat of HABITAT_CATALOG) {
    verifyKey('habitat', habitat.id, `MAP_${habitat.id}`, false);
  }

  // Tally per-language errors
  for (const issue of issues) {
    if (issue.severity !== 'error') continue;
    if (issue.locale) {
      const s = langMap[issue.locale];
      if (issue.code === 'MISSING_TRANSLATION') s.missingTranslations += 1;
      if (issue.code === 'EMPTY_TRANSLATION') s.emptyTranslations += 1;
      s.status = 'FAIL';
    } else if (issue.code === 'MISSING_KEY' || issue.code === 'INVALID_KEY') {
      for (const locale of ALL_LOCALES) {
        langMap[locale].missingKeys += 1;
        langMap[locale].status = 'FAIL';
      }
    }
  }

  const missingKeyCount = issues.filter((i) => i.code === 'MISSING_KEY').length;
  const missingTranslationCount = issues.filter((i) => i.code === 'MISSING_TRANSLATION').length;
  const emptyTranslationCount = issues.filter((i) => i.code === 'EMPTY_TRANSLATION').length;
  const duplicateKeyCount = issues.filter((i) => i.code === 'DUPLICATE_KEY').length;
  const invalidKeyCount = issues.filter((i) => i.code === 'INVALID_KEY').length;
  const placeholderMismatchCount = issues.filter((i) => i.code === 'PLACEHOLDER_MISMATCH').length;
  const untranslatedWarningCount = issues.filter((i) => i.code === 'UNTRANSLATED').length;
  const errorCount = issues.filter((i) => i.severity === 'error').length;

  return {
    totalFish: FISH_CATALOG.length,
    totalDecor: DECORATION_CATALOG.length,
    totalCreatures: CREATURE_CATALOG.length,
    totalHabitats: HABITAT_CATALOG.length,
    totalLanguages: ALL_LOCALES.length,
    totalKeysChecked: checkedKeys.size,
    missingKeyCount,
    missingTranslationCount,
    emptyTranslationCount,
    duplicateKeyCount,
    invalidKeyCount,
    placeholderMismatchCount,
    untranslatedWarningCount,
    byLanguage: ALL_LOCALES.map((loc) => langMap[loc]),
    issues,
    passed: errorCount === 0,
  };
}

export function formatLocalizationAuditReport(report: LocalizationAuditReport): string {
  const lines: string[] = [
    '[Localization Audit]',
    `Total Fish: ${report.totalFish}`,
    `Total Decor: ${report.totalDecor}`,
    `Total Creatures: ${report.totalCreatures}`,
    `Total Languages: ${report.totalLanguages}`,
    `Total Keys Checked: ${report.totalKeysChecked}`,
    `Missing Keys: ${report.missingKeyCount}`,
    `Missing Translations: ${report.missingTranslationCount}`,
    `Empty Translations: ${report.emptyTranslationCount}`,
    `Duplicate Keys: ${report.duplicateKeyCount}`,
    `Invalid Keys: ${report.invalidKeyCount}`,
    `Placeholder Mismatches: ${report.placeholderMismatchCount}`,
    `Untranslated Warnings: ${report.untranslatedWarningCount}`,
    '--- Per Language ---',
  ];

  for (const lang of report.byLanguage) {
    lines.push(
      `${lang.locale}: ${lang.status} (Fish ${lang.fishPassed}/${lang.fishChecked}, Decor ${lang.decorPassed}/${lang.decorChecked}, Creatures ${lang.creaturePassed}/${lang.creatureChecked})`
    );
  }

  lines.push(`Overall Status: ${report.passed ? 'PASS' : 'FAIL'}`);
  return lines.join('\n');
}
