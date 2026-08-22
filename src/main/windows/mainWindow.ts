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

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 740,
    minWidth: 880,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0f172a',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    const settings = SettingsRepository.get()
    if (!settings.system?.startMinimized) {
      showMainWindow()
    }
    if (is.dev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  mainWindow.on('close', (event) => {
    const settings = SettingsRepository.get()
    const shouldCloseToTray =
      settings.system?.closeToTray &&
      settings.system?.showTrayIcon !== false &&
      !(app as any).isQuitting

    if (shouldCloseToTray) {
      event.preventDefault()
      mainWindow?.hide()
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
    return win
  }

  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true)
  }

  if (win.isFullScreen() && !win.isVisible()) {
    win.setFullScreen(false)
  }

  win.show()
  win.focus()

  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(false)
  }

  return win
}
