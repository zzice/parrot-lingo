import { globalShortcut } from 'electron'
import { SettingsRepository } from '../db/repositories/settingsRepository'
import { SelectionService } from './selectionService'

export class ShortcutService {
  private static registeredShortcut: string | null = null

  static registerGlobalShortcuts() {
    this.unregisterAll()
    const settings = SettingsRepository.get()

    // 仅在开启划词助手 且 取词方式明确为快捷键模式（shortcut）时才注册全局快捷键
    if (!settings.selection.enabled || settings.selection.captureMethod !== 'shortcut') {
      return
    }

    const shortcut = settings.selection.shortcutKey || 'Alt+S'

    try {
      const success = globalShortcut.register(shortcut, () => {
        SelectionService.processSelectTextByShortcut()
      })

      if (success) {
        this.registeredShortcut = shortcut
        console.log(`[Shortcut] Successfully registered global shortcut: ${shortcut}`)
      } else {
        console.warn(`[Shortcut] Failed to register shortcut: ${shortcut}`)
      }
    } catch (e) {
      console.error(`[Shortcut] Error registering shortcut:`, e)
    }
  }

  static unregisterAll() {
    if (this.registeredShortcut) {
      globalShortcut.unregister(this.registeredShortcut)
      this.registeredShortcut = null
    }
  }
}
