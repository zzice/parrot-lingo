import { app } from 'electron'
import { autoUpdater, UpdateInfo, ProgressInfo, CancellationToken } from 'electron-updater'
import { getMainWindow } from '../windows/mainWindow'

// 调度参数（工业级配置）
const INITIAL_CHECK_DELAY_MS = 5_000 // 启动后 5 秒首次检查，避开启动 I/O 争抢
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 小时检查周期
const CHECK_JITTER_RATIO = 0.15 // ±15% 随机时间抖动，防并发雪崩
const BACKOFF_DELAYS = [
  5 * 60 * 1000,
  10 * 60 * 1000,
  20 * 60 * 1000,
  40 * 60 * 1000,
  60 * 60 * 1000
]

export interface UpdateMetadata {
  version: string
  releaseDate?: string
  releaseNotes?: string
  files?: Array<{ url: string; size?: number }>
}

export interface UpdateDownloadProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export type UpdateStatus =
  'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

export interface AppUpdaterState {
  status: UpdateStatus
  updateInfo: UpdateMetadata | null
  progress: UpdateDownloadProgress | null
  error: string | null
}

class AppUpdaterServiceImpl {
  private cancellationToken: CancellationToken = new CancellationToken()
  private timer: NodeJS.Timeout | null = null
  private failureCount = 0
  private currentState: AppUpdaterState = {
    status: 'idle',
    updateInfo: null,
    progress: null,
    error: null
  }

  public init(): void {
    autoUpdater.autoDownload = false
    // 严禁退出时自动静默安装，防止系统关机时文件损坏或被异常卸载，必须由用户明确触发
    autoUpdater.autoInstallOnAppQuit = false
    autoUpdater.allowDowngrade = false
    autoUpdater.forceDevUpdateConfig = !app.isPackaged

    this.registerEvents()

    // 关机与退出保护
    app.on('before-quit', () => {
      this.cancelDownload()
    })

    // 无论打包与否，启动 5 秒后都安排自动检测（方便本地与生产统一调度）
    this.scheduleNextCheck(INITIAL_CHECK_DELAY_MS)
  }

  public getState(): AppUpdaterState {
    return this.currentState
  }

  private broadcast(channel: string, payload?: any): void {
    const mainWin = getMainWindow()
    if (mainWin && !mainWin.isDestroyed() && !mainWin.webContents.isDestroyed()) {
      mainWin.webContents.send(channel, payload)
    }
  }

  private registerEvents(): void {
    autoUpdater.on('checking-for-update', () => {
      console.log('[AppUpdater] Checking for updates...')
      this.currentState.status = 'checking'
      this.currentState.error = null
      this.broadcast('updater:checking')
    })

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log('[AppUpdater] Update available:', info.version)
      const meta: UpdateMetadata = {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes:
          typeof info.releaseNotes === 'string'
            ? info.releaseNotes
            : Array.isArray(info.releaseNotes)
              ? info.releaseNotes
                  .map((n) => (typeof n === 'string' ? n : n.note))
                  .filter(Boolean)
                  .join('\n\n')
              : undefined,
        files: info.files?.map((f) => ({ url: f.url, size: f.size }))
      }
      this.currentState = {
        status: 'available',
        updateInfo: meta,
        progress: null,
        error: null
      }
      this.broadcast('updater:available', meta)
    })

    autoUpdater.on('update-not-available', () => {
      console.log('[AppUpdater] Update not available, current version is up to date.')
      this.currentState = {
        status: 'not-available',
        updateInfo: null,
        progress: null,
        error: null
      }
      this.broadcast('updater:notAvailable')
    })

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      const data: UpdateDownloadProgress = {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      }
      this.currentState.status = 'downloading'
      this.currentState.progress = data
      this.broadcast('updater:downloadProgress', data)
    })

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log('[AppUpdater] Update downloaded successfully:', info.version)
      const meta: UpdateMetadata = {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes:
          typeof info.releaseNotes === 'string'
            ? info.releaseNotes
            : Array.isArray(info.releaseNotes)
              ? info.releaseNotes
                  .map((n) => (typeof n === 'string' ? n : n.note))
                  .filter(Boolean)
                  .join('\n\n')
              : undefined
      }
      this.currentState = {
        status: 'downloaded',
        updateInfo: meta,
        progress: null,
        error: null
      }
      this.broadcast('updater:downloaded', meta)
    })

    const sanitizeUpdaterError = (raw: string): string => {
      if (!raw) return '检查更新失败，请稍后重试'
      const lower = raw.toLowerCase()
      if (lower.includes('404') || lower.includes('cannot find latest release') || lower.includes('not found')) {
        return '当前暂无新版本发布或更新未就绪'
      }
      if (
        lower.includes('net::') ||
        lower.includes('timeout') ||
        lower.includes('enotfound') ||
        lower.includes('econnrefused') ||
        lower.includes('failed to fetch') ||
        lower.includes('network')
      ) {
        return '网络连接超时或无法连接到更新服务器，请检查网络设置'
      }
      if (lower.includes('403') || lower.includes('401') || lower.includes('unauthorized')) {
        return '访问更新服务受限 (403/401)'
      }
      const lines = raw.split('\n')
      const firstLine = lines[0].replace(/^Error:\s*/, '').replace(/\{.*$/, '').trim()
      return firstLine || '检查更新失败，请稍后重试'
    }

    autoUpdater.on('error', (error: Error) => {
      console.error('[AppUpdater] Update error:', error)
      const errorMsg = sanitizeUpdaterError(error.message || '')
      this.currentState.status = 'error'
      this.currentState.error = errorMsg
      this.broadcast('updater:error', { message: errorMsg })
    })
  }

  /**
   * 手动或自动检查更新
   */
  public async checkForUpdates(): Promise<{
    available: boolean
    version?: string
    error?: string
  }> {
    const sanitizeUpdaterError = (raw: string): string => {
      if (!raw) return '检查更新失败，请稍后重试'
      const lower = raw.toLowerCase()
      if (lower.includes('404') || lower.includes('cannot find latest release') || lower.includes('not found')) {
        return '当前暂无新版本发布或更新未就绪'
      }
      if (
        lower.includes('net::') ||
        lower.includes('timeout') ||
        lower.includes('enotfound') ||
        lower.includes('econnrefused') ||
        lower.includes('failed to fetch') ||
        lower.includes('network')
      ) {
        return '网络连接超时或无法连接到更新服务器，请检查网络设置'
      }
      if (lower.includes('403') || lower.includes('401') || lower.includes('unauthorized')) {
        return '访问更新服务受限 (403/401)'
      }
      const lines = raw.split('\n')
      const firstLine = lines[0].replace(/^Error:\s*/, '').replace(/\{.*$/, '').trim()
      return firstLine || '检查更新失败，请稍后重试'
    }

    try {
      this.currentState.status = 'checking'
      const result = await autoUpdater.checkForUpdates()
      this.failureCount = 0
      this.scheduleNextCheck(this.getNextCheckDelay())
      if (result && result.updateInfo) {
        return {
          available: result.updateInfo.version !== app.getVersion(),
          version: result.updateInfo.version
        }
      }
      return { available: false }
    } catch (err: any) {
      this.failureCount++
      const backoffDelay =
        BACKOFF_DELAYS[Math.min(this.failureCount - 1, BACKOFF_DELAYS.length - 1)]
      this.scheduleNextCheck(backoffDelay)
      const errorMsg = sanitizeUpdaterError(err?.message || '')
      this.currentState.status = 'error'
      this.currentState.error = errorMsg
      return { available: false, error: errorMsg }
    }
  }

  /**
   * 开始下载更新包
   */
  public async downloadUpdate(): Promise<void> {
    if (this.currentState.status === 'downloading') return
    this.cancellationToken = new CancellationToken()
    this.currentState.status = 'downloading'
    try {
      await autoUpdater.downloadUpdate(this.cancellationToken)
    } catch (err: any) {
      this.currentState.status = 'error'
      this.currentState.error = err?.message || 'Download failed'
      throw err
    }
  }

  /**
   * 取消当前下载
   */
  public cancelDownload(): void {
    if (this.currentState.status === 'downloading') {
      this.cancellationToken.cancel()
      this.cancellationToken = new CancellationToken()
      this.currentState.status = 'available'
      this.currentState.progress = null
      this.broadcast('updater:cancelled')
    }
  }

  /**
   * 退出应用并安装更新
   */
  public quitAndInstall(): void {
    setImmediate(() => {
      autoUpdater.quitAndInstall(true, true)
    })
  }

  /**
   * 获取当前应用版本
   */
  public getVersion(): string {
    return app.getVersion()
  }

  private scheduleNextCheck(delayMs: number): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    console.log(`[AppUpdater] Next check scheduled in ${Math.round(delayMs / 1000)}s`)
    this.timer = setTimeout(async () => {
      console.log('[AppUpdater] Scheduled auto-check triggered...')
      await this.checkForUpdates()
    }, delayMs)
  }

  private getNextCheckDelay(): number {
    const jitter = (Math.random() * 2 - 1) * CHECK_JITTER_RATIO
    return Math.round(CHECK_INTERVAL_MS * (1 + jitter))
  }
}

export const AppUpdaterService = new AppUpdaterServiceImpl()
