/**
 * Localization Core Types & Supported Locale Definitions
 * Stable Locale IDs: vi-VN, en-US, de-DE, pt-PT, ms-MY, zh-CN
 */

export type LocaleId = 'vi-VN' | 'en-US' | 'de-DE' | 'pt-PT' | 'ms-MY' | 'zh-CN';

export interface LanguageOption {
  id: LocaleId;
  nativeName: string;
  shortCode: string;
  flag: string;
  htmlLang: string;
  englishName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    id: 'vi-VN',
    nativeName: 'Tiếng Việt',
    shortCode: 'VN',
    flag: '🇻🇳',
    htmlLang: 'vi-VN',
    englishName: 'Vietnamese',
  },
  {
    id: 'en-US',
    nativeName: 'English',
    shortCode: 'EN',
    flag: '🇬🇧',
    htmlLang: 'en-US',
    englishName: 'English',
  },
  {
    id: 'de-DE',
    nativeName: 'Deutsch',
    shortCode: 'DE',
    flag: '🇩🇪',
    htmlLang: 'de-DE',
    englishName: 'German',
  },
  {
    id: 'pt-PT',
    nativeName: 'Português',
    shortCode: 'PT',
    flag: '🇵🇹',
    htmlLang: 'pt-PT',
    englishName: 'Portuguese (Portugal)',
  },
  {
    id: 'ms-MY',
    nativeName: 'Bahasa Melayu',
    shortCode: 'MY',
    flag: '🇲🇾',
    htmlLang: 'ms-MY',
    englishName: 'Malay',
  },
  {
    id: 'zh-CN',
    nativeName: '简体中文',
    shortCode: 'ZH',
    flag: '🇨🇳',
    htmlLang: 'zh-CN',
    englishName: 'Simplified Chinese',
  },
];

export type TranslationEntry = Record<LocaleId, string>;
export type TranslationParams = Record<string, string | number>;
