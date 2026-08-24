import { app } from 'electron'
import { autoUpdater, UpdateInfo, ProgressInfo, CancellationToken } from 'electron-updater'
import { getMainWindow } from '../windows/mainWindow'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'

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
  private downloadedFilePath: string | null = null
  private currentState: AppUpdaterState = {
    status: 'idle',
    updateInfo: null,
    progress: null,
    error: null
  }

  public init(): void {
    autoUpdater.logger = console
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

    autoUpdater.on('update-downloaded', (info: UpdateInfo & { downloadedFile?: string }) => {
      console.log('[AppUpdater] Update downloaded successfully:', info.version, info.downloadedFile)
      if (info.downloadedFile) {
        this.downloadedFilePath = info.downloadedFile
      }
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
      if (
        lower.includes('404') ||
        lower.includes('cannot find latest release') ||
        lower.includes('not found')
      ) {
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
      const firstLine = lines[0]
        .replace(/^Error:\s*/, '')
        .replace(/\{.*$/, '')
        .trim()
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
      if (
        lower.includes('404') ||
        lower.includes('cannot find latest release') ||
        lower.includes('not found')
      ) {
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
      const firstLine = lines[0]
        .replace(/^Error:\s*/, '')
        .replace(/\{.*$/, '')
        .trim()
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
      const res = await autoUpdater.downloadUpdate(this.cancellationToken)
      if (Array.isArray(res) && res.length > 0 && typeof res[0] === 'string') {
        this.downloadedFilePath = res[0]
      }
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
   * 查找已下载的更新包文件路径（优先从内存缓存中获取，其次扫描本地标准缓存目录）
   */
  private findDownloadedZip(): string | null {
    if (this.downloadedFilePath && fs.existsSync(this.downloadedFilePath)) {
      return this.downloadedFilePath
    }

    // 检查 electron-updater 内部下载助手缓存路径
    const helperFile = (autoUpdater as any).downloadedUpdateHelper?.file
    if (helperFile && typeof helperFile === 'string' && fs.existsSync(helperFile)) {
      this.downloadedFilePath = helperFile
      return helperFile
    }

    // 扫描 macOS 标准缓存目录
    const cacheDir = path.join(os.homedir(), 'Library/Caches/parrot-lingo-updater')
    const candidates = [
      path.join(cacheDir, 'pending/update.zip'),
      path.join(cacheDir, 'update.zip')
    ]

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        this.downloadedFilePath = c
        return c
      }
    }

    if (fs.existsSync(cacheDir)) {
      try {
        const files = fs.readdirSync(cacheDir)
        for (const file of files) {
          if (file.endsWith('.zip')) {
            const fullPath = path.join(cacheDir, file)
            this.downloadedFilePath = fullPath
            return fullPath
          }
        }
        const pendingDir = path.join(cacheDir, 'pending')
        if (fs.existsSync(pendingDir)) {
          const pendingFiles = fs.readdirSync(pendingDir)
          for (const file of pendingFiles) {
            if (file.endsWith('.zip')) {
              const fullPath = path.join(pendingDir, file)
              this.downloadedFilePath = fullPath
              return fullPath
            }
          }
        }
      } catch (err) {
        console.warn('[AppUpdater] Failed scanning local updater cache directory:', err)
      }
    }

    return null
  }

  /**
   * macOS 专属热升级安装器：
   * 规避 Squirrel.Mac / ShipIt 在 Ad-hoc/非商业证书签名下的静默阻断，
   * 采用系统原生 ditto + xattr 覆盖安装并无缝重启应用。
   */
  private installOnMac(zipFilePath: string): boolean {
    if (!app.isPackaged) {
      console.log('[AppUpdater] Cannot install update package in development mode.')
      return false
    }

    try {
      const exePath = app.getPath('exe')
      const appMatch = exePath.match(/^(.+?\.app)\/Contents\/MacOS\//)
      let targetApp = appMatch ? appMatch[1] : null
      if (!targetApp && process.resourcesPath.includes('.app')) {
        targetApp = path.resolve(process.resourcesPath, '../../..')
      }

      // 若在只读挂载卷 (DMG) 中运行，目标默认安装到 /Applications
      if (targetApp && targetApp.startsWith('/Volumes/')) {
        targetApp = '/Applications/ParrotLingo.app'
      }

      if (!targetApp || !fs.existsSync(zipFilePath)) {
        console.warn('[AppUpdater] installOnMac: invalid target app path or zip file missing', {
          targetApp,
          zipFilePath
        })
        return false
      }

      const scriptDir = os.tmpdir()
      const scriptPath = path.join(scriptDir, `parrotlingo_update_${Date.now()}.sh`)
      const extractDir = path.join(scriptDir, `parrotlingo_extract_${Date.now()}`)

      const scriptContent = `#!/bin/bash
PID=$1
TARGET_APP="$2"
ZIP_FILE="$3"
EXTRACT_DIR="$4"

# 1. 等待主进程完全退出
COUNT=0
while kill -0 "$PID" 2>/dev/null; do
  sleep 0.2
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge 50 ]; then
    kill -9 "$PID" 2>/dev/null || true
    break
  fi
done

# 2. 解压更新包
mkdir -p "$EXTRACT_DIR"
unzip -q -o "$ZIP_FILE" -d "$EXTRACT_DIR"

# 3. 定位解压出的 .app 应用程序包
EXTRACTED_APP=$(find "$EXTRACT_DIR" -maxdepth 2 -name "*.app" | head -n 1)

if [ -n "$EXTRACTED_APP" ] && [ -d "$EXTRACTED_APP" ]; then
  # 4. 清除隔离属性防止 Gatekeeper 阻断
  xattr -cr "$EXTRACTED_APP" 2>/dev/null || true

  # 5. 使用 ditto 完美替换旧版本应用
  rm -rf "$TARGET_APP"
  ditto "$EXTRACTED_APP" "$TARGET_APP"
  xattr -cr "$TARGET_APP" 2>/dev/null || true

  # 6. 清理临时目录并启动新版本
  rm -rf "$EXTRACT_DIR"
  open "$TARGET_APP"
else
  rm -rf "$EXTRACT_DIR"
  open "$TARGET_APP" 2>/dev/null || true
fi

# 清除临时脚本自身
rm -f "$0"
`

      fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 })

      const child = spawn(
        '/bin/bash',
        [scriptPath, String(process.pid), targetApp, zipFilePath, extractDir],
        {
          detached: true,
          stdio: 'ignore'
        }
      )
      child.unref()

      // 立即退出主进程，交由后台安装脚本完成覆盖并自动唤醒新版本
      app.exit(0)
      return true
    } catch (e) {
      console.error('[AppUpdater] installOnMac failed with error:', e)
      return false
    }
  }

  /**
   * 退出应用并安装更新
   */
  public quitAndInstall(): void {
    console.log('[AppUpdater] Triggering quitAndInstall...')
    ;(app as any).isQuitting = true

    // 移除所有窗口 close 事件监听，防止任何窗口的 event.preventDefault() 拦截阻断退出
    const { BrowserWindow } = require('electron')
    BrowserWindow.getAllWindows().forEach((win: any) => {
      if (!win.isDestroyed()) {
        win.removeAllListeners('close')
      }
    })

    // macOS 原生热升级流程（解决 Ad-hoc / 无证书签名下 Squirrel.Mac 静默失效的问题）
    if (process.platform === 'darwin' && app.isPackaged) {
      const zipPath = this.findDownloadedZip()
      if (zipPath) {
        console.log('[AppUpdater] Launching macOS native updater script with zip:', zipPath)
        const handled = this.installOnMac(zipPath)
        if (handled) return
      }
    }

    // Windows / Linux 或通用回退策略
    setImmediate(() => {
      try {
        autoUpdater.quitAndInstall(false, true)
      } catch (err) {
        console.error('[AppUpdater] autoUpdater.quitAndInstall error:', err)
        app.quit()
      }
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
