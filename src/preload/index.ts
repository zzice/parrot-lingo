import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  ModelProvider,
  AppSettings,
  CorpusItem,
  TestConnectionResult,
  CheckModelResult
} from '../renderer/src/types'
import { ExplainRequest, ExplainResponse } from '../main/services/llmService'

const api = {
  providers: {
    getAll: (): Promise<ModelProvider[]> => ipcRenderer.invoke('providers:getAll'),
    create: (provider: ModelProvider): Promise<ModelProvider> =>
      ipcRenderer.invoke('providers:create', provider),
    update: (id: string, updates: Partial<ModelProvider>): Promise<ModelProvider | null> =>
      ipcRenderer.invoke('providers:update', id, updates),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('providers:delete', id),
    reorder: (orderedIds: string[]): Promise<boolean> =>
      ipcRenderer.invoke('providers:reorder', orderedIds),
    addModel: (providerId: string, model: any): Promise<boolean> =>
      ipcRenderer.invoke('providers:addModel', providerId, model),
    deleteModel: (providerId: string, modelId: string): Promise<boolean> =>
      ipcRenderer.invoke('providers:deleteModel', providerId, modelId),
    testConnection: (providerId: string): Promise<TestConnectionResult> =>
      ipcRenderer.invoke('providers:testConnection', providerId),
    checkModel: (
      providerId: string,
      modelId?: string,
      timeout?: number
    ): Promise<CheckModelResult> =>
      ipcRenderer.invoke('providers:checkModel', providerId, modelId, timeout),
    fetchRemoteModels: (
      providerId: string
    ): Promise<{ success: boolean; message: string; count?: number }> =>
      ipcRenderer.invoke('providers:fetchRemoteModels', providerId)
  },
  corpus: {
    getAll: (): Promise<CorpusItem[]> => ipcRenderer.invoke('corpus:getAll'),
    add: (item: any): Promise<CorpusItem> => ipcRenderer.invoke('corpus:add', item),
    update: (id: string, updates: Partial<CorpusItem>): Promise<CorpusItem | null> =>
      ipcRenderer.invoke('corpus:update', id, updates),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('corpus:delete', id),
    clearAll: (): Promise<boolean> => ipcRenderer.invoke('corpus:clearAll'),
    import: (items: CorpusItem[]): Promise<number> => ipcRenderer.invoke('corpus:import', items)
  },
  encounters: {
    add: (
      input: any
    ): Promise<{ encounter: any; corpusItem: CorpusItem; isFirstEncounter: boolean }> =>
      ipcRenderer.invoke('encounters:add', input),
    undo: (id: string): Promise<boolean> => ipcRenderer.invoke('encounters:undo', id),
    getByCorpusId: (corpusItemId: string): Promise<any[]> =>
      ipcRenderer.invoke('encounters:getByCorpusId', corpusItemId)
  },
  review: {
    submit: (input: any): Promise<any> => ipcRenderer.invoke('review:submit', input)
  },
  today: {
    getQueue: (limit?: number): Promise<any[]> => ipcRenderer.invoke('today:getQueue', limit),
    getSummary: (): Promise<{
      newCount: number
      reviewCount: number
      total: number
      estimatedMinutes: number
    }> => ipcRenderer.invoke('today:getSummary')
  },

  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (updates: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:update', updates),
    reset: (): Promise<AppSettings> => ipcRenderer.invoke('settings:reset')
  },
  system: {
    checkAccessibility: (prompt = false): Promise<boolean> =>
      ipcRenderer.invoke('system:checkAccessibility', prompt),
    requestAccessibilityTrust: (): Promise<boolean> =>
      ipcRenderer.invoke('system:requestAccessibilityTrust'),
    openAccessibilitySettings: (): Promise<boolean> =>
      ipcRenderer.invoke('system:openAccessibilitySettings'),
    openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('system:openExternal', url),
    testProxy: (testUrl?: string): Promise<any> => ipcRenderer.invoke('system:testProxy', testUrl),
    openPath: (targetPath?: string): Promise<boolean> =>
      ipcRenderer.invoke('system:openPath', targetPath),
    getStorageStats: (): Promise<{
      dbPath: string
      fileSize: number
      corpusCount: number
      encountersCount: number
      reviewsCount: number
    }> => ipcRenderer.invoke('system:getStorageStats'),
    exportLogs: (): Promise<{ success: boolean; filePath?: string; error?: string }> =>
      ipcRenderer.invoke('system:exportLogs'),
    openLogDir: (): Promise<boolean> => ipcRenderer.invoke('system:openLogDir'),
    getDiagnosticSummary: (): Promise<string> => ipcRenderer.invoke('system:getDiagnosticSummary')
  },
  selection: {
    determineToolbarSize: (width: number, height: number): Promise<boolean> =>
      ipcRenderer.invoke('selection:determineToolbarSize', width, height),
    writeToClipboard: (text: string): Promise<boolean> =>
      ipcRenderer.invoke('selection:writeToClipboard', text),
    hideToolbar: (): Promise<boolean> => ipcRenderer.invoke('selection:hideToolbar'),
    togglePin: (): Promise<boolean> => ipcRenderer.invoke('selection:togglePin'),
    getPin: (): Promise<boolean> => ipcRenderer.invoke('selection:getPin'),
    setOpacity: (opacity: number): Promise<boolean> =>
      ipcRenderer.invoke('selection:setOpacity', opacity),
    getInitData: (): Promise<{
      text: string
      context?: string
      action?: string
      sourceApp?: string
    } | null> => ipcRenderer.invoke('selection:getInitData')
  },
  ai: {
    explain: (request: ExplainRequest): Promise<ExplainResponse> =>
      ipcRenderer.invoke('ai:explain', request),
    explainStream: (
      request: ExplainRequest,
      onChunk: (data: Partial<ExplainResponse>, isDone: boolean, error?: string) => void
    ): (() => void) => {
      const requestId = Math.random().toString(36).slice(2) + Date.now().toString(36)
      const channel = `ai:explainStream:${requestId}`

      const subscription = (
        _event: any,
        payload: { data?: Partial<ExplainResponse>; isDone?: boolean; error?: string }
      ) => {
        if (payload.error) {
          onChunk(payload.data || {}, true, payload.error)
          ipcRenderer.removeListener(channel, subscription)
        } else if (payload.isDone) {
          onChunk(payload.data || {}, true)
          ipcRenderer.removeListener(channel, subscription)
        } else {
          onChunk(payload.data || {}, false)
        }
      }

      ipcRenderer.on(channel, subscription)
      ipcRenderer.send('ai:explainStream:start', { ...request, requestId })

      return () => {
        ipcRenderer.removeListener(channel, subscription)
        ipcRenderer.send('ai:explainStream:abort', { requestId })
      }
    }
  },
  windowControl: {
    showSelection: (
      text: string,
      actionOrContext?: string,
      action?: string,
      sourceApp?: string
    ): Promise<boolean> =>
      ipcRenderer.invoke('window:showSelection', text, actionOrContext, action, sourceApp),
    hideSelection: (): Promise<boolean> => ipcRenderer.invoke('window:hideSelection'),
    openMain: (): Promise<boolean> => ipcRenderer.invoke('window:openMain')
  },
  updater: {
    check: (): Promise<{ available: boolean; version?: string; error?: string }> =>
      ipcRenderer.invoke('updater:check'),
    download: (): Promise<boolean> => ipcRenderer.invoke('updater:download'),
    cancel: (): Promise<boolean> => ipcRenderer.invoke('updater:cancel'),
    quitAndInstall: (): Promise<boolean> => ipcRenderer.invoke('updater:quitAndInstall'),
    getVersion: (): Promise<string> => ipcRenderer.invoke('updater:getVersion'),
    getState: (): Promise<any> => ipcRenderer.invoke('updater:getState')
  }
}

const events = {
  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('events', events)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.events = events
}
