import { ipcMain, BrowserWindow, systemPreferences, shell } from 'electron'
import { existsSync, statSync } from 'fs'
import { ProviderRepository } from '../db/repositories/providerRepository'
import { CorpusRepository } from '../db/repositories/corpusRepository'
import { EncounterRepository } from '../db/repositories/encounterRepository'
import { ReviewRepository } from '../db/repositories/reviewRepository'
import { TodayRepository } from '../db/repositories/todayRepository'
import { SettingsRepository } from '../db/repositories/settingsRepository'
import { sqliteManager, sqliteDb } from '../db/sqliteDatabase'
import { LLMService, ExplainRequest } from '../services/llmService'
import { ShortcutService } from '../services/shortcutService'
import { eventBus, EVENT_NAMES } from '../events/eventBus'
import {
  showSelectionWindowWithText,
  hideSelectionWindow,
  toggleSelectionWindowPin,
  setSelectionWindowOpacity,
  getSelectionWindowPin,
  getSelectionWindowInitData
} from '../windows/selectionWindow'
import { hideToolbarWindow, resizeToolbarWindow } from '../windows/toolbarWindow'
import { SelectionService } from '../services/selectionService'
import { AppService } from '../services/appService'
import { TrayService } from '../services/trayService'
import { ProxyService } from '../services/proxyService'
import { AppUpdaterService } from '../services/appUpdaterService'
import { createMainWindow } from '../windows/mainWindow'
import {
  ModelProvider,
  AppSettings,
  CorpusItem,
  AddEncounterInput,
  SubmitReviewInput
} from '../../renderer/src/types'

export function registerIpcHandlers() {
  // --- Providers 模块 ---
  ipcMain.handle('providers:getAll', async () => {
    return ProviderRepository.getAll()
  })

  ipcMain.handle('providers:create', async (_, provider: ModelProvider) => {
    const created = ProviderRepository.create(provider)
    eventBus.broadcastToAllWindows(EVENT_NAMES.PROVIDERS_CHANGED, ProviderRepository.getAll())
    return created
  })

  ipcMain.handle('providers:update', async (_, id: string, updates: Partial<ModelProvider>) => {
    const updated = ProviderRepository.update(id, updates)
    eventBus.broadcastToAllWindows(EVENT_NAMES.PROVIDERS_CHANGED, ProviderRepository.getAll())
    return updated
  })

  ipcMain.handle('providers:delete', async (_, id: string) => {
    const success = ProviderRepository.delete(id)
    eventBus.broadcastToAllWindows(EVENT_NAMES.PROVIDERS_CHANGED, ProviderRepository.getAll())
    return success
  })

  ipcMain.handle('providers:reorder', async (_, orderedIds: string[]) => {
    const success = ProviderRepository.reorder(orderedIds)
    eventBus.broadcastToAllWindows(EVENT_NAMES.PROVIDERS_CHANGED, ProviderRepository.getAll())
    return success
  })

  ipcMain.handle('providers:addModel', async (_, providerId: string, model: any) => {
    const success = ProviderRepository.addModel(providerId, model)
    eventBus.broadcastToAllWindows(EVENT_NAMES.PROVIDERS_CHANGED, ProviderRepository.getAll())
    return success
  })

  ipcMain.handle('providers:deleteModel', async (_, providerId: string, modelId: string) => {
    const success = ProviderRepository.deleteModel(providerId, modelId)
    eventBus.broadcastToAllWindows(EVENT_NAMES.PROVIDERS_CHANGED, ProviderRepository.getAll())
    return success
  })

  ipcMain.handle(
    'providers:toggleModel',
    async (_, providerId: string, modelId: string, enabled: boolean) => {
      const success = ProviderRepository.toggleModel(providerId, modelId, enabled)
      eventBus.broadcastToAllWindows(EVENT_NAMES.PROVIDERS_CHANGED, ProviderRepository.getAll())
      return success
    }
  )

  ipcMain.handle('providers:setDefaultModel', async (_, providerId: string, modelId: string) => {
    const success = ProviderRepository.setDefaultModel(providerId, modelId)
    eventBus.broadcastToAllWindows(EVENT_NAMES.PROVIDERS_CHANGED, ProviderRepository.getAll())
    return success
  })

  ipcMain.handle('providers:testConnection', async (_, providerId: string) => {
    return LLMService.testConnection(providerId)
  })

  ipcMain.handle(
    'providers:checkModel',
    async (_, providerId: string, modelId?: string, timeout?: number) => {
      return LLMService.checkModel({ providerId, modelId, timeout })
    }
  )

  ipcMain.handle('providers:fetchRemoteModels', async (_, providerId: string) => {
    const res = await LLMService.fetchRemoteModels(providerId)
    if (res.success) {
      eventBus.broadcastToAllWindows(EVENT_NAMES.PROVIDERS_CHANGED, ProviderRepository.getAll())
    }
    return res
  })

  // --- Corpus 语料库模块 ---
  ipcMain.handle('corpus:getAll', async () => {
    return CorpusRepository.getAll()
  })

  ipcMain.handle('corpus:add', async (_, item: any) => {
    const created = CorpusRepository.add(item)
    eventBus.broadcastToAllWindows(EVENT_NAMES.CORPUS_UPDATED, CorpusRepository.getAll())
    eventBus.broadcastToAllWindows(EVENT_NAMES.TODAY_UPDATED)
    return created
  })

  ipcMain.handle('corpus:update', async (_, id: string, updates: Partial<CorpusItem>) => {
    const updated = CorpusRepository.update(id, updates)
    eventBus.broadcastToAllWindows(EVENT_NAMES.CORPUS_UPDATED, CorpusRepository.getAll())
    eventBus.broadcastToAllWindows(EVENT_NAMES.TODAY_UPDATED)
    return updated
  })

  ipcMain.handle('corpus:delete', async (_, id: string) => {
    const success = CorpusRepository.delete(id)
    eventBus.broadcastToAllWindows(EVENT_NAMES.CORPUS_UPDATED, CorpusRepository.getAll())
    eventBus.broadcastToAllWindows(EVENT_NAMES.TODAY_UPDATED)
    return success
  })

  ipcMain.handle('corpus:clear', async () => {
    CorpusRepository.clear()
    eventBus.broadcastToAllWindows(EVENT_NAMES.CORPUS_UPDATED, CorpusRepository.getAll())
    eventBus.broadcastToAllWindows(EVENT_NAMES.TODAY_UPDATED)
    return true
  })

  ipcMain.handle('corpus:clearAll', async () => {
    CorpusRepository.clearAll()
    eventBus.broadcastToAllWindows(EVENT_NAMES.CORPUS_UPDATED, CorpusRepository.getAll())
    eventBus.broadcastToAllWindows(EVENT_NAMES.TODAY_UPDATED)
    return true
  })

  ipcMain.handle('corpus:import', async (_, items: CorpusItem[]) => {
    const count = CorpusRepository.importBatch(items)
    eventBus.broadcastToAllWindows(EVENT_NAMES.CORPUS_UPDATED, CorpusRepository.getAll())
    eventBus.broadcastToAllWindows(EVENT_NAMES.TODAY_UPDATED)
    return count
  })

  // --- Encounters 遇见记录模块 ---
  ipcMain.handle('encounters:add', async (_, input: AddEncounterInput) => {
    const result = EncounterRepository.add(input)
    eventBus.broadcastToAllWindows(EVENT_NAMES.CORPUS_UPDATED, CorpusRepository.getAll())
    eventBus.broadcastToAllWindows(EVENT_NAMES.TODAY_UPDATED)
    return result
  })

  ipcMain.handle('encounters:undo', async (_, id: string) => {
    const success = EncounterRepository.undo(id)
    eventBus.broadcastToAllWindows(EVENT_NAMES.CORPUS_UPDATED, CorpusRepository.getAll())
    eventBus.broadcastToAllWindows(EVENT_NAMES.TODAY_UPDATED)
    return success
  })

  ipcMain.handle('encounters:getByCorpusId', async (_, corpusItemId: string) => {
    return EncounterRepository.getByCorpusId(corpusItemId)
  })

  // --- Review 复习与学习提交 ---
  ipcMain.handle('review:submit', async (_, input: SubmitReviewInput) => {
    const result = ReviewRepository.submit(input)
    eventBus.broadcastToAllWindows(EVENT_NAMES.CORPUS_UPDATED, CorpusRepository.getAll())
    eventBus.broadcastToAllWindows(EVENT_NAMES.TODAY_UPDATED)
    return result
  })

  // --- Today 学习调度模块 ---
  ipcMain.handle('today:getQueue', async (_, limit?: number) => {
    return TodayRepository.getQueue(limit)
  })

  ipcMain.handle('today:getSummary', async () => {
    return TodayRepository.getSummary()
  })

  // --- Settings 设置模块 ---
  ipcMain.handle('settings:get', async () => {
    return SettingsRepository.get()
  })

  ipcMain.handle('settings:update', async (_, updates: Partial<AppSettings>) => {
    const updated = SettingsRepository.update(updates)
    ShortcutService.registerGlobalShortcuts()
    // 设置变更时同步各个服务状态
    SelectionService.syncWithSettings()
    AppService.syncAutoLaunch()
    TrayService.syncWithSettings()
    ProxyService.sync()

    if (updates.selection?.opacity !== undefined) {
      setSelectionWindowOpacity(updates.selection.opacity)
    }
    eventBus.broadcastToAllWindows(EVENT_NAMES.SETTINGS_CHANGED, updated)
    return updated
  })

  ipcMain.handle('settings:reset', async () => {
    const updated = SettingsRepository.reset()
    ShortcutService.registerGlobalShortcuts()
    SelectionService.syncWithSettings()
    AppService.syncAutoLaunch()
    TrayService.syncWithSettings()
    ProxyService.sync()
    eventBus.broadcastToAllWindows(EVENT_NAMES.SETTINGS_CHANGED, updated)
    return updated
  })

  // --- AI 业务模块 ---
  const activeStreamControllers = new Map<string, AbortController>()

  ipcMain.handle('ai:explain', async (_, request: ExplainRequest) => {
    return LLMService.explain(request)
  })

  ipcMain.on(
    'ai:explainStream:start',
    async (event, request: ExplainRequest & { requestId: string }) => {
      const { requestId, ...req } = request
      if (!requestId) return

      const controller = new AbortController()
      activeStreamControllers.set(requestId, controller)

      try {
        await LLMService.explainStream(
          req,
          (data, isDone, error) => {
            if (controller.signal.aborted) return
            const channel = `ai:explainStream:${requestId}`
            if (!event.sender.isDestroyed()) {
              event.sender.send(channel, { data, isDone, error })
            }
          },
          controller.signal
        )
      } finally {
        activeStreamControllers.delete(requestId)
      }
    }
  )

  ipcMain.on('ai:explainStream:abort', (_, { requestId }: { requestId: string }) => {
    if (requestId && activeStreamControllers.has(requestId)) {
      activeStreamControllers.get(requestId)?.abort()
      activeStreamControllers.delete(requestId)
    }
  })

  // ─── 系统与权限控制 ────────────────────────────────────────────────────────

  /** 检查 macOS 辅助功能权限 */
  ipcMain.handle('system:checkAccessibility', async (_, prompt = false) => {
    if (process.platform !== 'darwin') return true
    return systemPreferences.isTrustedAccessibilityClient(prompt)
  })

  /** 弹出系统权限请求对话框 */
  ipcMain.handle('system:requestAccessibilityTrust', async () => {
    if (process.platform !== 'darwin') return true
    return systemPreferences.isTrustedAccessibilityClient(true)
  })

  /** 直接跳转到系统设置 → 辅助功能 */
  ipcMain.handle('system:openAccessibilitySettings', async () => {
    shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
    )
    return true
  })

  /** 调用系统默认浏览器打开外部链接 */
  ipcMain.handle('system:openExternal', async (_, url: string) => {
    if (
      url &&
      (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))
    ) {
      await shell.openExternal(url)
      return true
    }
    return false
  })

  /** 测试网络代理连接 */
  ipcMain.handle('system:testProxy', async (_, testUrl?: string) => {
    return ProxyService.testProxy(testUrl)
  })

  /** 在文件资源管理器/访达中定位并打开文件 */
  ipcMain.handle('system:openPath', async (_, targetPath?: string) => {
    const p = targetPath || sqliteManager.getDbPath()
    if (p && existsSync(p)) {
      shell.showItemInFolder(p)
      return true
    }
    return false
  })

  /** 获取本地 SQLite 数据库与学习语料统计信息 */
  ipcMain.handle('system:getStorageStats', async () => {
    const dbPath = sqliteManager.getDbPath()
    let fileSize = 0
    try {
      if (existsSync(dbPath)) {
        fileSize = statSync(dbPath).size
      }
    } catch {
      // ignore
    }

    const corpusCount = CorpusRepository.getAll().length
    let encountersCount = 0
    let reviewsCount = 0
    try {
      const encRow = sqliteDb.prepare('SELECT COUNT(*) as count FROM encounters').get() as {
        count: number
      }
      encountersCount = encRow?.count || 0
      const revRow = sqliteDb.prepare('SELECT COUNT(*) as count FROM review_logs').get() as {
        count: number
      }
      reviewsCount = revRow?.count || 0
    } catch {
      // ignore
    }

    return {
      dbPath,
      fileSize,
      corpusCount,
      encountersCount,
      reviewsCount
    }
  })

  // ─── 划词助手 IPC ─────────────────────────────────────────────────────────

  /** 工具栏渲染进程上报实际内容尺寸，主进程动态调整窗口 */
  ipcMain.handle('selection:determineToolbarSize', async (_, width: number, height: number) => {
    SelectionService.determineToolbarSize(width, height)
    resizeToolbarWindow(width, height)
    return true
  })

  /** 工具栏"复制"按钮 */
  ipcMain.handle('selection:writeToClipboard', async (_, text: string) => {
    return SelectionService.writeToClipboard(text)
  })

  /** 工具栏"隐藏"（用户点击按钮或进行后续操作后调用）*/
  ipcMain.handle('selection:hideToolbar', async () => {
    SelectionService.hideToolbar()
    return true
  })

  /** 切换功能窗口置顶状态 */
  ipcMain.handle('selection:togglePin', async (event) => {
    const targetWin = BrowserWindow.fromWebContents(event.sender)
    return toggleSelectionWindowPin(targetWin)
  })

  /** 获取功能窗口置顶状态 */
  ipcMain.handle('selection:getPin', async (event) => {
    const targetWin = BrowserWindow.fromWebContents(event.sender)
    return getSelectionWindowPin(targetWin)
  })

  /** 设置功能窗口透明度 */
  ipcMain.handle('selection:setOpacity', async (event, opacity: number) => {
    const targetWin = BrowserWindow.fromWebContents(event.sender)
    setSelectionWindowOpacity(opacity, targetWin)
    return true
  })

  /** 获取当前功能窗口专属初始数据 (隔离多窗口数据) */
  ipcMain.handle('selection:getInitData', async (event) => {
    return getSelectionWindowInitData(event.sender.id)
  })

  // ─── 窗口与交互控制 ──────────────────────────────────────────────────────

  ipcMain.handle(
    'window:showSelection',
    async (_, text: string, actionOrContext?: string, action?: string, sourceApp?: string) => {
      const finalAction =
        action ||
        (['translate', 'explain'].includes(actionOrContext || '') ? actionOrContext : undefined)
      const finalContext = action
        ? actionOrContext
        : ['translate', 'explain'].includes(actionOrContext || '')
          ? undefined
          : actionOrContext
      // 先显示功能浮窗，再隐藏工具栏，避免中间窗口空档期触发 macOS 自动将后台工作台推至前台
      showSelectionWindowWithText(text, finalContext, finalAction, sourceApp)
      hideToolbarWindow()
      return true
    }
  )

  ipcMain.handle('window:hideSelection', async (event) => {
    hideToolbarWindow()
    const targetWin = BrowserWindow.fromWebContents(event.sender)
    hideSelectionWindow(targetWin)
    return true
  })

  ipcMain.handle('window:openMain', async () => {
    createMainWindow()
    return true
  })

  // ─── 应用更新模块 ──────────────────────────────────────────────────────────
  ipcMain.handle('updater:check', async () => {
    return AppUpdaterService.checkForUpdates()
  })

  ipcMain.handle('updater:download', async () => {
    await AppUpdaterService.downloadUpdate()
    return true
  })

  ipcMain.handle('updater:cancel', async () => {
    AppUpdaterService.cancelDownload()
    return true
  })

  ipcMain.handle('updater:quitAndInstall', async () => {
    AppUpdaterService.quitAndInstall()
    return true
  })

  ipcMain.handle('updater:getVersion', async () => {
    return AppUpdaterService.getVersion()
  })

  ipcMain.handle('updater:getState', async () => {
    return AppUpdaterService.getState()
  })
}
