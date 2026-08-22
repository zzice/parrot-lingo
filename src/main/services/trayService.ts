import { Tray, Menu, nativeImage, nativeTheme, app, type NativeImage } from 'electron'
import { showMainWindow } from '../windows/mainWindow'
import { SettingsRepository } from '../db/repositories/settingsRepository'
import { eventBus, EVENT_NAMES } from '../events/eventBus'
import { SelectionService } from './selectionService'
import type { AppSettings } from '../../renderer/src/types'

import icon from '../../../build/tray_icon.png?asset'
import iconDark from '../../../build/tray_icon_dark.png?asset'
import iconLight from '../../../build/tray_icon_light.png?asset'

const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'

let tray: Tray | null = null

export class TrayService {
  static createTray(): Tray {
    if (tray && !tray.isDestroyed()) {
      return tray
    }

    try {
      const initialImage = this.getTrayImage()
      tray = new Tray(initialImage)
      tray.setToolTip('ParrotLingo - 语言学习与翻译助手')

      // 监听系统主题变化自动更新图标
      nativeTheme.on('updated', () => {
        this.updateTrayImage()
      })

      // 单击托盘：显示工作台页面
      const handleShowWorkbench = () => {
        const win = showMainWindow()
        win.webContents.send('nav:navigate', 'corpus')
      }

      tray.on('click', () => {
        handleShowWorkbench()
      })

      // 双击托盘 或 右键托盘：显示精简菜单 (1:1 还原用户截图)
      const handlePopMenu = () => {
        const menu = this.buildMenu()
        tray?.popUpContextMenu(menu)
      }

      tray.on('double-click', () => {
        handlePopMenu()
      })

      tray.on('right-click', () => {
        handlePopMenu()
      })
    } catch (err) {
      console.error('[TrayService] Failed to create tray:', err)
    }

    return tray!
  }

  // 构建快捷菜单
  static buildMenu(): Menu {
    const settings = SettingsRepository.get()
    const isSelectionEnabled = settings.selection?.enabled ?? true

    return Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          const win = showMainWindow()
          win.webContents.send('nav:navigate', 'corpus')
        }
      },
      {
        label: `划词助手 - ${isSelectionEnabled ? 'On' : 'Off'}`,
        click: () => {
          const newStatus = !isSelectionEnabled
          SettingsRepository.update({
            selection: {
              ...settings.selection,
              enabled: newStatus
            }
          })
          SelectionService.syncWithSettings()
          eventBus.broadcastToAllWindows(EVENT_NAMES.SETTINGS_CHANGED, SettingsRepository.get())
        }
      },

      {
        type: 'separator'
      },
      {
        label: '退出',
        click: () => {
          app.quit()
        }
      }
    ])
  }

  private static getTrayImage(): NativeImage {
    const iconPath = isMac ? (nativeTheme.shouldUseDarkColors ? iconLight : iconDark) : icon

    const image = nativeImage.createFromPath(iconPath)

    if (isMac) {
      const resized = image.resize({ height: 18, quality: 'best' })
      resized.setTemplateImage(true)
      return resized
    } else if (isLinux) {
      return image.resize({ height: 18, quality: 'best' })
    }

    return image
  }

  static updateTrayImage(): void {
    if (!tray || tray.isDestroyed()) return
    const image = this.getTrayImage()
    tray.setImage(image)
  }

  static destroyTray(): void {
    if (tray) {
      try {
        if (!tray.isDestroyed()) {
          tray.destroy()
        }
      } catch (err) {
        console.error('[TrayService] Error destroying tray:', err)
      }
      tray = null
    }
  }

  static syncWithSettings(currentSettings?: AppSettings): void {
    const settings = currentSettings || SettingsRepository.get()
    const showTray = settings?.system?.showTrayIcon !== false
    if (showTray) {
      this.createTray()
    } else {
      this.destroyTray()
    }
  }
}
