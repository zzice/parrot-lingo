import React, { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select'
import { SearchEngineType, buildSearchUrl } from '../utils/searchEngine'

interface SearchEngineModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  engine: SearchEngineType
  customName?: string
  customUrl?: string
  onSave: (engine: SearchEngineType, customName: string, customUrl: string) => void
}

// Google 图标 SVG
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
)

// 百度图标 SVG
const BaiduIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#2932E1">
    <path d="M12.7 11.5c-1.3 0-2.4 1.1-2.4 2.4 0 1.3 1.1 2.4 2.4 2.4 1.3 0 2.4-1.1 2.4-2.4 0-1.3-1.1-2.4-2.4-2.4zm-4.9-3.2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm9.8 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-7.6-4.6c-.9 0-1.7.8-1.7 1.7 0 .9.8 1.7 1.7 1.7.9 0 1.7-.8 1.7-1.7 0-.9-.8-1.7-1.7-1.7zm5.4 0c-.9 0-1.7.8-1.7 1.7 0 .9.8 1.7 1.7 1.7.9 0 1.7-.8 1.7-1.7 0-.9-.8-1.7-1.7-1.7zM12 19c-3.1 0-5.7-1.9-6.6-4.6-.2-.6-.3-1.2-.3-1.9 0-3.3 2.7-6 6-6s6 2.7 6 6c0 .7-.1 1.3-.3 1.9-.9 2.7-3.5 4.6-6.6 4.6zm6.3-1.2C19.4 16.4 20 14.8 20 13c0-4.4-3.6-8-8-8s-8 3.6-8 8c0 1.8.6 3.4 1.7 4.8l-1.4 1.4c-.4.4-.4 1 0 1.4.4.4 1 .4 1.4 0l1.5-1.5c1.3.9 2.9 1.4 4.8 1.4s3.5-.5 4.8-1.4l1.5 1.5c.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4l-1.4-1.5z" />
  </svg>
)

// 必应图标 SVG
const BingIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#008373">
    <path d="M5 3v18l5-2.8V13.8l4.8 2.8 4.2-2.4-8-5.3V3.5L5 3zm6 4.7l4 2.6-4 2.4V7.7z" />
  </svg>
)

export const SearchEngineModal: React.FC<SearchEngineModalProps> = ({
  open,
  onOpenChange,
  engine,
  customName = '',
  customUrl = '',
  onSave
}) => {
  const { t } = useTranslation()
  const [selectedEngine, setSelectedEngine] = useState<SearchEngineType>(engine)
  const [localCustomName, setLocalCustomName] = useState(customName)
  const [localCustomUrl, setLocalCustomUrl] = useState(customUrl)

  useEffect(() => {
    if (open) {
      setSelectedEngine(engine || 'google')
      setLocalCustomName(customName || '')
      setLocalCustomUrl(customUrl || '')
    }
  }, [open, engine, customName, customUrl])

  const handleTest = async () => {
    const url = buildSearchUrl('custom', 'test', localCustomUrl)
    if (window.api?.system?.openExternal) {
      await window.api.system.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const handleConfirm = () => {
    onSave(selectedEngine, localCustomName.trim(), localCustomUrl.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px] p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="pb-1 border-b border-slate-100 dark:border-slate-800/80">
          <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
            {t('searchEngine.modalTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 搜索引擎下拉选择 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('searchEngine.label')}
            </label>
            <Select
              value={selectedEngine}
              onValueChange={(val) => setSelectedEngine(val as SearchEngineType)}
            >
              <SelectTrigger className="h-10 rounded-xl px-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
                <SelectValue placeholder={t('searchEngine.selectPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
                <SelectItem value="google" className="text-xs py-2.5 cursor-pointer rounded-lg">
                  <div className="flex items-center space-x-2.5">
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                    <span className="font-medium">Google</span>
                  </div>
                </SelectItem>
                <SelectItem value="baidu" className="text-xs py-2.5 cursor-pointer rounded-lg">
                  <div className="flex items-center space-x-2.5">
                    <BaiduIcon className="w-4 h-4 shrink-0" />
                    <span className="font-medium">Baidu (百度)</span>
                  </div>
                </SelectItem>
                <SelectItem value="bing" className="text-xs py-2.5 cursor-pointer rounded-lg">
                  <div className="flex items-center space-x-2.5">
                    <BingIcon className="w-4 h-4 shrink-0" />
                    <span className="font-medium">Bing (必应)</span>
                  </div>
                </SelectItem>
                <SelectItem value="custom" className="text-xs py-2.5 cursor-pointer rounded-lg">
                  <div className="flex items-center space-x-2.5">
                    <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="font-medium">{t('searchEngine.custom')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 自定义搜索引擎选项 */}
          {selectedEngine === 'custom' && (
            <div className="space-y-3.5 pt-1 animate-in fade-in duration-150">
              {/* 自定义名称 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('searchEngine.customName')}
                </label>
                <input
                  type="text"
                  value={localCustomName}
                  onChange={(e) => setLocalCustomName(e.target.value)}
                  placeholder={t('searchEngine.customNamePlaceholder')}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                />
              </div>

              {/* 自定义搜索 URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('searchEngine.customUrl')}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={localCustomUrl}
                    onChange={(e) => setLocalCustomUrl(e.target.value)}
                    placeholder="https://example.com/search?q={{queryString}}"
                    className="flex-1 h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs font-mono text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={handleTest}
                    className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors focus:outline-none"
                  >
                    {t('searchEngine.test')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors focus:outline-none"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={handleConfirm}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)'
            }}
            className="px-5 py-2 rounded-xl text-xs font-semibold hover:opacity-90 shadow-2xs cursor-pointer transition-all focus:outline-none"
          >
            {t('common.confirm')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SearchEngineModal
