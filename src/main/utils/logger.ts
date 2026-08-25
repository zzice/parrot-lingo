import { is } from '@electron-toolkit/utils'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'

export const isDev = is.dev || process.env.NODE_ENV !== 'production'

const MAX_LOG_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_BACKUP_FILES = 3

export class Logger {
  private static logDir: string | null = null
  private static logFile: string | null = null
  private static isInitialized = false

  public static init(): void {
    if (this.isInitialized) return
    this.isInitialized = true

    try {
      const userData = app.getPath('userData')
      this.logDir = path.join(userData, 'logs')
      this.logFile = path.join(this.logDir, 'parrot-lingo.log')

      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true })
      }

      this.interceptConsole()
      this.appendToFile('INFO', 'Logger', `=== ParrotLingo v${app.getVersion()} Log Started ===`)
    } catch (err) {
      // Fallback if app path not yet available
      console.error('[Logger] Initialization failed:', err)
    }
  }

  public static getLogDir(): string {
    if (!this.logDir) {
      try {
        const userData = app.getPath('userData')
        this.logDir = path.join(userData, 'logs')
      } catch {
        this.logDir = path.join(process.cwd(), 'logs')
      }
    }
    return this.logDir
  }

  public static getLogFilePath(): string {
    if (!this.logFile) {
      this.logFile = path.join(this.getLogDir(), 'parrot-lingo.log')
    }
    return this.logFile
  }

  private static formatTime(): string {
    const now = new Date()
    const YYYY = now.getFullYear()
    const MM = String(now.getMonth() + 1).padStart(2, '0')
    const DD = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const ms = String(now.getMilliseconds()).padStart(3, '0')
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}.${ms}`
  }

  private static rotateLogsIfNeeded(): void {
    try {
      const logFile = this.getLogFilePath()
      if (!fs.existsSync(logFile)) return

      const stat = fs.statSync(logFile)
      if (stat.size < MAX_LOG_SIZE) return

      for (let i = MAX_BACKUP_FILES - 1; i >= 1; i--) {
        const src = `${logFile}.${i}`
        const dest = `${logFile}.${i + 1}`
        if (fs.existsSync(src)) {
          if (i === MAX_BACKUP_FILES - 1) {
            fs.unlinkSync(src)
          } else {
            fs.renameSync(src, dest)
          }
        }
      }

      fs.renameSync(logFile, `${logFile}.1`)
    } catch (err) {
      // Ignore rotation error
    }
  }

  private static appendToFile(level: string, module: string, message: string, data?: any): void {
    try {
      const logDir = this.getLogDir()
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }

      this.rotateLogsIfNeeded()

      const time = this.formatTime()
      let logLine = `[${time}] [${level}] [${module}] ${message}`
      if (data !== undefined) {
        if (data instanceof Error) {
          logLine += `\n${data.stack || data.message}`
        } else if (typeof data === 'object') {
          try {
            logLine += ` ${JSON.stringify(data, null, 2)}`
          } catch {
            logLine += ` ${util.inspect(data)}`
          }
        } else {
          logLine += ` ${data}`
        }
      }
      logLine += '\n'

      fs.appendFileSync(this.getLogFilePath(), logLine, 'utf-8')
    } catch {
      // File write error fallback
    }
  }

  private static interceptConsole(): void {
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error

    console.log = (...args: any[]) => {
      originalLog.apply(console, args)
      const formatted = util.format(...args)
      Logger.appendToFile('INFO', 'Console', formatted)
    }

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args)
      const formatted = util.format(...args)
      Logger.appendToFile('WARN', 'Console', formatted)
    }

    console.error = (...args: any[]) => {
      originalError.apply(console, args)
      const formatted = util.format(...args)
      Logger.appendToFile('ERROR', 'Console', formatted)
    }
  }

  public static readRecentLogs(maxLines = 1000): string {
    try {
      const logFile = this.getLogFilePath()
      if (!fs.existsSync(logFile)) return 'No log file found.'

      const content = fs.readFileSync(logFile, 'utf-8')
      const lines = content.split('\n')
      if (lines.length <= maxLines) {
        return content
      }
      return lines.slice(lines.length - maxLines).join('\n')
    } catch (err: any) {
      return `Failed to read log file: ${err?.message || err}`
    }
  }

  public static readAllLogs(): string {
    try {
      const logFile = this.getLogFilePath()
      if (!fs.existsSync(logFile)) return 'No log file found.'

      let fullContent = ''
      for (let i = MAX_BACKUP_FILES; i >= 1; i--) {
        const backupFile = `${logFile}.${i}`
        if (fs.existsSync(backupFile)) {
          fullContent += `\n--- Historical Log Backup .${i} ---\n`
          fullContent += fs.readFileSync(backupFile, 'utf-8')
        }
      }

      fullContent += '\n--- Current Log ---\n'
      fullContent += fs.readFileSync(logFile, 'utf-8')
      return fullContent.trim()
    } catch (err: any) {
      return `Failed to read full logs: ${err?.message || err}`
    }
  }

  static info(module: string, message: string, data?: any): void {
    this.appendToFile('INFO', module, message, data)
    if (!isDev) return
    const time = new Date().toLocaleTimeString()
    if (data !== undefined) {
      console.log(`\x1b[36m[${time}] [${module}]\x1b[0m ${message}`, data)
    } else {
      console.log(`\x1b[36m[${time}] [${module}]\x1b[0m ${message}`)
    }
  }

  static success(module: string, message: string, data?: any): void {
    this.appendToFile('SUCCESS', module, message, data)
    if (!isDev) return
    const time = new Date().toLocaleTimeString()
    if (data !== undefined) {
      console.log(`\x1b[32m[${time}] [${module}] ✔\x1b[0m ${message}`, data)
    } else {
      console.log(`\x1b[32m[${time}] [${module}] ✔\x1b[0m ${message}`)
    }
  }

  static warn(module: string, message: string, data?: any): void {
    this.appendToFile('WARN', module, message, data)
    if (!isDev) return
    const time = new Date().toLocaleTimeString()
    if (data !== undefined) {
      console.log(`\x1b[33m[${time}] [${module}] ⚠\x1b[0m ${message}`, data)
    } else {
      console.log(`\x1b[33m[${time}] [${module}] ⚠\x1b[0m ${message}`)
    }
  }

  static error(module: string, message: string, data?: any): void {
    this.appendToFile('ERROR', module, message, data)
    if (!isDev) return
    const time = new Date().toLocaleTimeString()
    if (data !== undefined) {
      console.error(`\x1b[31m[${time}] [${module}] ✖\x1b[0m ${message}`, data)
    } else {
      console.error(`\x1b[31m[${time}] [${module}] ✖\x1b[0m ${message}`)
    }
  }
}
