import { app, BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { EVENT_NAMES } from '../events/eventBus'
import { SettingsRepository } from '../db/repositories/settingsRepository'
import { getLastToolbarBounds } from './toolbarWindow'
import { SelectionService } from '../services/selectionService'
import { applyWindowQuirks } from './windowQuirks'

const activeSelectionWindows = new Set<BrowserWindow>()
const pinnedWindows = new WeakSet<BrowserWindow>()
const windowInitDataMap = new Map<
  number,
  { text: string; context?: string; action?: string; sourceApp?: string }
>()

let lastActionWindowSize = { width: 480, height: 480 }

const DEFAULT_WIDTH = 480
const DEFAULT_HEIGHT = 480

export function createSelectionWindow(): BrowserWindow {
  const settings = SettingsRepository.get()
  const rememberSize = Boolean(settings?.selection?.rememberSize)
  const isAutoPin = Boolean(settings?.selection?.autoPin)
  const opacity = Math.max(0.2, (settings?.selection?.opacity ?? 100) / 100)

  const initialWidth = rememberSize ? lastActionWindowSize.width : DEFAULT_WIDTH
  const initialHeight = rememberSize ? lastActionWindowSize.height : DEFAULT_HEIGHT

  const win = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    minWidth: 360,
    minHeight: 280,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    resizable: true,
    hasShadow: false,
    thickFrame: false,
    title: '解释 - ParrotLingo',
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : undefined,
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 11 } : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 应用原生 quirks 焦点保护 (macRestoreFocusOnHide)
  applyWindowQuirks(win, {
    macRestoreFocusOnHide: true
  })

  win.setOpacity(opacity)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/selection.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/selection.html'))
  }

  // 拦截全部 window.open，强制调用系统默认外部浏览器打开（防止在应用内部弹出 Electron 窗口）
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const webContentsId = win.webContents.id

  // 记录窗口大小（当开启记住大小时）
  win.on('resize', () => {
    if (win.isDestroyed()) return
    const bounds = win.getBounds()
    const curSettings = SettingsRepository.get()
    if (curSettings?.selection?.rememberSize) {
      lastActionWindowSize = { width: bounds.width, height: bounds.height }
    }
  })

  // 拦截关闭事件，转为安全隐藏（防止窗口销毁与 macOS 触发应用激活导致工作台弹出）
  win.on('close', (event) => {
    if (!(app as unknown as { isQuitting?: boolean }).isQuitting) {
      event.preventDefault()
      hideSelectionWindow(win)
    }
  })

  // 失去焦点时自动隐藏 (受 autoClose 和 isPinned 控制)
  win.on('blur', () => {
    if (win.isDestroyed()) return
    const curSettings = SettingsRepository.get()
    const autoClose = Boolean(curSettings?.selection?.autoClose)
    const isPinned = pinnedWindows.has(win)

    if (autoClose && !isPinned) {
      hideSelectionWindow(win)
    }
  })

  win.on('closed', () => {
    try {
      windowInitDataMap.delete(webContentsId)
      activeSelectionWindows.delete(win)
    } catch {
      // 忽略窗口关闭时的清理异常
    }
  })

  if (isAutoPin) {
    pinnedWindows.add(win)
  }

  activeSelectionWindows.add(win)
  return win
}

/**
 * 获取可用的功能窗口（支持多窗口）：
 * - 如果已有未置顶的窗口，复用该窗口
 * - 如果已有窗口都处于置顶锁定状态（pinnedWindows.has(win) === true），则新建一个独立窗口，使多个置顶窗口可同时存在
 */
export function getOrCreateAvailableWindow(): BrowserWindow {
  for (const win of activeSelectionWindows) {
    if (!win.isDestroyed()) {
      // 只要该窗口未显示，或者虽然显示但未处于锁定置顶状态，就可以复用
      if (!win.isVisible() || !pinnedWindows.has(win)) {
        return win
      }
    }
  }
  // 所有现存窗口都在置顶使用中，创建新窗口
  return createSelectionWindow()
}

export function showSelectionWindowWithText(
  text: string,
  context?: string,
  action?: string,
  sourceApp?: string
): void {
  const win = getOrCreateAvailableWindow()
  const settings = SettingsRepository.get()

  // 1. 记住大小控制
  const rememberSize = Boolean(settings?.selection?.rememberSize)
  let winWidth = rememberSize ? lastActionWindowSize.width : DEFAULT_WIDTH
  let winHeight = rememberSize ? lastActionWindowSize.height : DEFAULT_HEIGHT

  // 2. 物理窗口层级始终为 floating，杜绝落入普通窗口层级带出工作台；置顶锁定业务状态由 pinnedWindows 维护
  const isAutoPin = Boolean(settings?.selection?.autoPin)
  if (isAutoPin) {
    pinnedWindows.add(win)
  } else {
    pinnedWindows.delete(win)
  }
  win.setAlwaysOnTop(true, 'floating')

  // 3. 透明度控制
  const opacity = Math.max(0.2, (settings?.selection?.opacity ?? 100) / 100)
  win.setOpacity(opacity)

  // 4. 跟随工具栏 / 居中显示 定位计算
  const followToolbar = settings?.selection?.followToolbar !== false

  const lastToolbarBounds = getLastToolbarBounds()

  const cursor = screen.getCursorScreenPoint()
  const display =
    followToolbar && lastToolbarBounds.x > 0
      ? screen.getDisplayNearestPoint({ x: lastToolbarBounds.x, y: lastToolbarBounds.y })
      : screen.getDisplayNearestPoint(cursor)

  const workArea = display.workArea
  const GAP = 6

  // 限制窗口尺寸在屏幕工作区内
  if (winWidth > workArea.width - 2 * GAP) {
    winWidth = workArea.width - 2 * GAP
  }
  if (winHeight > workArea.height - 2 * GAP) {
    winHeight = workArea.height - 2 * GAP
  }

  let posX: number
  let posY: number

  if (followToolbar && lastToolbarBounds.x > 0) {
    // 跟随工具栏：水平居中对齐工具栏，垂直排列在其下方 (若下方放不下则移至上方)
    posX = Math.round(lastToolbarBounds.x + (lastToolbarBounds.width - winWidth) / 2)
    posY = Math.round(lastToolbarBounds.y + lastToolbarBounds.height + GAP)

    // 边界检测
    if (posX + winWidth > workArea.x + workArea.width) {
      posX = workArea.x + workArea.width - winWidth - GAP
    } else if (posX < workArea.x) {
      posX = workArea.x + GAP
    }

    if (posY + winHeight > workArea.y + workArea.height) {
      posY = lastToolbarBounds.y - winHeight - GAP
    }
    if (posY < workArea.y) {
      posY = workArea.y + GAP
    }
  } else {
    // 居中显示：在当前屏幕工作区正中央居中显示
    posX = Math.round(workArea.x + (workArea.width - winWidth) / 2)
    posY = Math.round(workArea.y + (workArea.height - winHeight) / 2)
  }

  // 如果新窗口位置与已有置顶窗口完全重合，略微偏移 28px，避免完全重叠遮挡
  for (const otherWin of activeSelectionWindows) {
    if (otherWin !== win && !otherWin.isDestroyed() && otherWin.isVisible()) {
      const b = otherWin.getBounds()
      if (Math.abs(b.x - posX) < 10 && Math.abs(b.y - posY) < 10) {
        posX = Math.min(workArea.x + workArea.width - winWidth - GAP, posX + 28)
        posY = Math.min(workArea.y + workArea.height - winHeight - GAP, posY + 28)
      }
    }
  }

  win.setPosition(posX, posY, false)
  win.setBounds({ x: posX, y: posY, width: winWidth, height: winHeight })

  const actionTitle = action === 'translate' ? '翻译' : '解释'
  win.setTitle(`${actionTitle} - ParrotLingo`)

  const finalSourceApp = sourceApp || SelectionService.getLastActiveApp() || undefined
  const payload = { text, context, action, sourceApp: finalSourceApp }

  if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
    windowInitDataMap.set(win.webContents.id, payload)

    // 优先向渲染进程发送数据，确保 React 在窗口展示前已开始重置并准备新内容
    if (!win.webContents.isLoading()) {
      win.webContents.send(EVENT_NAMES.SELECTION_TRIGGERED, payload)
    } else {
      win.webContents.once('did-finish-load', () => {
        if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
          win.webContents.send(EVENT_NAMES.SELECTION_TRIGGERED, payload)
        }
      })
    }

    // 窗口展示与焦点保护由 quirks 自动接管
    win.show()
  }
}

export function getSelectionWindowInitData(
  webContentsId: number
): { text: string; context?: string; action?: string; sourceApp?: string } | null {
  return windowInitDataMap.get(webContentsId) || null
}

export function hideSelectionWindow(targetWin?: BrowserWindow | null): void {
  if (targetWin && !targetWin.isDestroyed()) {
    if (!targetWin.webContents.isDestroyed()) {
      windowInitDataMap.delete(targetWin.webContents.id)
      targetWin.webContents.send(EVENT_NAMES.SELECTION_RESET)
    }
    targetWin.hide()
  } else {
    for (const win of activeSelectionWindows) {
      if (!win.isDestroyed()) {
        if (!win.webContents.isDestroyed()) {
          windowInitDataMap.delete(win.webContents.id)
          win.webContents.send(EVENT_NAMES.SELECTION_RESET)
        }
        win.hide()
      }
    }
  }
}

export function toggleSelectionWindowPin(targetWin?: BrowserWindow | null): boolean {
  const win = targetWin || Array.from(activeSelectionWindows).pop()
  if (win && !win.isDestroyed()) {
    const nextPin = !pinnedWindows.has(win)
    if (nextPin) {
      pinnedWindows.add(win)
    } else {
      pinnedWindows.delete(win)
    }
    win.setAlwaysOnTop(true, 'floating')
    return nextPin
  }
  return false
}

export function setSelectionWindowOpacity(opacity: number, targetWin?: BrowserWindow | null): void {
  const val = Math.max(0.2, Math.min(1.0, opacity / 100))
  if (targetWin && !targetWin.isDestroyed()) {
    targetWin.setOpacity(val)
    return
  }
  for (const win of activeSelectionWindows) {
    if (!win.isDestroyed()) {
      win.setOpacity(val)
    }
  }
}

export function getSelectionWindowPin(targetWin?: BrowserWindow | null): boolean {
  const win = targetWin || Array.from(activeSelectionWindows).pop()
  if (win && !win.isDestroyed()) {
    return pinnedWindows.has(win)
  }
  return false
}
