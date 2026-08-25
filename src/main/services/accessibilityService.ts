import { systemPreferences, shell } from 'electron'
import { eventBus } from '../events/eventBus'
import { SettingsRepository } from '../db/repositories/settingsRepository'
import { SelectionService } from './selectionService'

export class AccessibilityService {
  private static lastTrustedState: boolean | null = null

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
   * 校验当前划词助手权限状态并进行无缝自动恢复与保护
   * 
   * 优化策略：
   * 1. 绝对不篡改用户的数据库配置（不将 settings.selection.enabled 强制置为 false）。
   * 2. 当检测到用户在系统偏好中完成授权时，自动无缝启动 SelectionService。
   * 3. 当检测到权限被关闭时，仅暂时停止后台监听，待用户授权后自动唤醒。
   */
  static verifyAndSyncState(): boolean {
    if (process.platform !== 'darwin') {
      return true
    }

    const trusted = this.isTrusted(false)
    const settings = SettingsRepository.get()
    const isEnabledInSettings = Boolean(settings?.selection?.enabled)

    if (isEnabledInSettings) {
      if (trusted) {
        // 权限有效：如果服务未运行，则自动唤醒启动
        if (!SelectionService.getIsRunning()) {
          console.log('[Accessibility] Permission confirmed. Auto-starting SelectionService.')
          SelectionService.start()
        }
        if (this.lastTrustedState === false) {
          eventBus.broadcastToAllWindows('system:accessibility-granted', {
            status: 'ready'
          })
        }
      } else {
        // 权限尚未授予或被移除：停止底层监听，但不篡改用户设置
        if (SelectionService.getIsRunning()) {
          console.warn('[Accessibility] Permission not granted/lost. Pausing SelectionService.')
          SelectionService.stop()
        }
        if (this.lastTrustedState !== false) {
          eventBus.broadcastToAllWindows('system:accessibility-lost', {
            reason: 'permission_revoked'
          })
        }
      }
    }

    this.lastTrustedState = trusted
    return trusted
  }
}
