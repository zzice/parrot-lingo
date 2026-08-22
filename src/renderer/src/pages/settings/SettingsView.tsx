import {
  ArrowLeft,
  Cpu,
  MousePointerClick,
  SlidersHorizontal,
  Palette,
  ShieldCheck,
  Info,
  Sparkles
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore, SettingsTab } from '../../stores/useAppStore'
import { ModelSettings } from './ModelSettings'
import { DefaultModelSettings } from './DefaultModelSettings'
import { SelectionSettings } from './SelectionSettings'
import { GeneralSettings } from './GeneralSettings'
import { AppearanceSettings } from './AppearanceSettings'
import { PrivacySettings } from './PrivacySettings'
import { AboutSettings } from './AboutSettings'

export const SettingsView: React.FC = () => {
  const { settingsTab, setSettingsTab, exitSettingsView, updaterState, appVersion } = useAppStore()
  const { t } = useTranslation()

  const hasUpdate = updaterState.status === 'available' || updaterState.status === 'downloaded'

  const tabs: {
    id: SettingsTab
    label: string
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  }[] = [
    {
      id: 'general',
      label: t('sidebar.generalSettings'),
      icon: SlidersHorizontal
    },
    {
      id: 'appearance',
      label: t('sidebar.appearanceSettings'),
      icon: Palette
    },
    {
      id: 'model',
      label: t('sidebar.modelSettings'),
      icon: Cpu
    },
    {
      id: 'defaultModel',
      label: t('sidebar.defaultModelSettings') || '默认模型',
      icon: Sparkles
    },
    {
      id: 'selection',
      label: t('sidebar.selectionSettings'),
      icon: MousePointerClick
    },
    {
      id: 'privacy',
      label: t('sidebar.privacySettings'),
      icon: ShieldCheck
    },
    {
      id: 'about',
      label: t('sidebar.aboutSettings'),
      icon: Info
    }
  ]

  return (
    <div className="absolute inset-0 z-40 bg-slate-100 dark:bg-slate-950 flex overflow-hidden select-none">
      {/* 左侧设置导航栏 */}
      <div className="w-56 h-full border-r border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/80 p-3 flex flex-col justify-between">
        <div className="space-y-4">
          {/* 返回按钮与设置标题栏 */}
          <div className="flex items-center space-x-2 pt-1 px-1">
            <button
              type="button"
              tabIndex={-1}
              onClick={exitSettingsView}
              className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:white transition-colors cursor-pointer flex items-center space-x-1 focus:outline-none"
              title={t('common.backToWorkbench') || '返回工作台'}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-semibold">{t('common.back') || '返回'}</span>
            </button>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">|</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {t('sidebar.settings')}
            </span>
          </div>

          {/* 设置子菜单项 */}
          <div className="space-y-1 pt-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = settingsTab === tab.id
              const showDot = tab.id === 'about' && hasUpdate
              return (
                <button
                  key={tab.id}
                  type="button"
                  tabIndex={-1}
                  onClick={() => setSettingsTab(tab.id)}
                  style={
                    isActive
                      ? {
                          backgroundColor: 'var(--color-primary-subtle)',
                          borderColor: 'var(--color-primary-border)',
                          color: 'var(--color-primary)'
                        }
                      : undefined
                  }
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors border focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                    isActive
                      ? 'font-semibold shadow-2xs'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon
                    style={isActive ? { color: 'var(--color-primary)' } : undefined}
                    className={`w-[18px] h-[18px] ${isActive ? '' : 'text-slate-400'}`}
                  />
                  <span className="flex-1 text-left">{tab.label}</span>
                  {showDot && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs animate-pulse shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-3 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          ParrotLingo v{appVersion}
        </div>
      </div>

      {/* 右侧设置配置详情区域 */}
      <div className="flex-1 h-full overflow-hidden flex flex-col bg-slate-100/60 dark:bg-slate-950/60">
        {settingsTab === 'general' && <GeneralSettings />}
        {settingsTab === 'appearance' && <AppearanceSettings />}
        {settingsTab === 'model' && <ModelSettings />}
        {settingsTab === 'defaultModel' && <DefaultModelSettings />}
        {settingsTab === 'selection' && <SelectionSettings />}
        {settingsTab === 'privacy' && <PrivacySettings />}
        {settingsTab === 'about' && <AboutSettings />}
      </div>
    </div>
  )
}
