import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import zhCN from './locales/zh-CN'
import zhTW from './locales/zh-TW'
import enUS from './locales/en-US'
import jaJP from './locales/ja-JP'
import koKR from './locales/ko-KR'

export const SUPPORTED_LANGUAGES = [
  { id: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { id: 'zh-TW', label: '繁體中文', flag: '🇭🇰' },
  { id: 'en-US', label: 'English', flag: '🇺🇸' },
  { id: 'ja-JP', label: '日本語', flag: '🇯🇵' },
  { id: 'ko-KR', label: '한국어', flag: '🇰🇷' }
] as const

const resources = {
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  'en-US': { translation: enUS },
  'ja-JP': { translation: jaJP },
  'ko-KR': { translation: koKR }
}

export function resolveLanguage(lang?: string): string {
  if (!lang || lang === 'system') {
    const sys = typeof navigator !== 'undefined' ? navigator.language : 'zh-CN'
    if (sys.startsWith('zh-TW') || sys.startsWith('zh-HK')) return 'zh-TW'
    if (sys.startsWith('zh')) return 'zh-CN'
    if (sys.startsWith('ja')) return 'ja-JP'
    if (sys.startsWith('ko')) return 'ko-KR'
    if (sys.startsWith('en')) return 'en-US'
    return 'zh-CN'
  }
  return lang
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh-CN',
  fallbackLng: 'zh-CN',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
