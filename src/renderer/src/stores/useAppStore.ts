import { create } from 'zustand'
import {
  ModelProvider,
  AppSettings,
  CorpusItem,
  TodayCard,
  SubmitReviewInput,
  ThemeMode,
  AppLanguage,
  FetchRemoteModelsResult,
  AppUpdaterState
} from '../types'
import i18n, { resolveLanguage } from '../i18n'
import { applyThemeColorToDOM } from '../utils/theme'

export type NavKey = 'today' | 'corpus' | 'reading' | 'notebook' | 'settings'
export type SettingsTab =
  'general' | 'appearance' | 'model' | 'defaultModel' | 'selection' | 'privacy' | 'about'

export interface AppState {
  currentNav: NavKey
  previousNav: NavKey
  setCurrentNav: (nav: NavKey) => void

  settingsTab: SettingsTab
  setSettingsTab: (tab: SettingsTab) => void
  openSettingsView: (tab?: SettingsTab) => void
  exitSettingsView: () => void

  todayQueue: TodayCard[]
  todaySummary: {
    newCount: number
    reviewCount: number
    total: number
    estimatedMinutes: number
  } | null
  isTodayLoading: boolean
  fetchToday: () => Promise<void>
  submitReview: (input: SubmitReviewInput) => Promise<void>

  providers: ModelProvider[]
  selectedProviderId: string
  setSelectedProviderId: (id: string) => void
  fetchProviders: () => Promise<void>
  fetchRemoteModels: (providerId: string) => Promise<FetchRemoteModelsResult>
  addProvider: (provider: ModelProvider) => Promise<void>
  updateProvider: (id: string, updates: Partial<ModelProvider>) => Promise<void>
  deleteProvider: (id: string) => Promise<void>
  reorderProviders: (orderedIds: string[]) => Promise<void>
  addModel: (providerId: string, model: any) => Promise<void>
  deleteModel: (providerId: string, modelId: string) => Promise<void>
  toggleModel: (providerId: string, modelId: string, enabled: boolean) => Promise<void>
  setDefaultModel: (providerId: string, modelId: string) => Promise<void>

  corpusList: CorpusItem[]
  corpusSearch: string
  isCorpusLoading: boolean
  setCorpusSearch: (q: string) => void
  fetchCorpus: () => Promise<void>
  addCorpusItem: (
    item: Partial<CorpusItem> & { text: string; translation: string }
  ) => Promise<void>
  deleteCorpusItem: (id: string) => Promise<void>
  clearCorpus: () => Promise<void>
  importCorpus: (items: CorpusItem[]) => Promise<number>

  settings: AppSettings | null
  fetchSettings: () => Promise<void>
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>
  resetSettings: () => Promise<void>

  hasAccessibility: boolean | null
  checkAccessibility: () => Promise<boolean>
  isAccessibilityModalOpen: boolean
  setIsAccessibilityModalOpen: (open: boolean) => void

  appVersion: string
  updaterState: AppUpdaterState
  isUpdateDialogOpen: boolean
  setIsUpdateDialogOpen: (open: boolean) => void
  fetchUpdaterState: () => Promise<void>
  checkUpdate: () => Promise<{ available: boolean; version?: string; error?: string }>
  downloadUpdate: () => Promise<void>
  cancelDownloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>

  applyTheme: (theme: ThemeMode) => void
  applyThemeColor: (color: string) => void
  applyLanguage: (lang: AppLanguage) => void
  init: () => Promise<void>
}

const applyThemeToDOM = (theme: ThemeMode) => {
  const root = document.documentElement
  root.classList.remove('dark', 'light')

  let isDark = theme === 'dark'
  if (theme === 'system') {
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.add('light')
  }
}

let isStoreInitialized = false

export const useAppStore = create<AppState>((set, get) => ({
  currentNav: 'today',
  previousNav: 'today',
  setCurrentNav: (nav) => set({ currentNav: nav }),

  settingsTab: 'general',
  setSettingsTab: (tab) => set({ settingsTab: tab, currentNav: 'settings' }),
  openSettingsView: (tab) => {
    const cur = get().currentNav
    set({
      previousNav: cur === 'settings' ? get().previousNav : cur,
      currentNav: 'settings',
      settingsTab: tab || 'general'
    })
  },
  exitSettingsView: () => {
    const prev = get().previousNav || 'today'
    set({ currentNav: prev === 'settings' ? 'today' : prev })
  },

  todayQueue: [],
  todaySummary: null,
  isTodayLoading: true,
  fetchToday: async () => {
    if (!window.api?.today) {
      set({ isTodayLoading: false })
      return
    }
    try {
      const [queue, summary] = await Promise.all([
        window.api.today.getQueue(20),
        window.api.today.getSummary()
      ])
      set({ todayQueue: queue || [], todaySummary: summary || null })
    } catch {
      set({ todayQueue: [], todaySummary: null })
    } finally {
      set({ isTodayLoading: false })
    }
  },

  submitReview: async (input) => {
    if (!window.api?.review) return
    await window.api.review.submit(input)
    await Promise.all([get().fetchToday(), get().fetchCorpus()])
  },

  providers: [],

  selectedProviderId: 'parrotlingo',
  setSelectedProviderId: (id) => set({ selectedProviderId: id }),

  fetchProviders: async () => {
    if (!window.api?.providers) return
    const rawProviders = await window.api.providers.getAll()
    const providers = rawProviders
      .filter((p) => p.id !== 'custom')
      .map((p) => {
        if (p.id === 'parrotlingo') {
          return { ...p, name: 'ParrotLingo AI', isPinned: true, isBuiltIn: true }
        }
        if (p.id === 'zhipu') {
          return {
            ...p,
            name: '智谱 AI',
            isBuiltIn: true,
            badge: p.badge === 'BYOK' ? undefined : p.badge
          }
        }
        if (p.id === 'deepseek') {
          return {
            ...p,
            name: 'DeepSeek',
            isBuiltIn: true,
            badge: p.badge === 'BYOK' ? undefined : p.badge
          }
        }
        if (p.badge === 'BYOK') {
          return { ...p, badge: undefined }
        }
        return p
      })
    set({ providers })
    if (providers.length > 0 && !providers.some((p) => p.id === get().selectedProviderId)) {
      set({ selectedProviderId: providers[0].id })
    }
  },

  fetchRemoteModels: async (providerId) => {
    if (!window.api?.providers?.fetchRemoteModels) {
      return { success: false, message: '未就绪' }
    }
    const res = await window.api.providers.fetchRemoteModels(providerId)
    await get().fetchProviders()
    return res
  },

  addProvider: async (provider) => {
    if (!window.api?.providers) return
    await window.api.providers.create(provider)
    await get().fetchProviders()
    set({ selectedProviderId: provider.id })
  },

  updateProvider: async (id, updates) => {
    if (!window.api?.providers) return
    await window.api.providers.update(id, updates)
    await get().fetchProviders()
  },

  deleteProvider: async (id) => {
    if (!window.api?.providers) return
    await window.api.providers.delete(id)
    await get().fetchProviders()
    const remaining = get().providers
    if (remaining.length > 0) {
      set({ selectedProviderId: remaining[0].id })
    }
  },

  reorderProviders: async (orderedIds) => {
    if (!window.api?.providers) return
    await window.api.providers.reorder(orderedIds)
    await get().fetchProviders()
  },

  addModel: async (providerId, model) => {
    if (!window.api?.providers) return
    await window.api.providers.addModel(providerId, model)
    await get().fetchProviders()
  },

  deleteModel: async (providerId, modelId) => {
    if (!window.api?.providers) return
    await window.api.providers.deleteModel(providerId, modelId)
    await get().fetchProviders()
  },

  toggleModel: async (providerId, modelId, enabled) => {
    if (!window.api?.providers) return
    await window.api.providers.toggleModel(providerId, modelId, enabled)
    await get().fetchProviders()
  },

  setDefaultModel: async (providerId, modelId) => {
    if (!window.api?.providers) return
    await window.api.providers.setDefaultModel(providerId, modelId)
    await get().fetchProviders()
  },

  corpusList: [],
  corpusSearch: '',
  isCorpusLoading: true,
  setCorpusSearch: (q) => set({ corpusSearch: q }),

  fetchCorpus: async () => {
    if (!window.api?.corpus) return
    try {
      const list = await window.api.corpus.getAll()
      set({ corpusList: list })
    } finally {
      set({ isCorpusLoading: false })
    }
  },

  addCorpusItem: async (item) => {
    if (!window.api?.corpus) return
    await window.api.corpus.add(item)
    await get().fetchCorpus()
  },

  deleteCorpusItem: async (id) => {
    if (!window.api?.corpus) return
    await window.api.corpus.delete(id)
    await get().fetchCorpus()
  },

  clearCorpus: async () => {
    if (!window.api?.corpus) return
    await window.api.corpus.clearAll()
    await get().fetchCorpus()
    await get().fetchToday()
  },

  importCorpus: async (items) => {
    if (!window.api?.corpus) return 0
    const count = await window.api.corpus.import(items)
    await get().fetchCorpus()
    await get().fetchToday()
    return count
  },

  settings: null,
  fetchSettings: async () => {
    if (!window.api?.settings) return
    const s = await window.api.settings.get()
    set({ settings: s })
    if (s?.system?.theme) {
      applyThemeToDOM(s.system.theme)
    }
    if (s?.system?.themeColor) {
      applyThemeColorToDOM(s.system.themeColor)
    }
    if (s?.system?.language) {
      i18n.changeLanguage(resolveLanguage(s.system.language))
    }
  },

  updateSettings: async (updates) => {
    if (!window.api?.settings) return
    const s = await window.api.settings.update(updates)
    set({ settings: s })
    if (updates.system?.theme) {
      applyThemeToDOM(updates.system.theme)
    }
    if (updates.system?.themeColor) {
      applyThemeColorToDOM(updates.system.themeColor)
    }
    if (updates.system?.language) {
      i18n.changeLanguage(resolveLanguage(updates.system.language))
    }
  },

  resetSettings: async () => {
    if (!window.api?.settings) return
    const s = await window.api.settings.reset()
    set({ settings: s })
    if (s?.system?.theme) {
      applyThemeToDOM(s.system.theme)
    }
    if (s?.system?.themeColor) {
      applyThemeColorToDOM(s.system.themeColor)
    }
    if (s?.system?.language) {
      i18n.changeLanguage(resolveLanguage(s.system.language))
    }
  },

  hasAccessibility: null,
  isAccessibilityModalOpen: false,
  setIsAccessibilityModalOpen: (open) => set({ isAccessibilityModalOpen: open }),

  appVersion: '0.0.1',
  updaterState: {
    status: 'idle',
    updateInfo: null,
    progress: null,
    error: null
  },
  isUpdateDialogOpen: false,
  setIsUpdateDialogOpen: (open) => set({ isUpdateDialogOpen: open }),

  fetchUpdaterState: async () => {
    if (window.api?.updater?.getState) {
      const state = await window.api.updater.getState()
      if (state) set({ updaterState: state })
    }
  },

  checkUpdate: async () => {
    set((s) => ({ updaterState: { ...s.updaterState, status: 'checking', error: null } }))
    try {
      const res = await window.api.updater.check()
      if (res.error) {
        set((s) => ({
          updaterState: { ...s.updaterState, status: 'error', error: res.error || null }
        }))
      }
      return res
    } catch (e: any) {
      const errorMsg = e?.message || 'Check update failed'
      set((s) => ({ updaterState: { ...s.updaterState, status: 'error', error: errorMsg } }))
      return { available: false, error: errorMsg }
    }
  },

  downloadUpdate: async () => {
    set((s) => ({ updaterState: { ...s.updaterState, status: 'downloading' } }))
    try {
      await window.api.updater.download()
    } catch (e: any) {
      set((s) => ({
        updaterState: { ...s.updaterState, status: 'error', error: e?.message || 'Download failed' }
      }))
    }
  },

  cancelDownloadUpdate: async () => {
    await window.api.updater.cancel()
    set((s) => ({ updaterState: { ...s.updaterState, status: 'available', progress: null } }))
  },

  installUpdate: async () => {
    await window.api.updater.quitAndInstall()
  },

  checkAccessibility: async () => {
    if (window.api?.system) {
      try {
        const has = await window.api.system.checkAccessibility(false)
        set({ hasAccessibility: has })
        return has
      } catch {
        return false
      }
    }
    return true
  },

  applyTheme: (theme) => {
    applyThemeToDOM(theme)
  },

  applyThemeColor: (color) => {
    applyThemeColorToDOM(color)
  },

  applyLanguage: (lang) => {
    i18n.changeLanguage(resolveLanguage(lang))
  },

  init: async () => {
    if (isStoreInitialized) return
    isStoreInitialized = true

    await Promise.all([
      get().fetchProviders(),
      get().fetchCorpus(),
      get().fetchToday(),
      get().fetchSettings(),
      get().checkAccessibility(),
      get().fetchUpdaterState(),
      (async () => {
        if (window.api?.updater?.getVersion) {
          const v = await window.api.updater.getVersion()
          if (v) set({ appVersion: v })
        }
      })()
    ])

    // 监听系统主题变化
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const currentTheme = get().settings?.system?.theme || 'dark'
        if (currentTheme === 'system') {
          applyThemeToDOM('system')
        }
      })
    }

    // 注册全局 IPC 事件监听器 (单例绑定)
    if (window.events) {
      window.events.on('system:accessibility-lost', () => {
        set({ hasAccessibility: false })
      })
      window.events.on('system:accessibility-granted', () => {
        set({ hasAccessibility: true })
      })

      window.events.on('providers:changed', (rawProviders) => {
        const providers = (rawProviders || [])
          .filter((p: any) => p.id !== 'custom')
          .map((p: any) => {
            if (p.id === 'parrotlingo') {
              return { ...p, name: 'ParrotLingo AI', isPinned: true, isBuiltIn: true }
            }
            if (p.id === 'zhipu') {
              return {
                ...p,
                name: '智谱 AI',
                isBuiltIn: true,
                badge: p.badge === 'BYOK' ? undefined : p.badge
              }
            }
            if (p.id === 'deepseek') {
              return {
                ...p,
                name: 'DeepSeek',
                isBuiltIn: true,
                badge: p.badge === 'BYOK' ? undefined : p.badge
              }
            }
            if (p.badge === 'BYOK') {
              return { ...p, badge: undefined }
            }
            return p
          })
        set({ providers })
      })
      window.events.on('corpus:updated', (corpusList) => {
        if (corpusList) set({ corpusList })
        get().fetchToday()
      })
      window.events.on('today:updated', () => {
        get().fetchToday()
      })
      window.events.on('nav:navigate', (navKey) => {
        if (navKey) {
          set({ currentNav: navKey as NavKey })
        }
      })
      window.events.on('settings:changed', (newSettings) => {
        const current = get().settings
        if (current && JSON.stringify(current) === JSON.stringify(newSettings)) {
          return
        }
        set({ settings: newSettings })
        if (newSettings?.system?.theme) {
          applyThemeToDOM(newSettings.system.theme)
        }
        if (newSettings?.system?.themeColor) {
          applyThemeColorToDOM(newSettings.system.themeColor)
        }
        if (newSettings?.system?.language) {
          i18n.changeLanguage(resolveLanguage(newSettings.system.language))
        }
      })

      // 全局应用更新事件监听（任何页面均可接收并响应）
      window.events.on('updater:checking', () => {
        set((s) => ({ updaterState: { ...s.updaterState, status: 'checking', error: null } }))
      })
      window.events.on('updater:available', (info) => {
        set({
          updaterState: { status: 'available', updateInfo: info, progress: null, error: null },
          isUpdateDialogOpen: true
        })
      })
      window.events.on('updater:notAvailable', () => {
        set({
          updaterState: { status: 'not-available', updateInfo: null, progress: null, error: null }
        })
      })
      window.events.on('updater:downloadProgress', (progress) => {
        set((s) => ({
          updaterState: { ...s.updaterState, status: 'downloading', progress }
        }))
      })
      window.events.on('updater:downloaded', (info) => {
        set({
          updaterState: { status: 'downloaded', updateInfo: info, progress: null, error: null },
          isUpdateDialogOpen: true
        })
      })
      window.events.on('updater:error', (err) => {
        set((s) => ({
          updaterState: {
            ...s.updaterState,
            status: 'error',
            error: err?.message || 'Update error'
          }
        }))
      })
      window.events.on('updater:cancelled', () => {
        set((s) => ({
          updaterState: { ...s.updaterState, status: 'available', progress: null }
        }))
      })
    }
  }
}))
