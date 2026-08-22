import { BrowserWindow } from 'electron'

const isMac = process.platform === 'darwin'

export interface WindowQuirks {
  macRestoreFocusOnHide?: boolean
  macClearHoverOnHide?: boolean
  reapplyAlwaysOnTop?: boolean
}

/**
 * macOS 焦点与窗口层级隔离机制
 * 解决 macOS 下浮窗隐藏/关闭时，系统错误将后台主工作台激活并拉到最前的底层系统行为。
 */
export function applyWindowQuirks(
  window: BrowserWindow,
  quirks?: WindowQuirks,
  alwaysOnTopLevel: 'screen-saver' | 'floating' | 'status' | 'pop-up-menu' = 'floating'
): void {
  if (!quirks) return

  // ── macRestoreFocusOnHide + macClearHoverOnHide ──────────────────────
  if (isMac && (quirks.macRestoreFocusOnHide || quirks.macClearHoverOnHide)) {
    const originalHide = window.hide.bind(window)
    const originalClose = window.close.bind(window)

    window.hide = () => {
      const guard = quirks.macRestoreFocusOnHide ? beginMacFocusGuard() : null
      originalHide()
      if (quirks.macClearHoverOnHide && !window.isDestroyed()) {
        try {
          window.webContents.sendInputEvent({ type: 'mouseMove', x: -1, y: -1 })
        } catch {
          // ignore
        }
      }
      if (guard) endMacFocusGuard(guard)
    }

    if (quirks.macRestoreFocusOnHide) {
      window.close = () => {
        const guard = beginMacFocusGuard()
        originalClose()
        endMacFocusGuard(guard)
      }
    }
  }

  // ── reapplyAlwaysOnTop ───────────────────────────────────────────────
  if (quirks.reapplyAlwaysOnTop) {
    const originalShow = window.show.bind(window)
    const originalShowInactive = window.showInactive.bind(window)
    const reapply = () => {
      if (window.isDestroyed()) return
      if (isMac) {
        window.setAlwaysOnTop(true, alwaysOnTopLevel)
      } else {
        window.setAlwaysOnTop(true)
      }
    }
    window.show = () => {
      originalShow()
      reapply()
    }
    window.showInactive = () => {
      originalShowInactive()
      reapply()
    }
  }
}

/**
 * [macOS Focus Guard]
 * 在浮窗隐藏/关闭前，临时将当前应用内所有可见窗口（包括主工作台）置为不可聚焦 (setFocusable(false))，
 * 彻底切断 macOS 尝试将焦点转移给主工作台并将其拉到前台的系统级逻辑。
 */
function beginMacFocusGuard(): BrowserWindow[] {
  const focusableWindows: BrowserWindow[] = []
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && window.isVisible()) {
      if (window.isFocusable()) {
        focusableWindows.push(window)
        window.setFocusable(false)
      }
    }
  }
  return focusableWindows
}

/**
 * 50ms 后恢复所有窗口的可聚焦状态（此时 macOS 已成功将系统焦点交还给第三方软件如 VS Code / Safari）
 */
function endMacFocusGuard(focusableWindows: BrowserWindow[]): void {
  setTimeout(() => {
    for (const window of focusableWindows) {
      if (!window.isDestroyed()) {
        window.setFocusable(true)
      }
    }
  }, 50)
}
