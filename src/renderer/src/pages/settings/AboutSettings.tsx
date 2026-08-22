import React from 'react'
import { Sparkles, RefreshCw, CheckCircle2, Download, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import logoImg from '../../assets/logo.png'
import { useAppStore } from '../../stores/useAppStore'

export const AboutSettings: React.FC = () => {
  const { t } = useTranslation()

  const {
    appVersion,
    updaterState,
    setIsUpdateDialogOpen,
    checkUpdate,
    downloadUpdate,
    cancelDownloadUpdate,
    installUpdate
  } = useAppStore()

  const checking = updaterState.status === 'checking'
  const isDownloading = updaterState.status === 'downloading'
  const isDownloaded = updaterState.status === 'downloaded'
  const isAvailable = updaterState.status === 'available' && Boolean(updaterState.updateInfo)
  const isUpToDate = updaterState.status === 'not-available'
  const hasError = updaterState.status === 'error'

  const formatUpdaterError = (error: string): string => {
    if (!error) return t('updater.checkFailed') || '检查更新失败，请稍后重试'
    const lower = error.toLowerCase()
    if (
      lower.includes('404') ||
      lower.includes('cannot find latest release') ||
      lower.includes('not found') ||
      lower.includes('未就绪')
    ) {
      return t('updater.errorNotFound') || '当前暂无可用的更新发布版本'
    }
    if (
      lower.includes('net::') ||
      lower.includes('timeout') ||
      lower.includes('enotfound') ||
      lower.includes('econnrefused') ||
      lower.includes('failed to fetch') ||
      lower.includes('network')
    ) {
      return t('updater.errorNetwork') || '网络连接超时或无法连接到更新服务器，请检查网络设置'
    }
    if (lower.includes('403') || lower.includes('401') || lower.includes('unauthorized')) {
      return t('updater.errorAuth') || '访问更新服务受限 (403/401)'
    }
    const lines = error.split('\n')
    const firstLine = lines[0].replace(/^Error:\s*/, '').replace(/\{.*$/, '').trim()
    return firstLine || t('updater.checkFailed') || '检查更新失败，请稍后重试'
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-5 select-none">
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center text-center space-y-4 shadow-2xs">
        <img
          src={logoImg}
          alt="ParrotLingo Logo"
          className="w-20 h-20 object-contain drop-shadow-sm"
        />

        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            ParrotLingo
          </h1>
          <p style={{ color: 'var(--color-primary)' }} className="text-xs font-medium">
            {t('aboutSettings.subTitle')}
          </p>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5 font-mono">
            Version v{appVersion}
          </div>
        </div>

        {/* Action Button Group */}
        <div className="flex items-center space-x-3 pt-2">
          {isDownloaded ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={installUpdate}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)'
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs hover:opacity-90 cursor-pointer focus:outline-none transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('updater.installNow')}</span>
            </button>
          ) : isDownloading ? (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                tabIndex={-1}
                disabled
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)'
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 opacity-80"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {t('updater.downloading')} ({updaterState.progress?.percent.toFixed(0) || 0}%)
                </span>
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={cancelDownloadUpdate}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors focus:outline-none"
              >
                {t('updater.cancelDownload')}
              </button>
            </div>
          ) : isAvailable ? (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                tabIndex={-1}
                onClick={downloadUpdate}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)'
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs hover:opacity-90 cursor-pointer focus:outline-none transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {t('updater.downloadNow')} (v{updaterState.updateInfo?.version})
                </span>
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setIsUpdateDialogOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors focus:outline-none"
              >
                {t('updater.viewNotes')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              tabIndex={-1}
              onClick={checkUpdate}
              disabled={checking}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)'
              }}
              className="px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs cursor-pointer focus:outline-none transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>
                {checking ? t('aboutSettings.checkingUpdate') : t('aboutSettings.checkUpdate')}
              </span>
            </button>
          )}
        </div>

        {/* Message Banner */}
        {hasError && updaterState.error && (
          <div className="max-w-md w-full p-2.5 px-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-center space-x-2 transition-all shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-sm" title={updaterState.error}>
              {formatUpdaterError(updaterState.error)}
            </span>
          </div>
        )}

        {isUpToDate && (
          <div
            style={{
              backgroundColor: 'var(--color-primary-subtle)',
              borderColor: 'var(--color-primary-border)',
              color: 'var(--color-primary)'
            }}
            className="p-2 px-3.5 rounded-xl border text-xs flex items-center space-x-2 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{t('aboutSettings.latestVersion', { version: appVersion })}</span>
          </div>
        )}

        {isAvailable && (
          <div
            style={{
              backgroundColor: 'var(--color-primary-subtle)',
              borderColor: 'var(--color-primary-border)',
              color: 'var(--color-primary)'
            }}
            className="p-2 px-3.5 rounded-xl border text-xs flex items-center space-x-2 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>
              {t('updater.newVersionFound', { version: updaterState.updateInfo?.version })}
            </span>
          </div>
        )}

        {isDownloaded && (
          <div
            style={{
              backgroundColor: 'var(--color-primary-subtle)',
              borderColor: 'var(--color-primary-border)',
              color: 'var(--color-primary)'
            }}
            className="p-2 px-3.5 rounded-xl border text-xs flex items-center space-x-2 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{t('updater.readyToInstall')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default AboutSettings
