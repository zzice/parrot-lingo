import { ModelProvider, AppSettings, CorpusItem } from '../../renderer/src/types'

export const DEFAULT_PROVIDERS: ModelProvider[] = [
  {
    id: 'parrotlingo',
    name: 'ParrotLingo AI',
    icon: 'parrot',
    badge: 'Official',
    badgeColor: '#10b981',
    description: 'ParrotLingo 官方专为英语划词、语境解析优化的原生多模型通道',
    officialUrl: 'https://parrotlingo.com',
    apiKeyDocUrl: 'https://parrotlingo.com/account/keys',
    baseUrl: 'https://api.parrotlingo.com/v1',
    apiKey: '',
    enabled: true,
    isBuiltIn: true,
    isPinned: true,
    models: []
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: 'deepseek',
    description: 'DeepSeek 官方 API 接入，支持 DeepSeek-V3 与 DeepSeek-R1 推理模型',
    officialUrl: 'https://platform.deepseek.com',
    apiKeyDocUrl: 'https://platform.deepseek.com/api_keys',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    enabled: true,
    isBuiltIn: true,
    models: []
  },
  {
    id: 'zhipu',
    name: '智谱 AI',
    icon: 'zhipu',
    description: '智谱开放平台 GLM-4 系列模型支持',
    officialUrl: 'https://open.bigmodel.cn',
    apiKeyDocUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    enabled: true,
    isBuiltIn: true,
    models: []
  }
]

export const DEFAULT_SETTINGS: AppSettings = {
  selection: {
    enabled: false,
    captureMethod: 'selection',
    compactMode: false,
    followToolbar: true,
    rememberSize: false,
    autoClose: false,
    autoPin: false,
    opacity: 100,
    shortcutKey: 'Alt+S',
    autoPronounce: false,
    autoExplain: true,
    defaultModelId: 'parrot-lingo-v1',
    targetLanguage: 'zh-CN',
    filterMode: 'blacklist',
    blacklistApps: ['ParrotLingo', 'com.parrotlingo.app'],
    whitelistApps: []
  },
  system: {
    theme: 'system',
    themeColor: '#EF4444',
    language: 'zh-CN',

    autoLaunch: false,
    startMinimized: false,
    showTrayIcon: true,
    closeToTray: true,
    proxyMode: 'system',

    customProxyUrl: '',
    proxyBypassRules: 'localhost,127.0.0.1,::1,*.local,<local>'
  },
  defaultModels: {
    globalModel: 'parrotlingo:parrot-lingo-v1',
    fastModel: 'follow',
    deepModel: 'follow',
    collocationModel: 'follow',
    readingModel: 'follow',
    autoRetry: true
  }
}

export const INITIAL_CORPUS_ITEMS: CorpusItem[] = [
  {
    id: 'corpus-1787322709626-3ycdy',
    text: 'parrot',
    canonical: 'parrot',
    phonetic: '/ˈpærət/',
    translation:
      'n. 鹦鹉；鹦鹉学舌的人；机械重复别人话的人\nv. 机械重复；鹦鹉学舌般地模仿',
    difficulty: 'A2',
    alternativeExpressions: [
      "talk like a parrot / parrot back sb.'s words（鹦鹉学舌般重复某人的话）",
      'repeat like a parrot（像鹦鹉一样重复）',
      'mindless repetition（无脑重复）',
      'copy sb. verbatim（逐字照搬某人的话）'
    ],
    tags: ['ParrotLingo'],
    notes:
      '{"targetLanguage":"zh-CN","phoneticUk":"/ˈpærət/","phoneticUs":"/ˈpærət/","posExplanations":[{"pos":"n.","meaning":"1. 鹦鹉，一种色彩鲜艳、会模仿人声的鸟。\\n2. 指只会照搬别人话、缺乏独立思考的人，常带贬义。"},{"pos":"v.","meaning":"机械重复别人的话、观点或内容；不加思考地模仿。"}],"bilingualExample":{"en":"The child kept parroting everything the teacher said.","zh":"那个孩子不停地鹦鹉学舌，把老师说的话原样重复出来。"}}',
    nativeExample: 'The child kept parroting everything the teacher said.',
    encounterCount: 2,
    sourceApp: 'ParrotLingo',
    srsStage: 0,
    srsEaseFactor: 2.5,
    srsInterval: 1,
    nextReviewAt: 1787322709626,
    reviewCount: 0,
    correctCount: 0,
    isGraduated: false,
    isArchived: false,
    createdAt: 1787322709626,
    updatedAt: 1787408613660
  }
]
