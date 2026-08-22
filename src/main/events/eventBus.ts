import { EventEmitter } from 'events'
import { BrowserWindow } from 'electron'

export const EVENT_NAMES = {
  CORPUS_UPDATED: 'corpus:updated',
  TODAY_UPDATED: 'today:updated',
  SETTINGS_CHANGED: 'settings:changed',
  PROVIDERS_CHANGED: 'providers:changed',
  SELECTION_TRIGGERED: 'selection:triggered',
  MODEL_SWITCHED: 'model:switched'
} as const

class AppEventBus extends EventEmitter {
  // 广播到所有已打开的渲染窗口
  public broadcastToAllWindows(channel: string, payload?: any) {
    this.emit(channel, payload)
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
        try {
          win.webContents.send(channel, payload)
        } catch {
          // 忽略已关闭或正在销毁的窗口通信
        }
      }
    })
  }
}

export const eventBus = new AppEventBus()
