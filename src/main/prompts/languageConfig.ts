/**
 * ParrotLingo Target Language Configuration for AI Prompts
 */

export interface TargetLanguageSpec {
  code: string
  name: string
  nativeName: string
  instruction: string
  exampleLanguageName: string
}

export const TARGET_LANGUAGE_MAP: Record<string, TargetLanguageSpec> = {
  'zh-CN': {
    code: 'zh-CN',
    name: 'Simplified Chinese (简体中文)',
    nativeName: '简体中文',
    instruction:
      'All definitions in posExplanations, contextMeaning, and bilingualExample.target (or zh) MUST be in natural, accurate Simplified Chinese. Do not mix other languages unless giving English examples/idioms.',
    exampleLanguageName: 'Simplified Chinese'
  },
  'zh-TW': {
    code: 'zh-TW',
    name: 'Traditional Chinese (繁體中文 - 台灣/香港慣用語)',
    nativeName: '繁體中文',
    instruction:
      'All definitions in posExplanations, contextMeaning, and bilingualExample.target (or zh) MUST be in natural, accurate Traditional Chinese matching Taiwan/Hong Kong lexical conventions.',
    exampleLanguageName: 'Traditional Chinese'
  },
  'en-US': {
    code: 'en-US',
    name: 'English (Monolingual / Advanced English Learner)',
    nativeName: 'English',
    instruction:
      'Output definitions in clear, elegant English (English-to-English dictionary style). In posExplanations, provide concise English definitions and key synonyms. In bilingualExample.target, provide a natural paraphrase or contextual explanation in English.',
    exampleLanguageName: 'English'
  },
  'ja-JP': {
    code: 'ja-JP',
    name: 'Japanese (日本語)',
    nativeName: '日本語',
    instruction:
      'All definitions in posExplanations, contextMeaning, and bilingualExample.target (or zh) MUST be in natural, polite Japanese (日本語/丁寧語). Provide accurate Japanese POS (品詞: 名詞, 動詞, 形容詞 etc.) and natural Japanese translations.',
    exampleLanguageName: 'Japanese'
  },
  'ko-KR': {
    code: 'ko-KR',
    name: 'Korean (한국어)',
    nativeName: '한국어',
    instruction:
      'All definitions in posExplanations, contextMeaning, and bilingualExample.target (or zh) MUST be in natural, polite Korean (한국어). Provide accurate Korean POS (품사: 명사, 동사, 형용사 etc.) and natural Korean translations.',
    exampleLanguageName: 'Korean'
  }
}

export function getTargetLanguageSpec(lang?: string): TargetLanguageSpec {
  if (!lang) return TARGET_LANGUAGE_MAP['zh-CN']
  const clean = lang.trim()
  if (TARGET_LANGUAGE_MAP[clean]) {
    return TARGET_LANGUAGE_MAP[clean]
  }
  // Loose matching
  if (clean.startsWith('zh-TW') || clean.startsWith('zh-HK') || clean.startsWith('zh-Hant')) {
    return TARGET_LANGUAGE_MAP['zh-TW']
  }
  if (clean.startsWith('zh')) {
    return TARGET_LANGUAGE_MAP['zh-CN']
  }
  if (clean.startsWith('ja')) {
    return TARGET_LANGUAGE_MAP['ja-JP']
  }
  if (clean.startsWith('ko')) {
    return TARGET_LANGUAGE_MAP['ko-KR']
  }
  if (clean.startsWith('en')) {
    return TARGET_LANGUAGE_MAP['en-US']
  }
  return TARGET_LANGUAGE_MAP['zh-CN']
}
