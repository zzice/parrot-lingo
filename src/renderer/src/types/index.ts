export type ThemeMode = 'system' | 'dark' | 'light'

export type ApiProtocolType = 'openai' | 'anthropic' | 'openai-responses'

export interface ModelItem {
  id: string
  name: string
  providerId: string
  enabled: boolean
  isDefault?: boolean
  description?: string
  contextLength?: number
}

export interface ModelProvider {
  id: string
  name: string
  icon?: string
  badge?: string
  badgeColor?: string
  description?: string
  officialUrl?: string
  apiKeyDocUrl?: string
  baseUrl: string
  apiKey: string
  apiType?: ApiProtocolType
  enabled: boolean
  isBuiltIn?: boolean
  isPinned?: boolean
  isCustom?: boolean
  models: ModelItem[]
}

export interface CorpusItem {
  id: string
  text: string
  canonical: string
  phonetic?: string
  partOfSpeech?: string
  translation: string
  explanation?: string
  difficulty?: string
  domain?: string
  alternativeExpressions: string[]
  nativeExample?: string
  tags: string[]
  notes?: string
  encounterCount: number
  sourceApp?: string
  bestContextId?: string
  srsStage: number
  srsEaseFactor: number
  srsInterval: number
  nextReviewAt?: number
  lastReviewedAt?: number
  reviewCount: number
  correctCount: number
  isGraduated: boolean
  graduatedAt?: number
  isArchived: boolean
  createdAt: number
  updatedAt: number
}

export interface EncounterItem {
  id: string
  corpusItemId: string
  rawText: string
  actionType: 'translate' | 'explain'
  context?: string
  contextBefore?: string
  contextAfter?: string
  sourceApp?: string
  sourceUrl?: string
  sourceTitle?: string
  isUndone: boolean
  seenAt: number
}

export interface ReviewLog {
  id: string
  corpusItemId: string
  reviewFormat: 'recognize' | 'cloze' | 'recall'
  encounterId?: string
  rating: 1 | 2 | 3
  stageBefore: number
  stageAfter: number
  intervalBefore: number
  intervalAfter: number
  nextReviewAt: number
  reviewedAt: number
}

export type TodayCardType = 'new' | 'review'

export interface TodayCard {
  id: string
  corpusItem: CorpusItem
  encounter?: EncounterItem
  reviewFormat: 'recognize' | 'cloze' | 'recall'
  cardType: TodayCardType
}

export interface AddEncounterInput {
  text: string
  canonical?: string
  phonetic?: string
  phoneticUk?: string
  phoneticUs?: string
  partOfSpeech?: string
  posExplanations?: PosExplanation[]
  contextMeaning?: string
  translation: string
  explanation?: string
  difficulty?: string
  domain?: string
  alternativeExpressions?: string[]
  nativeExample?: string
  bilingualExample?: BilingualExample
  tags?: string[]
  context?: string
  contextBefore?: string
  contextAfter?: string
  sourceApp?: string
  sourceUrl?: string
  sourceTitle?: string
  actionType?: 'translate' | 'explain'
  targetLanguage?: string
}

export interface SubmitReviewInput {
  corpusItemId: string
  reviewFormat: 'recognize' | 'cloze' | 'recall'
  encounterId?: string
  rating: 1 | 2 | 3
  stageBefore: number
}

export interface SelectionConfig {
  enabled: boolean
  captureMethod: 'selection' | 'shortcut'
  compactMode: boolean
  followToolbar: boolean
  rememberSize: boolean
  autoClose: boolean
  autoPin: boolean
  opacity: number
  shortcutKey: string
  autoPronounce: boolean
  autoExplain: boolean
  defaultModelId: string
  targetLanguage: string
  filterMode: 'off' | 'whitelist' | 'blacklist'
  blacklistApps: string[]
  whitelistApps: string[]
}

export type AppLanguage = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP' | 'ko-KR' | 'system'

export interface SystemConfig {
  theme: ThemeMode
  themeColor?: string
  language: AppLanguage
  // 启动配置
  autoLaunch: boolean
  startMinimized: boolean
  showTrayIcon: boolean
  closeToTray: boolean
  // 代理模式配置

  proxyMode: 'system' | 'direct' | 'custom'
  customProxyUrl?: string
  proxyBypassRules?: string
  // 数据库路径
  dbPath?: string
}

export interface TestProxyResult {
  success: boolean
  message: string
  latency?: number
}

export interface DefaultModelSettings {
  globalModel: string // 格式: "providerId:modelId" 或 "modelId"
  fastModel: string // "follow" 或 "providerId:modelId"
  deepModel: string // "follow" 或 "providerId:modelId"
  collocationModel: string // "follow" 或 "providerId:modelId"
  readingModel: string // "follow" 或 "providerId:modelId"
  autoRetry?: boolean // 失败自动重试 (可选)
}

export interface AppSettings {
  selection: SelectionConfig
  system: SystemConfig
  defaultModels?: DefaultModelSettings
}

export interface TestConnectionResult {
  success: boolean
  message: string
  latency?: number
  modelsCount?: number
}

export interface CheckModelResult {
  success: boolean
  message: string
  latency?: number
}

export interface CheckModelRequest {
  providerId: string
  modelId?: string
  timeout?: number
}

export interface RemoteModelItem {
  id: string
  name?: string
  description?: string
}

export interface FetchRemoteModelsResult {
  success: boolean
  message: string
  models?: RemoteModelItem[]
}

export interface ExplainRequest {
  text: string
  context?: string
  task?: 'translate' | 'explain' | 'deep' | 'collocation' | 'reading'
  providerId?: string
  modelId?: string
  targetLanguage?: string
  force?: boolean // 强制跳过本地数据库缓存，重新向模型请求
}

export interface PosExplanation {
  pos: string // e.g. "n.", "v.", "adj."
  meaning: string // e.g. "窗，窗口；时机"
}

export interface BilingualExample {
  source?: string
  target?: string
  en?: string
  zh?: string
}

export interface ExplainResponse {
  text: string
  translation: string
  detectedLanguage?: string
  phonetic?: string
  phoneticUk?: string
  phoneticUs?: string
  partOfSpeech?: string
  posExplanations?: PosExplanation[]
  contextMeaning?: string
  explanation?: string
  contextExample?: string
  bilingualExample?: BilingualExample
  alternativeExpressions?: string[]
  tags?: string[]
  difficulty?: string
  targetLanguage?: string
  providerName?: string
  modelName?: string
  error?: string
}

export interface AppUpdateMetadata {
  version: string
  releaseDate?: string
  releaseNotes?: string
  files?: Array<{ url: string; size?: number }>
}

export interface AppUpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export type UpdateStatus =
  'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

export interface AppUpdaterState {
  status: UpdateStatus
  updateInfo: AppUpdateMetadata | null
  progress: AppUpdateProgress | null
  error: string | null
}
