import { is } from '@electron-toolkit/utils'

export const isDev = is.dev || process.env.NODE_ENV !== 'production'

export class Logger {
  static info(module: string, message: string, data?: any): void {
    if (!isDev) return
    const time = new Date().toLocaleTimeString()
    if (data !== undefined) {
      console.log(`\x1b[36m[${time}] [${module}]\x1b[0m ${message}`, data)
    } else {
      console.log(`\x1b[36m[${time}] [${module}]\x1b[0m ${message}`)
    }
  }

  static success(module: string, message: string, data?: any): void {
    if (!isDev) return
    const time = new Date().toLocaleTimeString()
    if (data !== undefined) {
      console.log(`\x1b[32m[${time}] [${module}] ✔\x1b[0m ${message}`, data)
    } else {
      console.log(`\x1b[32m[${time}] [${module}] ✔\x1b[0m ${message}`)
    }
  }

  static warn(module: string, message: string, data?: any): void {
    if (!isDev) return
    const time = new Date().toLocaleTimeString()
    if (data !== undefined) {
      console.log(`\x1b[33m[${time}] [${module}] ⚠\x1b[0m ${message}`, data)
    } else {
      console.log(`\x1b[33m[${time}] [${module}] ⚠\x1b[0m ${message}`)
    }
  }

  static error(module: string, message: string, data?: any): void {
    if (!isDev) return
    const time = new Date().toLocaleTimeString()
    if (data !== undefined) {
      console.error(`\x1b[31m[${time}] [${module}] ✖\x1b[0m ${message}`, data)
    } else {
      console.error(`\x1b[31m[${time}] [${module}] ✖\x1b[0m ${message}`)
    }
  }
}
