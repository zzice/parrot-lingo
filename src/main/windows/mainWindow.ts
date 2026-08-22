import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { SettingsRepository } from '../db/repositories/settingsRepository'
import icon from '../../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }

  const settings = SettingsRepository.get()
  const isDark =
    settings?.system?.theme === 'dark' ||
    (settings?.system?.theme === 'system' &&
      process.platform === 'darwin' &&
      require('electron').nativeTheme?.shouldUseDarkColors)
  const initialBgColor = isDark ? '#090d16' : '#f1f5f9'

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 740,
    minWidth: 880,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: initialBgColor,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    const currentSettings = SettingsRepository.get()
    if (!currentSettings.system?.startMinimized) {
      showMainWindow()
    }
    if (is.dev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  mainWindow.on('close', (event) => {
    if (!(app as any).isQuitting) {
      // macOS 上始终隐藏窗口保持渲染进程驻留以实现秒级无闪烁唤醒；Windows/Linux 根据托盘设置隐藏
      const isDarwin = process.platform === 'darwin'
      const currentSettings = SettingsRepository.get()
      const shouldHide =
        isDarwin ||
        (currentSettings.system?.closeToTray && currentSettings.system?.showTrayIcon !== false)

      if (shouldHide) {
        event.preventDefault()
        mainWindow?.hide()
      }
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    // 处理 Vite 重新优化依赖时的热刷新
    mainWindow.webContents.on('did-fail-load', () => {
      if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        setTimeout(() => {
          mainWindow?.loadURL(process.env['ELECTRON_RENDERER_URL']!)
        }, 500)
      }
    })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/**
 * 显示并聚焦主工作台窗口
 */
export function showMainWindow(): BrowserWindow {
  if (process.platform === 'darwin' && app.dock && !app.dock.isVisible()) {
    app.dock.show()
  }

  const win = getMainWindow() || createMainWindow()

  if (win.isMinimized()) {
    win.restore()
  }

  if (!win.isVisible()) {
    win.show()
  }
  win.focus()

  return win
}
