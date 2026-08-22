import React from 'react'
import { Zap, BookMarked, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore, NavKey } from '../stores/useAppStore'
import { HelpDropdown } from '../components/HelpDropdown'
import logoImg from '../assets/logo.png'

export const Sidebar: React.FC = () => {
  const {
    currentNav,
    setCurrentNav,
    corpusList,
    todayQueue,
    todaySummary,
    openSettingsView,
    updaterState,
    appVersion
  } = useAppStore()
  const { t } = useTranslation()

  const pendingTodayCount = todaySummary?.total ?? todayQueue.length
  const hasUpdate = updaterState.status === 'available' || updaterState.status === 'downloaded'

  const workbenchItems = [
    {
      id: 'today' as NavKey,
      label: t('sidebar.today') || '今日回放',
      icon: Zap,
      badge: pendingTodayCount > 0 ? `${pendingTodayCount}` : undefined
    },
    {
      id: 'corpus' as NavKey,
      label: t('sidebar.corpus'),
      icon: BookMarked,
      badge: corpusList.length > 0 ? `${corpusList.length}` : undefined
    }
  ]

  return (
    <div className="w-56 h-full bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between p-3 select-none">
      <div className="space-y-3">
        {/* 顶部品牌区 (融合式无边框设计，无鼠标悬浮效果) */}
        <div className="px-2.5 pt-1 pb-1.5 flex items-center space-x-2.5 select-none">
          <img src={logoImg} alt="ParrotLingo" className="w-8 h-8 object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate leading-tight">
              ParrotLingo
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              v{appVersion}
            </div>
          </div>
        </div>

        {/* 工作台菜单 */}
        <div className="space-y-1">
          {workbenchItems.map((item) => {
            const Icon = item.icon
            const isActive = currentNav === item.id
            return (
              <button
                key={item.id}
                type="button"
                tabIndex={-1}
                onClick={() => setCurrentNav(item.id)}
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--color-primary-subtle)',
                        borderColor: 'var(--color-primary-border)',
                        color: 'var(--color-primary)'
                      }
                    : undefined
                }
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors border focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                  isActive
                    ? 'font-semibold shadow-2xs'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    style={isActive ? { color: 'var(--color-primary)' } : undefined}
                    className={`w-[18px] h-[18px] ${isActive ? '' : 'text-slate-400'}`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono animate-in fade-in duration-200">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 工作台左下角：显示完整菜单名（帮助 与 设置） */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/60 space-y-1">
        {/* 帮助菜单按钮 (带【帮助】菜单名) */}
        <HelpDropdown />

        {/* 设置菜单按钮 (带【设置】菜单名) */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => openSettingsView('general')}
          className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer border border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
          title={t('sidebar.settings')}
        >
          <Settings className="w-[18px] h-[18px] text-slate-400" />
          <span className="flex-1 text-left">{t('sidebar.settings')}</span>
          {hasUpdate && (
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs animate-pulse shrink-0" />
          )}
        </button>
      </div>
    </div>
  )
}
