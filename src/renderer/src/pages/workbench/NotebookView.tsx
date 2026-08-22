import React from 'react'
import { StickyNote, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const NotebookView: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center space-y-4 select-none">
      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm">
        <StickyNote className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
      </div>

      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center space-x-1.5">
          <span>{t('notebook.title')}</span>
          <span
            style={{
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)'
            }}
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          >
            {t('sidebar.placeholder')}
          </span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('notebook.desc')}</p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full text-left space-y-2 shadow-2xs">
        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-400 flex items-center space-x-1">
          <Sparkles className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
          <span>{t('notebook.highlights')}</span>
        </div>
        <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
          <li>{t('notebook.h1')}</li>
          <li>{t('notebook.h2')}</li>
          <li>{t('notebook.h3')}</li>
        </ul>
      </div>
    </div>
  )
}

export default NotebookView
