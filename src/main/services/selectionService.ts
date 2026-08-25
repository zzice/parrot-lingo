import { clipboard, screen, systemPreferences } from 'electron'
import { SettingsRepository } from '../db/repositories/settingsRepository'
import {
  showToolbarWindow,
  hideToolbarWindow,
  isToolbarVisible,
  getToolbarWindowBounds
} from '../windows/toolbarWindow'
import { eventBus } from '../events/eventBus'

// Type definitions for selection-hook
type SelectionHookConstructor = any
type SelectionHookInstance = any
type TextSelectionData = any
type MouseEventData = any

let SelectionHook: SelectionHookConstructor | null = null

type Point = { x: number; y: number }
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

export class SelectionService {
  private static selectionHook: SelectionHookInstance | null = null
  private static isRunning = false
  private static isHideListenerActive = false
  private static lastActiveAppName = ''

  private static TOOLBAR_WIDTH = 460
  private static TOOLBAR_HEIGHT = 52

  public static getLastActiveApp(): string {
    return this.lastActiveAppName
  }

  public static getIsRunning(): boolean {
    return this.isRunning
  }

  public static restart(): void {
    console.log('[SelectionService] Restarting selection service...')
    this.stop()
    this.syncWithSettings()
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  static syncWithSettings(): void {
    const settings = SettingsRepository.get()
    const enabled = Boolean(settings?.selection?.enabled)
    const captureMethod = settings?.selection?.captureMethod ?? 'selection'
    const isTrusted = this.isTrusted()

    console.log('[SelectionService] syncWithSettings →', { enabled, captureMethod, isTrusted })

    if (enabled) {
      if (process.platform === 'darwin' && !isTrusted) {
        console.warn('[SelectionService] ⚠️ macOS 辅助功能权限未授权，无法启动。')
        this.stop()
        return
      }
      this.start()
      // 如果是快捷键模式，设置 passive 模式，鼠标划选时不自动弹出工具栏；按快捷键时再触发
      if (this.selectionHook) {
        try {
          this.selectionHook.setSelectionPassiveMode(captureMethod === 'shortcut')
        } catch (e) {
          console.error('[SelectionService] Failed to setSelectionPassiveMode:', e)
        }
      }
    } else {
      this.stop()
    }
  }

  static processSelectTextByShortcut(): void {
    if (!this.isRunning) {
      this.start()
    }
    if (this.selectionHook) {
      try {
        const selectionData = this.selectionHook.getCurrentSelection()
        if (selectionData?.text) {
          this.processTextSelection(selectionData)
          return
        }
      } catch (e) {
        console.error('[SelectionService] getCurrentSelection error:', e)
      }
    }

    // 备用：从剪贴板读取
    const clipText = clipboard.readText('clipboard') || ''
    if (clipText.trim()) {
      const cursor = screen.getCursorScreenPoint()
      showToolbarWindow(
        clipText.trim(),
        cursor,
        this.TOOLBAR_WIDTH,
        this.TOOLBAR_HEIGHT,
        'bottomMiddle'
      )
      eventBus.broadcastToAllWindows('selection.text_selected', { text: clipText.trim() })
      this.startHideListeners()
    }
  }

  static start(): void {
    if (this.isRunning) return

    try {
      if (!SelectionHook) {
        SelectionHook = require('selection-hook')
      }

      if (!this.selectionHook) {
        this.selectionHook = new SelectionHook()
      }

      this.selectionHook.on('text-selection', this.processTextSelection)
      this.selectionHook.on('error', (err: any) => {
        console.error('[SelectionService] selection-hook error:', err)
      })

      if (!this.selectionHook.start({ debug: false })) {
        throw new Error('Failed to start selection-hook')
      }

      this.isRunning = true
      console.log('[SelectionService] selection-hook started successfully.')
    } catch (err) {
      console.error('[SelectionService] Failed to start:', err)
      this.isRunning = false
    }
  }

  static stop(): void {
    if (!this.isRunning && !this.selectionHook) return
    try {
      this.stopHideListeners()
      if (this.selectionHook) {
        this.selectionHook.removeAllListeners()
        if (typeof this.selectionHook.stop === 'function') {
          this.selectionHook.stop()
        }
        if (typeof this.selectionHook.cleanup === 'function') {
          try {
            this.selectionHook.cleanup()
          } catch (cleanErr) {
            console.warn('[SelectionService] cleanup error:', cleanErr)
          }
        }
        this.selectionHook = null
      }
      this.isRunning = false
      console.log('[SelectionService] selection-hook stopped.')
    } catch (err) {
      console.error('[SelectionService] Failed to stop:', err)
    }
  }

  private static lastSelectionTime = 0

  // ─── Text selection handler ────────────────────────────────────────────────

  private static processTextSelection = (selectionData: TextSelectionData): void => {
    if (!selectionData?.text || !selectionData.text.trim()) return

    const settings = SettingsRepository.get()
    if (!settings?.selection?.enabled) {
      this.stop()
      return
    }

    // 应用黑白名单过滤
    if (!this.shouldProcess(selectionData, settings)) return

    this.lastSelectionTime = Date.now()

    // 记录触发划词的原生应用名称 (优先使用 appName / 友好的应用程序名，例如 Google Chrome, Cursor, Safari 等)
    const rawApp =
      selectionData.appName || selectionData.processName || selectionData.programName || ''
    this.lastActiveAppName = this.formatAppName(rawApp)

    // 计算工具栏位置
    const { refPoint, orientation } = this.calcPosition(selectionData)

    // 显示工具栏
    showToolbarWindow(
      selectionData.text.trim(),
      refPoint,
      this.TOOLBAR_WIDTH,
      this.TOOLBAR_HEIGHT,
      orientation
    )

    // 将选中文本及来源应用通知给工具栏渲染进程
    eventBus.broadcastToAllWindows('selection.text_selected', {
      text: selectionData.text.trim(),
      context: selectionData.context,
      sourceApp: this.lastActiveAppName
    })

    // 延迟 200ms 启动隐藏监听（防划词释放瞬间残留的 mouse-down 误触导致工具栏瞬间被销毁）
    setTimeout(() => {
      this.startHideListeners()
    }, 200)
  }

  // ─── Positioning ──────────────────────────────────────────────────────────

  private static isSamePoint(point1: Point, point2: Point): boolean {
    return point1.x === point2.x && point1.y === point2.y
  }

  private static isSameLineWithRectPoint(
    startTop: Point,
    startBottom: Point,
    endTop: Point,
    endBottom: Point
  ): boolean {
    return startTop.y === endTop.y && startBottom.y === endBottom.y
  }

  private static calcPosition(selectionData: TextSelectionData): {
    refPoint: Point
    orientation: RelativeOrientation
  } {
    const posLevel = selectionData.posLevel
    // posLevel 0 = NONE, 1 = MOUSE_SINGLE, 2 = MOUSE_DUAL, 3+ = SEL_FULL/DETAILED
    let refPoint: Point = { x: 0, y: 0 }
    let isLogical = false
    let orientation: RelativeOrientation = 'bottomMiddle'

    if (!SelectionHook) return { refPoint, orientation }

    switch (posLevel) {
      case SelectionHook.PositionLevel?.NONE:
      case 0: {
        const cursor = screen.getCursorScreenPoint()
        refPoint = { x: cursor.x, y: cursor.y }
        orientation = 'bottomMiddle'
        isLogical = true
        break
      }
      case SelectionHook.PositionLevel?.MOUSE_SINGLE:
      case 1: {
        refPoint = {
          x: selectionData.mousePosEnd?.x ?? 0,
          y: (selectionData.mousePosEnd?.y ?? 0) + 16
        }
        orientation = 'bottomMiddle'
        break
      }
      case SelectionHook.PositionLevel?.MOUSE_DUAL:
      case 2: {
        const dy = (selectionData.mousePosEnd?.y ?? 0) - (selectionData.mousePosStart?.y ?? 0)
        const dx = (selectionData.mousePosEnd?.x ?? 0) - (selectionData.mousePosStart?.x ?? 0)
        if (Math.abs(dy) > 14) {
          if (dy > 0) {
            refPoint = {
              x: selectionData.mousePosEnd?.x ?? 0,
              y: (selectionData.mousePosEnd?.y ?? 0) + 16
            }
            orientation = 'bottomLeft'
          } else {
            refPoint = {
              x: selectionData.mousePosEnd?.x ?? 0,
              y: (selectionData.mousePosEnd?.y ?? 0) - 16
            }
            orientation = 'topRight'
          }
        } else {
          if (dx > 0) {
            refPoint = {
              x: selectionData.mousePosEnd?.x ?? 0,
              y:
                Math.max(selectionData.mousePosEnd?.y ?? 0, selectionData.mousePosStart?.y ?? 0) +
                16
            }
            orientation = 'bottomLeft'
          } else {
            refPoint = {
              x: selectionData.mousePosEnd?.x ?? 0,
              y:
                Math.min(selectionData.mousePosEnd?.y ?? 0, selectionData.mousePosStart?.y ?? 0) +
                16
            }
            orientation = 'bottomRight'
          }
        }
        break
      }
      default: {
        // SEL_FULL / SEL_DETAILED
        const isNoMouse =
          !selectionData.mousePosStart ||
          (!selectionData.mousePosStart.x &&
            !selectionData.mousePosStart.y &&
            !selectionData.mousePosEnd?.x &&
            !selectionData.mousePosEnd?.y)

        if (isNoMouse) {
          const endBottom = selectionData.endBottom ?? { x: 0, y: 0 }
          refPoint = { x: endBottom.x, y: endBottom.y + 4 }
          orientation = 'bottomLeft'
          break
        }

        const isDoubleClick =
          selectionData.mousePosStart &&
          selectionData.mousePosEnd &&
          this.isSamePoint(selectionData.mousePosStart, selectionData.mousePosEnd)

        const isSameLine =
          selectionData.startTop &&
          selectionData.startBottom &&
          selectionData.endTop &&
          selectionData.endBottom &&
          this.isSameLineWithRectPoint(
            selectionData.startTop,
            selectionData.startBottom,
            selectionData.endTop,
            selectionData.endBottom
          )

        // 双击选词且在同一行：贴近选区底部居中
        if (isDoubleClick && isSameLine) {
          refPoint = {
            x: selectionData.mousePosEnd.x,
            y: (selectionData.endBottom?.y ?? 0) + 4
          }
          orientation = 'bottomMiddle'
          break
        }

        // 同一行划选
        if (isSameLine) {
          const direction =
            (selectionData.mousePosEnd?.x ?? 0) - (selectionData.mousePosStart?.x ?? 0)
          if (direction > 0) {
            refPoint = {
              x: selectionData.endBottom?.x ?? 0,
              y: (selectionData.endBottom?.y ?? 0) + 4
            }
            orientation = 'bottomLeft'
          } else {
            refPoint = {
              x: selectionData.startBottom?.x ?? 0,
              y: (selectionData.startBottom?.y ?? 0) + 4
            }
            orientation = 'bottomRight'
          }
          break
        }

        // 多行划选：根据鼠标垂直滑动方向决定靠下还是靠上
        const direction =
          (selectionData.mousePosEnd?.y ?? 0) - (selectionData.mousePosStart?.y ?? 0)
        if (direction > 0) {
          refPoint = {
            x: selectionData.endBottom?.x ?? 0,
            y: (selectionData.endBottom?.y ?? 0) + 4
          }
          orientation = 'bottomLeft'
        } else {
          refPoint = {
            x: selectionData.startTop?.x ?? 0,
            y: (selectionData.startTop?.y ?? 0) - 4
          }
          orientation = 'topRight'
        }
        break
      }
    }

    // 如果未获取到有效坐标（例如 Linux/macOS 返回 INVALID_COORDINATE = -99999），兜底使用当前鼠标光标位置
    if (refPoint.x < -90000 || refPoint.y < -90000 || (refPoint.x === 0 && refPoint.y === 0)) {
      const cursor = screen.getCursorScreenPoint()
      refPoint = { x: cursor.x, y: cursor.y }
      orientation = 'bottomMiddle'
      isLogical = true
    }

    // [Windows/Linux] selection-hook 返回物理像素 (Physical Pixels)，需转换为 Electron 逻辑像素 (DIP)
    if (!isLogical && (process.platform === 'win32' || process.platform === 'linux')) {
      const dipPoint = screen.screenToDipPoint(refPoint)
      refPoint = { x: Math.round(dipPoint.x), y: Math.round(dipPoint.y) }
    }

    return { refPoint, orientation }
  }

  // ─── Filter ───────────────────────────────────────────────────────────────

  private static shouldProcess(selectionData: TextSelectionData, settings: any): boolean {
    if (!settings?.selection?.enabled) {
      return false
    }

    const filterMode = settings?.selection?.filterMode ?? 'blacklist'
    const blacklist: string[] = settings?.selection?.blacklistApps ?? []
    const whitelist: string[] = settings?.selection?.whitelistApps ?? []

    const programName = (selectionData.programName ?? '').toLowerCase()

    if (filterMode === 'blacklist' && blacklist.length > 0) {
      return !blacklist.some((item: string) => programName.includes(item.toLowerCase()))
    }
    if (filterMode === 'whitelist' && whitelist.length > 0) {
      return whitelist.some((item: string) => programName.includes(item.toLowerCase()))
    }
    return true
  }

  // ─── Auto-hide listeners ───────────────────────────────────────────────────

  private static startHideListeners(): void {
    if (this.isHideListenerActive || !this.selectionHook) return

    this.selectionHook.on('mouse-down', this.handleMouseDownHide)
    this.selectionHook.on('mouse-wheel', this.handleMouseWheelHide)
    this.selectionHook.on('key-down', this.handleKeyDownHide)
    this.isHideListenerActive = true
  }

  private static stopHideListeners(): void {
    if (!this.isHideListenerActive || !this.selectionHook) return

    this.selectionHook.off('mouse-down', this.handleMouseDownHide)
    this.selectionHook.off('mouse-wheel', this.handleMouseWheelHide)
    this.selectionHook.off('key-down', this.handleKeyDownHide)
    this.isHideListenerActive = false
  }

  private static handleMouseWheelHide = (): void => {
    hideToolbarWindow()
    this.stopHideListeners()
  }

  private static handleMouseDownHide = (data: MouseEventData): void => {
    // 划词后 250ms 内忽略外部点击，防止双击或拖拽余震误关闭
    if (Date.now() - this.lastSelectionTime < 250) return
    if (!isToolbarVisible()) return

    const bounds = getToolbarWindowBounds()
    if (!bounds) return

    // [Windows/Linux] selection-hook 返回物理像素，需转为逻辑像素后进行窗口包围盒碰撞检测
    const rawPoint = { x: data.x, y: data.y }
    const mousePoint =
      process.platform === 'win32' || process.platform === 'linux'
        ? screen.screenToDipPoint(rawPoint)
        : rawPoint

    const inside =
      mousePoint.x >= bounds.x &&
      mousePoint.x <= bounds.x + bounds.width &&
      mousePoint.y >= bounds.y &&
      mousePoint.y <= bounds.y + bounds.height

    if (!inside) {
      hideToolbarWindow()
      this.stopHideListeners()
    }
  }

  private static handleKeyDownHide = (): void => {
    hideToolbarWindow()
    this.stopHideListeners()
  }

  // ─── Clipboard write (for copy button in toolbar) ─────────────────────────

  static writeToClipboard(text: string): boolean {
    try {
      clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  // ─── Toolbar size feedback ─────────────────────────────────────────────────

  static determineToolbarSize(width: number, height: number): void {
    if (width > 0 && width !== this.TOOLBAR_WIDTH) {
      this.TOOLBAR_WIDTH = Math.ceil(width)
    }
    if (height > 0) {
      this.TOOLBAR_HEIGHT = Math.ceil(height)
    }
  }

  // ─── Accessibility ────────────────────────────────────────────────────────

  static isTrusted(prompt = false): boolean {
    if (process.platform !== 'darwin') return true
    return systemPreferences.isTrustedAccessibilityClient(prompt)
  }

  static hideToolbar(): void {
    hideToolbarWindow()
    this.stopHideListeners()
  }

  private static formatAppName(raw: string): string {
    if (!raw) return ''
    const trimmed = raw.trim()
    if (!trimmed) return ''

    const bundleMap: Record<string, string> = {
      'com.google.chrome': 'Google Chrome',
      'com.google.chrome.canary': 'Google Chrome Canary',
      'com.apple.safari': 'Safari',
      'com.apple.notes': '备忘录',
      'com.apple.mail': '邮件',
      'com.apple.textedit': '文本编辑',
      'com.apple.preview': '预览',
      'com.apple.terminal': '终端',
      'com.apple.finder': '访达',
      'com.todesktop.230313mzl4w4u92': 'Cursor',
      'com.cursor.cursor': 'Cursor',
      cursor: 'Cursor',
      'com.microsoft.vscode': 'VS Code',
      'com.microsoft.vscodeinsiders': 'VS Code Insiders',
      code: 'VS Code',
      'com.tinyspeck.slackmacgap': 'Slack',
      slack: 'Slack',
      'com.jetbrains.intellij': 'IntelliJ IDEA',
      'com.jetbrains.pycharm': 'PyCharm',
      'com.jetbrains.webstorm': 'WebStorm',
      'company.thebrowser.browser': 'Arc',
      'com.brave.browser': 'Brave',
      'org.mozilla.firefox': 'Firefox',
      'com.microsoft.edgemac': 'Microsoft Edge',
      'notion.id': 'Notion',
      'com.electron.notion': 'Notion',
      'com.linear': 'Linear',
      'com.tencent.xinwechat': '微信',
      'com.feishu.feishu': '飞书',
      'com.alibaba.dingtalkmac': '钉钉'
    }

    const lower = trimmed.toLowerCase()
    if (bundleMap[lower]) {
      return bundleMap[lower]
    }

    if (trimmed.includes('.')) {
      const parts = trimmed.split('.')
      const lastPart = parts[parts.length - 1]
      if (lastPart && lastPart.length > 1) {
        if (lower.startsWith('com.google.')) {
          return `Google ${lastPart}`
        }
        if (lower.startsWith('com.apple.')) {
          return lastPart
        }
        if (lower.startsWith('com.microsoft.')) {
          return `Microsoft ${lastPart}`
        }
        return lastPart
      }
    }

    return trimmed
  }
}
