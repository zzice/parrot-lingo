import React from 'react'
import { ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'

export const TitleBar: React.FC = () => {
  const { t } = useTranslation()
  const { hasAccessibility, setIsAccessibilityModalOpen } = useAppStore()

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  const showAccessibilityBanner = isMac && hasAccessibility === false

  return (
    <div className="h-10 w-full drag-region flex items-center justify-between px-4 bg-slate-100/90 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800/80 z-50 select-none">
      {/* macOS 交通灯占位 */}
      <div className="flex items-center space-x-2 w-20"></div>

      {/* 居中区域保持极简 */}
      <div className="flex-1"></div>

      {/* 右侧：状态指示与快速操作 */}
      <div className="no-drag flex items-center space-x-2">
        {showAccessibilityBanner && (
          <button
            type="button"
            onClick={() => setIsAccessibilityModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-medium transition-colors cursor-pointer shadow-2xs animate-in fade-in-0 duration-200"
            title={
              t('accessibilityModal.bannerTooltip') ||
              '划词助手尚未获得 macOS 辅助功能权限，点击前往开启'
            }
          >
            <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0" />
            <span>{t('accessibilityModal.bannerPending') || '划词助手待授权'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 font-bold">
              {t('accessibilityModal.bannerEnable') || '去开启'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
