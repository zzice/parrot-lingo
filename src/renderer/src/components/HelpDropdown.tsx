import React, { useState, useRef, useEffect } from 'react'
import { HelpCircle, BookOpen, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

export const HelpDropdown: React.FC = () => {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleAction = (type: string) => {
    setOpen(false)
    if (type === 'guide') {
      window.open('https://github.com/zzice/parrot-lingo#readme', '_blank')
    } else if (type === 'feedback') {
      window.open('https://github.com/zzice/parrot-lingo/issues', '_blank')
    } else if (type === 'github') {
      window.open('https://github.com/zzice/parrot-lingo', '_blank')
    }
  }

  return (
    <div className="relative w-full" ref={menuRef}>
      {/* 帮助整行菜单按钮 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
          open
            ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
        }`}
        title={t('sidebar.help')}
      >
        <HelpCircle className="w-[18px] h-[18px] text-slate-400" />
        <span>{t('sidebar.help')}</span>
      </button>

      {/* 弹出菜单 */}
      {open && (
        <div className="absolute left-full bottom-0 ml-2 z-50 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-1.5 shadow-xl select-none animate-in fade-in-0 zoom-in-95">
          <button
            onClick={() => handleAction('guide')}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            <span>{t('help.guide')}</span>
          </button>

          <button
            onClick={() => handleAction('feedback')}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span>{t('help.feedback')}</span>
          </button>

          <button
            onClick={() => handleAction('github')}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <GithubIcon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span>{t('help.github')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
