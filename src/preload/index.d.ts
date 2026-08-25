import { ElectronAPI } from '@electron-toolkit/preload'
import {
  ModelProvider,
  AppSettings,
  CorpusItem,
  EncounterItem,
  ReviewLog,
  TodayCard,
  AddEncounterInput,
  SubmitReviewInput,
  TestConnectionResult,
  CheckModelResult,
  TestProxyResult,
  FetchRemoteModelsResult,
  AppUpdaterState
} from '../renderer/src/types'
import { ExplainRequest, ExplainResponse } from '../main/services/llmService'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      providers: {
        getAll: () => Promise<ModelProvider[]>
        create: (provider: ModelProvider) => Promise<ModelProvider>
        update: (id: string, updates: Partial<ModelProvider>) => Promise<ModelProvider | null>
        delete: (id: string) => Promise<boolean>
        reorder: (orderedIds: string[]) => Promise<boolean>
        addModel: (providerId: string, model: any) => Promise<boolean>
        deleteModel: (providerId: string, modelId: string) => Promise<boolean>
        toggleModel: (providerId: string, modelId: string, enabled: boolean) => Promise<boolean>
        setDefaultModel: (providerId: string, modelId: string) => Promise<boolean>
        testConnection: (providerId: string) => Promise<TestConnectionResult>
        checkModel: (
          providerId: string,
          modelId?: string,
          timeout?: number
        ) => Promise<CheckModelResult>
        fetchRemoteModels: (providerId: string) => Promise<FetchRemoteModelsResult>
      }
      corpus: {
        getAll: () => Promise<CorpusItem[]>
        add: (
          item: Partial<CorpusItem> & { text: string; translation: string }
        ) => Promise<CorpusItem>
        update: (id: string, updates: Partial<CorpusItem>) => Promise<CorpusItem | null>
        delete: (id: string) => Promise<boolean>
        clearAll: () => Promise<boolean>
        import: (items: CorpusItem[]) => Promise<number>
      }
      encounters: {
        add: (input: AddEncounterInput) => Promise<{
          encounter: EncounterItem
          corpusItem: CorpusItem
          isFirstEncounter: boolean
        }>
        undo: (id: string) => Promise<boolean>
        getByCorpusId: (corpusItemId: string) => Promise<EncounterItem[]>
      }
      review: {
        submit: (input: SubmitReviewInput) => Promise<ReviewLog>
      }
      today: {
        getQueue: (limit?: number) => Promise<TodayCard[]>
        getSummary: () => Promise<{
          newCount: number
          reviewCount: number
          total: number
          estimatedMinutes: number
        }>
      }

      settings: {
        get: () => Promise<AppSettings>
        update: (updates: Partial<AppSettings>) => Promise<AppSettings>
        reset: () => Promise<AppSettings>
      }
      system: {
        checkAccessibility: (prompt?: boolean) => Promise<boolean>
        requestAccessibilityTrust: () => Promise<boolean>
        openAccessibilitySettings: () => Promise<boolean>
        openExternal: (url: string) => Promise<boolean>
        testProxy: (testUrl?: string) => Promise<TestProxyResult>
        openPath: (targetPath?: string) => Promise<boolean>
        getStorageStats: () => Promise<{
          dbPath: string
          fileSize: number
          corpusCount: number
          encountersCount: number
          reviewsCount: number
        }>
        exportLogs: () => Promise<{ success: boolean; filePath?: string; error?: string }>
        openLogDir: () => Promise<boolean>
        getDiagnosticSummary: () => Promise<string>
      }
      selection: {
        determineToolbarSize: (width: number, height: number) => Promise<boolean>
        writeToClipboard: (text: string) => Promise<boolean>
        hideToolbar: () => Promise<boolean>
        togglePin: () => Promise<boolean>
        getPin: () => Promise<boolean>
        setOpacity: (opacity: number) => Promise<boolean>
        getInitData: () => Promise<{
          text: string
          context?: string
          action?: string
          sourceApp?: string
        } | null>
      }
      ai: {
        explain: (request: ExplainRequest) => Promise<ExplainResponse>
        explainStream: (
          request: ExplainRequest,
          onChunk: (data: Partial<ExplainResponse>, isDone: boolean, error?: string) => void
        ) => () => void
      }
      windowControl: {
        showSelection: (
          text: string,
          actionOrContext?: string,
          action?: string,
          sourceApp?: string
        ) => Promise<boolean>
        hideSelection: () => Promise<boolean>
        openMain: () => Promise<boolean>
      }
      updater: {
        check: () => Promise<{ available: boolean; version?: string; error?: string }>
        download: () => Promise<boolean>
        cancel: () => Promise<boolean>
        quitAndInstall: () => Promise<boolean>
        getVersion: () => Promise<string>
        getState: () => Promise<AppUpdaterState>
      }
    }
    events: {
      on: (channel: string, callback: (...args: any[]) => void) => () => void
      off: (channel: string, callback: (...args: any[]) => void) => void
    }
  }
}
