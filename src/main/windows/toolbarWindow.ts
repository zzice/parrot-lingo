/**
 * toolbarWindow.ts — 划词助手悬浮工具栏窗口
 *
 * 关键设计决策：
 * - transparent: true + focusable: false → 不抢焦点、不触发 blur 消失
 * - macOS 使用 showInactive() + setVisibleOnAllWorkspaces，确保全屏模式也能显示
 * - 工具栏加载独立的 toolbar.html（内联透明 CSS），不共享主应用 body 背景色
 * - 工具栏渲染完成后通过 IPC 汇报实际尺寸，主进程动态调整窗口 bounds
 */

import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { applyWindowQuirks } from './windowQuirks'

let toolbarWindow: BrowserWindow | null = null
let lastToolbarBounds: Electron.Rectangle = { x: 0, y: 0, width: 460, height: 48 }

export function getLastToolbarBounds(): Electron.Rectangle {
  if (toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isVisible()) {
    return toolbarWindow.getBounds()
  }
  return lastToolbarBounds
}

type RelativeOrientation =
  | 'topLeft'
  | 'topRight'
  | 'topMiddle'
  | 'bottomLeft'
  | 'bottomRight'
  | 'bottomMiddle'
  | 'middleLeft'
  | 'middleRight'
  | 'center'

type Point = { x: number; y: number }

export function createToolbarWindow(): BrowserWindow {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    return toolbarWindow
  }

  const isMac = process.platform === 'darwin'

  toolbarWindow = new BrowserWindow({
    width: 460,
    height: 48,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    movable: true,
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    focusable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // macOS：应用原生 quirks 焦点保护 (macRestoreFocusOnHide & reapplyAlwaysOnTop)
  applyWindowQuirks(
    toolbarWindow,
    {
      macRestoreFocusOnHide: true,
      macClearHoverOnHide: true,
      reapplyAlwaysOnTop: true
    },
    'screen-saver'
  )

  if (isMac) {
    toolbarWindow.setAlwaysOnTop(true, 'screen-saver')
  }

  // 加载独立的 toolbar.html（不再共享 index.html + hash 路由）
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    toolbarWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/toolbar.html`)
  } else {
    toolbarWindow.loadFile(join(__dirname, '../renderer/toolbar.html'))
  }

  toolbarWindow.on('closed', () => {
    toolbarWindow = null
  })

  return toolbarWindow
}

/**
 * 计算工具栏位置，并显示工具栏
 */
export function showToolbarWindow(
  _text: string,
  refPoint: Point,
  toolbarWidth: number,
  toolbarHeight: number,
  orientation: RelativeOrientation = 'bottomMiddle'
): void {
  const win = createToolbarWindow()

  const pos = calculateToolbarPosition(refPoint, orientation, toolbarWidth, toolbarHeight)

  lastToolbarBounds = { x: pos.x, y: pos.y, width: toolbarWidth, height: toolbarHeight }
  win.setPosition(pos.x, pos.y, false)
  win.setBounds({ x: pos.x, y: pos.y, width: toolbarWidth, height: toolbarHeight })

  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true
    })
    win.setAlwaysOnTop(true, 'screen-saver')
    win.showInactive()
  } else {
    win.setAlwaysOnTop(true)
    win.showInactive()
  }
}

/**
 * 根据参考点和方向计算工具栏屏幕坐标，并保证不超出屏幕边界
 */
function calculateToolbarPosition(
  refPoint: Point,
  orientation: RelativeOrientation,
  toolbarWidth: number,
  toolbarHeight: number
): Point {
  const pos: Point = { x: 0, y: 0 }

  switch (orientation) {
    case 'topLeft':
      pos.x = refPoint.x - toolbarWidth
      pos.y = refPoint.y - toolbarHeight
      break
    case 'topRight':
      pos.x = refPoint.x
      pos.y = refPoint.y - toolbarHeight
      break
    case 'topMiddle':
      pos.x = refPoint.x - toolbarWidth / 2
      pos.y = refPoint.y - toolbarHeight
      break
    case 'bottomLeft':
      pos.x = refPoint.x - toolbarWidth
      pos.y = refPoint.y
      break
    case 'bottomRight':
      pos.x = refPoint.x
      pos.y = refPoint.y
      break
    case 'bottomMiddle':
      pos.x = refPoint.x - toolbarWidth / 2
      pos.y = refPoint.y
      break
    case 'middleLeft':
      pos.x = refPoint.x - toolbarWidth
      pos.y = refPoint.y - toolbarHeight / 2
      break
    case 'middleRight':
      pos.x = refPoint.x
      pos.y = refPoint.y - toolbarHeight / 2
      break
    case 'center':
      pos.x = refPoint.x - toolbarWidth / 2
      pos.y = refPoint.y - toolbarHeight / 2
      break
  }

  // 屏幕边界限制
  const display = screen.getDisplayNearestPoint(refPoint)
  const workArea = display.workArea
  const GAP = 6

  const exceedsTop = pos.y < workArea.y
  const exceedsBottom = pos.y + toolbarHeight > workArea.y + workArea.height

  pos.x = Math.round(
    Math.max(workArea.x + GAP, Math.min(pos.x, workArea.x + workArea.width - toolbarWidth - GAP))
  )
  pos.y = Math.round(
    Math.max(workArea.y, Math.min(pos.y, workArea.y + workArea.height - toolbarHeight))
  )

  if (exceedsTop) pos.y = pos.y + 32
  if (exceedsBottom) pos.y = pos.y - 32

  return pos
}

export function hideToolbarWindow(): void {
  if (toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isVisible()) {
    toolbarWindow.hide()
  }
}

export function isToolbarVisible(): boolean {
  return !!(toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isVisible())
}

export function getToolbarWindowBounds(): {
  x: number
  y: number
  width: number
  height: number
} | null {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return null
  return toolbarWindow.getBounds()
}

/** 工具栏渲染进程反馈实际内容尺寸，主进程动态调整窗口 */
export function resizeToolbarWindow(width: number, height: number): void {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return
  const bounds = toolbarWindow.getBounds()
  toolbarWindow.setBounds({ ...bounds, width: Math.ceil(width), height: Math.ceil(height) })
}
