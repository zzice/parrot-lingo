import React from 'react'
import { Moon, Sun, Monitor, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/useAppStore'
import { ThemeMode, AppLanguage } from '../../types'
import { ThemeColorPicker } from '../../components/ThemeColorPicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select'
import { SUPPORTED_LANGUAGES } from '../../i18n'

/**
 * 视觉化主题预览卡片组件
 */
const ThemePreview: React.FC<{ mode: ThemeMode }> = ({ mode }) => {
  if (mode === 'system') {
    return (
      <div className="flex aspect-video w-full overflow-hidden rounded-md border border-slate-300 dark:border-slate-700 shadow-2xs">
        {/* 左半边：浅色预览 */}
        <div className="flex w-1/2 bg-slate-100">
          <div className="w-1/3 border-r border-slate-200 bg-white p-1 space-y-1">
            <div className="size-1.5 rounded-full bg-slate-400" />
            <div className="h-1 w-full rounded-full bg-slate-200" />
          </div>
          <div className="flex-1 p-1.5 space-y-1">
            <div className="h-1.5 w-3/4 rounded-full bg-slate-300" />
            <div className="h-1 w-full rounded-full bg-slate-200" />
            <div className="h-1 w-1/2 rounded-full bg-slate-200" />
          </div>
        </div>
        {/* 右半边：深色预览 */}
        <div className="flex w-1/2 bg-slate-950">
          <div className="w-1/3 border-r border-slate-800 bg-slate-900 p-1 space-y-1">
            <div className="size-1.5 rounded-full bg-slate-500" />
            <div className="h-1 w-full rounded-full bg-slate-700" />
          </div>
          <div className="flex-1 p-1.5 space-y-1">
            <div className="h-1.5 w-3/4 rounded-full bg-slate-600" />
            <div className="h-1 w-full rounded-full bg-slate-800" />
            <div className="h-1 w-1/2 rounded-full bg-slate-800" />
          </div>
        </div>
      </div>
    )
  }

  const isDark = mode === 'dark'

  return (
    <div
      className={`flex aspect-video w-full overflow-hidden rounded-md border shadow-2xs ${
        isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-300 bg-slate-100'
      }`}
    >
      <div
        className={`w-1/4 border-r p-1.5 space-y-1 ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        <div className={`size-1.5 rounded-full ${isDark ? 'bg-slate-500' : 'bg-slate-400'}`} />
        <div className={`h-1 w-full rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
        <div className={`h-1 w-2/3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
      </div>
      <div className="flex-1 p-2 space-y-1.5">
        <div className={`h-1.5 w-1/2 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-400'}`} />
        <div className={`h-1 w-full rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />
        <div className={`h-1 w-3/4 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />
      </div>
    </div>
  )
}

export const AppearanceSettings: React.FC = () => {
  const { settings, updateSettings } = useAppStore()
  const { t } = useTranslation()

  if (!settings) return null
  const { system } = settings

  const themeOptions = [
    {
      id: 'light' as ThemeMode,
      label: t('appearanceSettings.themeLight') || '浅色模式',
      icon: Sun
    },
    { id: 'dark' as ThemeMode, label: t('appearanceSettings.themeDark') || '深色模式', icon: Moon },
    {
      id: 'system' as ThemeMode,
      label: t('appearanceSettings.themeSystem') || '跟随系统',
      icon: Monitor
    }
  ]

  const handleThemeChange = (newTheme: ThemeMode) => {
    if (system.theme === newTheme) return
    updateSettings({
      system: { ...system, theme: newTheme }
    })
  }

  const handleColorChange = (newColor: string) => {
    if (system.themeColor === newColor) return
    updateSettings({
      system: { ...system, themeColor: newColor }
    })
  }

  const handleLanguageChange = (newLang: AppLanguage) => {
    if (system.language === newLang) return
    updateSettings({
      system: { ...system, language: newLang }
    })
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-5 select-none">
      {/* 卡片 1: 主题模式 (视觉化卡片预览) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            {t('appearanceSettings.themeModeTitle') || '主题模式'}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const Icon = opt.icon
              const isSelected = (system.theme || 'dark') === opt.id

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleThemeChange(opt.id)}
                  className="group flex flex-col cursor-pointer text-left focus:outline-none"
                >
                  <div
                    style={
                      isSelected
                        ? {
                            borderColor: 'var(--color-primary)',
                            backgroundColor: 'var(--color-primary-subtle)',
                            boxShadow: '0 0 0 2px var(--color-primary-border)'
                          }
                        : undefined
                    }
                    className={`p-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <ThemePreview mode={opt.id} />
                  </div>
                  <div className="mt-2.5 flex items-center justify-center space-x-1.5 text-xs">
                    <Icon
                      style={isSelected ? { color: 'var(--color-primary)' } : undefined}
                      className={`w-3.5 h-3.5 ${isSelected ? '' : 'text-slate-400'}`}
                    />
                    <span
                      style={isSelected ? { color: 'var(--color-primary)' } : undefined}
                      className={`font-medium ${
                        isSelected ? 'font-bold' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 卡片 2: 主题强调色 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            {t('appearanceSettings.themeColorTitle') || '主题强调色'}
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('appearanceSettings.themeColorDesc') ||
                '选择或自定义界面核心按钮、高亮与交互强调色'}
            </div>
            <ThemeColorPicker
              value={system.themeColor || '#10B981'}
              onChange={handleColorChange}
              className="pt-1"
            />
          </div>
        </div>

        {/* 卡片 3: 界面语言 (支持中/繁/英/日/韩 5 种语言) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            {t('appearanceSettings.languageTitle') || '界面语言'}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Globe className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
              <div>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {t('appearanceSettings.languageTitle') || '界面语言'}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('appearanceSettings.languageDesc') ||
                    '选择 ParrotLingo 界面使用的主要显示语言'}
                </div>
              </div>
            </div>

            <div className="w-52">
              <Select
                value={system.language || 'zh-CN'}
                onValueChange={(val: AppLanguage) => handleLanguageChange(val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="选择语言" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id}>
                      <span className="mr-2">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
    </div>
  )
}

export default AppearanceSettings
