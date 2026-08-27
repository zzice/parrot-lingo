import { app, dialog, shell } from 'electron'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '../utils/logger'
import { SettingsRepository } from '../db/repositories/settingsRepository'
import { AccessibilityService } from './accessibilityService'

export class DiagnosticsService {
  /**
   * 生成系统环境诊断报告文本
   */
  public static getDiagnosticSummary(): string {
    const settings = SettingsRepository.get()
    const isAccessibilityTrusted = AccessibilityService.isTrusted(false)

    const lines: string[] = []
    lines.push('=== ParrotLingo System Diagnostics ===')
    lines.push(`Generated: ${new Date().toISOString()}`)
    lines.push(`App Version: ${app.getVersion()}`)
    lines.push(`Electron Version: ${process.versions.electron}`)
    lines.push(`Chrome Version: ${process.versions.chrome}`)
    lines.push(`Node Version: ${process.versions.node}`)
    lines.push(`OS Platform: ${process.platform} (${os.type()} ${os.release()})`)
    lines.push(`OS Architecture: ${process.arch} (Machine: ${os.arch()})`)
    lines.push(`Total Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`)
    lines.push(`Free Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`)
    lines.push(`User Data Path: ${app.getPath('userData')}`)
    lines.push(`Log File Path: ${Logger.getLogFilePath()}`)
    lines.push('')
    lines.push('--- Permissions & System State ---')
    lines.push(`macOS Accessibility Trusted: ${isAccessibilityTrusted ? 'YES' : 'NO'}`)
    lines.push('')
    lines.push('--- Current Configurations ---')
    lines.push(`Selection Enabled: ${settings?.selection?.enabled ?? false}`)
    lines.push(`Capture Method: ${settings?.selection?.captureMethod ?? 'selection'}`)
    lines.push(`Theme Mode: ${settings?.system?.theme ?? 'system'}`)
    lines.push(`Language: ${settings?.system?.language ?? 'zh-CN'}`)
    lines.push(`Proxy Mode: ${settings?.system?.proxyMode ?? 'system'}`)
    lines.push(`Auto Launch: ${settings?.system?.autoLaunch ?? false}`)
    lines.push('')
    lines.push('--- Recent Logs (Last 100 lines) ---')
    const recent = Logger.readRecentLogs(100)
    lines.push(recent)

    return lines.join('\n')
  }

  /**
   * 弹出系统保存文件对话框，将诊断报告与全量运行日志一键导出
   */
  public static async exportLogs(): Promise<{
    success: boolean
    filePath?: string
    error?: string
  }> {
    try {
      const now = new Date()
      const timestamp =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0')

      const defaultFileName = `parrot-lingo-diagnostics-${timestamp}.txt`
      const defaultPath = path.join(
        app.getPath('downloads') || app.getPath('desktop'),
        defaultFileName
      )

      const result = await dialog.showSaveDialog({
        title: '导出运行日志与诊断信息',
        defaultPath,
        filters: [
          { name: 'Log & Text Files', extensions: ['txt', 'log'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false }
      }

      const summary = this.getDiagnosticSummary()
      const allLogs = Logger.readAllLogs()

      const exportContent = `${summary}\n\n========================================\n=== FULL RUNTIME LOG DUMP ===\n========================================\n\n${allLogs}`

      fs.writeFileSync(result.filePath, exportContent, 'utf-8')
      Logger.info('Diagnostics', `Logs successfully exported to ${result.filePath}`)

      return { success: true, filePath: result.filePath }
    } catch (err: any) {
      Logger.error('Diagnostics', 'Failed to export logs', err)
      return { success: false, error: err?.message || String(err) }
    }
  }

  /**
   * 在文件管理器（Finder / Explorer）中直接定位日志文件夹
   */
  public static async openLogDir(): Promise<boolean> {
    try {
      const logFilePath = Logger.getLogFilePath()
      if (fs.existsSync(logFilePath)) {
        shell.showItemInFolder(logFilePath)
        return true
      }
      const logDir = Logger.getLogDir()
      await shell.openPath(logDir)
      return true
    } catch (err) {
      Logger.error('Diagnostics', 'Failed to open log directory', err)
      return false
    }
  }
}
