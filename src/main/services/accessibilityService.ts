import { systemPreferences, shell } from 'electron'
import { eventBus } from '../events/eventBus'
import { SettingsRepository } from '../db/repositories/settingsRepository'

export class AccessibilityService {
  /**
   * 检查是否拥有 macOS 辅助功能权限
   * @param prompt 是否在未授权时触发 macOS 系统级授权弹窗
   */
  static isTrusted(prompt = false): boolean {
    if (process.platform !== 'darwin') {
      return true
    }
    return systemPreferences.isTrustedAccessibilityClient(prompt)
  }

  /**
   * 打开 macOS 系统设置中的辅助功能面板
   */
  static openSystemSettings(): void {
    if (process.platform === 'darwin') {
      shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
      )
    }
  }

  /**
   * 校验当前划词助手权限状态
   * 如果用户在系统设置中关闭了权限，则自动同步关闭应用内的划词助手状态并广播通知
   */
  static verifyAndSyncState(): boolean {
    const trusted = this.isTrusted(false)
    const settings = SettingsRepository.get()

    if (!trusted && settings.selection.enabled) {
      console.warn(
        '[Accessibility] Permission revoked by macOS system. Disabling selection assistant.'
      )
      SettingsRepository.update({
        selection: {
          ...settings.selection,
          enabled: false
        }
      })
      eventBus.broadcastToAllWindows('system:accessibility-lost', {
        reason: 'permission_revoked'
      })
      return false
    }

    return trusted
  }
}
