import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Sparkles, Download, X, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppUpdateMetadata, AppUpdateProgress } from '../types'

interface UpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  updateInfo: AppUpdateMetadata | null
  progress: AppUpdateProgress | null
  isDownloading: boolean
  isDownloaded: boolean
  onDownload: () => void
  onInstall: () => void
  onCancelDownload: () => void
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({
  open,
  onOpenChange,
  updateInfo,
  progress,
  isDownloading,
  isDownloaded,
  onDownload,
  onInstall,
  onCancelDownload
}) => {
  const { t } = useTranslation()
  const [actionLoading, setActionLoading] = useState(false)

  if (!updateInfo) return null

  const formatSpeed = (bytesPerSec: number): string => {
    if (!bytesPerSec) return '0 KB/s'
    if (bytesPerSec >= 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
    }
    return `${(bytesPerSec / 1024).toFixed(0)} KB/s`
  }

  const formatSize = (bytes: number): string => {
    if (!bytes) return '0 MB'
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleAction = async () => {
    setActionLoading(true)
    try {
      if (isDownloaded) {
        onInstall()
      } else {
        onDownload()
      }
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in duration-200" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[520px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 z-50 focus:outline-none select-none">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div
                style={{
                  backgroundColor: 'var(--color-primary-subtle)',
                  borderColor: 'var(--color-primary-border)',
                  color: 'var(--color-primary)'
                }}
                className="w-10 h-10 rounded-xl border flex items-center justify-center shadow-2xs"
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {t('updater.newVersionAvailable')}
                </Dialog.Title>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  v{updateInfo.version}
                  {updateInfo.releaseDate &&
                    ` · ${new Date(updateInfo.releaseDate).toLocaleDateString()}`}
                </div>
              </div>
            </div>
            <Dialog.Close
              tabIndex={-1}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors focus:outline-none"
            >
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          {/* Body: Release Notes */}
          <div className="my-4">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
              {t('updater.releaseNotesTitle')}
            </div>
            <div
              onClick={(e) => {
                const target = (e.target as HTMLElement).closest('a')
                if (target && target.href) {
                  e.preventDefault()
                  window.open(target.href, '_blank')
                }
              }}
              className="max-h-[220px] overflow-y-auto p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-sans"
            >
              {updateInfo.releaseNotes ? (
                /<[a-z][\s\S]*>/i.test(updateInfo.releaseNotes) ? (
                  <div
                    className="space-y-1.5 [&_a]:text-[var(--color-primary)] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1 [&_strong]:font-bold [&_strong]:text-slate-900 dark:[&_strong]:text-slate-100"
                    dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{updateInfo.releaseNotes}</div>
                )
              ) : (
                <div className="text-slate-400">{t('updater.noReleaseNotes')}</div>
              )}
            </div>
          </div>

          {/* Download Progress Status */}
          {isDownloading && progress && (
            <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--color-primary)]" />
                  <span>{t('updater.downloading')}</span>
                </span>
                <span className="font-mono">{progress.percent.toFixed(1)}%</span>
              </div>
              {/* Progress Track */}
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  style={{
                    width: `${progress.percent}%`,
                    backgroundColor: 'var(--color-primary)'
                  }}
                  className="h-full transition-all duration-300 rounded-full"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>{formatSpeed(progress.bytesPerSecond)}</span>
                <span>
                  {formatSize(progress.transferred)} / {formatSize(progress.total)}
                </span>
              </div>
            </div>
          )}

          {isDownloaded && (
            <div
              style={{
                backgroundColor: 'var(--color-primary-subtle)',
                borderColor: 'var(--color-primary-border)',
                color: 'var(--color-primary)'
              }}
              className="mb-4 p-2.5 px-3 rounded-xl border text-xs flex items-center space-x-2 font-medium"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t('updater.readyToInstall')}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {isDownloading ? (
              <button
                type="button"
                tabIndex={-1}
                onClick={onCancelDownload}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors focus:outline-none"
              >
                {t('updater.cancelDownload')}
              </button>
            ) : (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors focus:outline-none"
              >
                {t('updater.remindLater')}
              </button>
            )}

            <button
              type="button"
              tabIndex={-1}
              onClick={handleAction}
              disabled={actionLoading || isDownloading}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)'
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-all focus:outline-none"
            >
              {isDownloaded ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('updater.installNow')}</span>
                </>
              ) : isDownloading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('updater.downloading')}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('updater.downloadNow')}</span>
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
