import { app, nativeImage } from 'electron'

import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow, showMainWindow } from './windows/mainWindow'
import { createSelectionWindow } from './windows/selectionWindow'
import { registerIpcHandlers } from './ipc/registerIpc'
import { ShortcutService } from './services/shortcutService'
import { AccessibilityService } from './services/accessibilityService'
import { SelectionService } from './services/selectionService'
import { TrayService } from './services/trayService'
import { AppService } from './services/appService'
import { ProxyService } from './services/proxyService'
import { AppUpdaterService } from './services/appUpdaterService'
import { createToolbarWindow } from './windows/toolbarWindow'
import { SettingsRepository } from './db/repositories/settingsRepository'
import icon from '../../resources/icon.png?asset'

// 单实例锁控制
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showMainWindow()
  })

  app.whenReady().then(() => {
    // 设置应用 AppUserModelId 与 macOS Dock 图标 (遵循 macOS HIG 标准 824x824 squircle 尺寸规范)
    electronApp.setAppUserModelId('com.parrotlingo.app')
    if (process.platform === 'darwin' && app.dock) {
      try {
        const dockIcon = nativeImage.createFromPath(icon)
        if (!dockIcon.isEmpty()) {
          app.dock.setIcon(dockIcon)
        }
        app.dock.show()
      } catch (e) {
        console.error('Failed to set dock icon:', e)
      }
    }

    // 默认快捷键行为优化
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // 注册 IPC 处理程序
    registerIpcHandlers()

    // 同步开机自启设置
    AppService.syncAutoLaunch()

    // 同步系统托盘 (依据设置 showTrayIcon 决定创建或销毁)
    TrayService.syncWithSettings()

    // 同步网络代理配置
    ProxyService.sync()

    // 初始化应用更新服务
    AppUpdaterService.init()

    // 创建主窗口
    createMainWindow()

    // 预热划词小窗口与悬浮胶囊工具条
    createSelectionWindow()
    createToolbarWindow()

    // 全局快捷键服务 (仅在 captureMethod 为 shortcut 时注册)
    ShortcutService.registerGlobalShortcuts()

    // 仅在用户开启划词助手且已获授权时启动划选服务 (基于 selection-hook)
    SelectionService.syncWithSettings()

    // 辅助功能权限自动检测与同步 (仅在用户已开启划词助手时检测权限变动)
    app.on('browser-window-focus', () => {
      const settings = SettingsRepository.get()
      if (settings?.selection?.enabled) {
        AccessibilityService.verifyAndSyncState()
      }
    })

    // 定时轻量同步（仅在开启划词助手时校验，保证系统设置关闭权限时能被即时捕获）
    setInterval(() => {
      const settings = SettingsRepository.get()
      if (settings?.selection?.enabled) {
        AccessibilityService.verifyAndSyncState()
      }
    }, 3000)

    app.on('activate', function (_event, hasVisibleWindows) {
      // 仅在用户通过 Dock 点击激活且当前应用无可见主窗口时，恢复主工作台
      if (!hasVisibleWindows) {
        showMainWindow()
      }
    })
  })

  app.on('before-quit', () => {
    ;(app as any).isQuitting = true
    SelectionService.stop()
    ShortcutService.unregisterAll()
    TrayService.destroyTray()
  })

  app.on('will-quit', () => {
    SelectionService.stop()
    ShortcutService.unregisterAll()
    TrayService.destroyTray()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
