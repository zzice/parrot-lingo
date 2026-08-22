import { app } from 'electron'
import { exec } from 'child_process'
import { SettingsRepository } from '../db/repositories/settingsRepository'

export class AppService {
  /**
   * 同步开机自动启动配置到操作系统
   */
  static syncAutoLaunch(): void {
    const settings = SettingsRepository.get()
    const isAutoLaunch = Boolean(settings?.system?.autoLaunch)
    const isStartMinimized = Boolean(settings?.system?.startMinimized)

    if (process.platform === 'darwin') {
      try {
        // 调用 Electron 原生 API
        app.setLoginItemSettings({
          openAtLogin: isAutoLaunch,
          openAsHidden: isStartMinimized
        })
      } catch (err) {
        console.warn('[AppService] Native setLoginItemSettings warning:', err)
      }

      // 获取当前实际运行的 .app 路径（如 /Applications/ParrotLingo.app）
      const execPath = app.getPath('exe')
      const appPath = execPath.includes('/Contents/MacOS/')
        ? execPath.replace(/\/Contents\/MacOS\/.*$/, '')
        : '/Applications/ParrotLingo.app'
      const appName = 'ParrotLingo'

      // 删除脚本覆盖所有可能的大小写与路径匹配
      const deleteCondition = `(every login item whose name is "${appName}" or name is "parrot-lingo" or path contains "${appName}" or path contains "parrot-lingo")`

      if (isAutoLaunch) {
        const cmd = `osascript -e 'tell application "System Events" to delete ${deleteCondition}' -e 'tell application "System Events" to make login item at end with properties {path:"${appPath}", name:"${appName}", hidden:${isStartMinimized}}'`
        exec(cmd, (error) => {
          if (error) {
            console.error('[AppService] Failed to add login item via AppleScript:', error)
          } else {
            console.log(`[AppService] Successfully registered login item for ${appName}`)
          }
        })
      } else {
        const cmd = `osascript -e 'tell application "System Events" to delete ${deleteCondition}'`
        exec(cmd, (error) => {
          if (error) {
            console.error('[AppService] Failed to remove login item via AppleScript:', error)
          } else {
            console.log(`[AppService] Successfully removed login item for ${appName}`)
          }
        })
      }
    } else if (process.platform === 'win32') {
      try {
        app.setLoginItemSettings({
          openAtLogin: isAutoLaunch,
          openAsHidden: isStartMinimized
        })
      } catch (err) {
        console.error('[AppService] Failed to set Windows login item:', err)
      }
    }
  }
}
