import React, { useState, useEffect, useRef } from 'react'
import {
  Database,
  Download,
  Upload,
  FolderOpen,
  Copy,
  BookOpen,
  History,
  Trash2,
  AlertTriangle,
  HardDrive,
  Check,
  Lock,
  Layers
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/useAppStore'

interface StorageStats {
  dbPath: string
  fileSize: number
  corpusCount: number
  encountersCount: number
  reviewsCount: number
}

export const PrivacySettings: React.FC = () => {
  const { settings, corpusList, clearCorpus, importCorpus, resetSettings, showToast } =
    useAppStore()
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stats, setStats] = useState<StorageStats>({
    dbPath: settings?.system.dbPath || '',
    fileSize: 0,
    corpusCount: corpusList.length,
    encountersCount: 0,
    reviewsCount: 0
  })

  const [copied, setCopied] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const loadStorageStats = async () => {
    if (window.api?.system?.getStorageStats) {
      try {
        const data = await window.api.system.getStorageStats()
        setStats(data)
      } catch (err) {
        console.error('Failed to get storage stats:', err)
      }
    }
  }

  useEffect(() => {
    loadStorageStats()
  }, [corpusList.length])

  const handleCopyPath = () => {
    if (stats.dbPath) {
      navigator.clipboard.writeText(stats.dbPath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenFolder = async () => {
    if (window.api?.system?.openPath) {
      const ok = await window.api.system.openPath(stats.dbPath)
      if (!ok) {
        showToast(t('privacySettings.openFolderFailed') || '无法打开文件夹', 'error')
      }
    }
  }

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 KB'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(2)} MB`
  }

  const handleExportJSON = () => {
    try {
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(corpusList, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `parrot-lingo-corpus-${Date.now()}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      showToast(t('privacySettings.jsonExportSuccess') || 'JSON 语料导出成功', 'success')
    } catch {
      showToast(t('privacySettings.exportFailed') || '导出失败', 'error')
    }
  }

  const handleExportCSV = () => {
    try {
      const header =
        'Word,Phonetic,PartOfSpeech,Translation,Explanation,Example,Alternatives,Tags\n'
      const rows = corpusList
        .map((c) => {
          const text = (c.text || '').replace(/"/g, '""')
          const phonetic = (c.phonetic || '').replace(/"/g, '""')
          const pos = (c.partOfSpeech || '').replace(/"/g, '""')
          const translation = (c.translation || '').replace(/"/g, '""')
          const explanation = (c.explanation || '').replace(/"/g, '""')
          const example = (c.nativeExample || '').replace(/"/g, '""')
          const alternatives = (c.alternativeExpressions || []).join('; ').replace(/"/g, '""')
          const tags = (c.tags || []).join('; ').replace(/"/g, '""')
          return `"${text}","${phonetic}","${pos}","${translation}","${explanation}","${example}","${alternatives}","${tags}"`
        })
        .join('\n')

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(header + rows)
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', csvContent)
      downloadAnchor.setAttribute('download', `parrot-lingo-anki-${Date.now()}.csv`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      showToast(
        t('privacySettings.csvExportSuccess') || 'CSV 语料导出成功 (兼容 Excel & Anki)',
        'success'
      )
    } catch {
      showToast(t('privacySettings.exportFailed') || '导出失败', 'error')
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid JSON format: expected an array of corpus items')
      }
      const count = await importCorpus(parsed)
      await loadStorageStats()
      showToast(
        t('privacySettings.importSuccess', { count }) || `成功导入 ${count} 个生词词条`,
        'success'
      )
    } catch (err: any) {
      showToast(
        err.message || t('privacySettings.importError') || '导入失败，请检查 JSON 格式',
        'error'
      )
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleConfirmClear = async () => {
    setIsProcessing(true)
    try {
      await clearCorpus()
      await loadStorageStats()
      setShowClearConfirm(false)
      showToast(t('privacySettings.clearCorpusSuccess') || '生词与语料库已成功清空', 'success')
    } catch {
      showToast(t('privacySettings.actionFailed') || '操作失败', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmReset = async () => {
    setIsProcessing(true)
    try {
      await resetSettings()
      setShowResetConfirm(false)
      showToast(t('privacySettings.resetSettingsSuccess') || '应用设置已恢复默认', 'success')
    } catch {
      showToast(t('privacySettings.actionFailed') || '操作失败', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-5 select-none">
      {/* 1. 本地数据库与存储架构状态 */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-100">
            <Database className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            <span>{t('privacySettings.storageStatsTitle') || '本地存储与数据库架构'}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
            <Lock className="w-3 h-3" />
            <span>{t('privacySettings.privacyBadge') || '100% 离线本地存储 · 零遥测'}</span>
          </div>
        </div>

        {/* 统计指标栅格 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400">
              <BookOpen className="w-3 h-3 text-blue-500" />
              <span>{t('privacySettings.statCorpus') || '生词词条'}</span>
            </div>
            <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-mono">
              {stats.corpusCount}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Layers className="w-3 h-3 text-purple-500" />
              <span>{t('privacySettings.statEncounters') || '遇见语境'}</span>
            </div>
            <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-mono">
              {stats.encountersCount}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400">
              <History className="w-3 h-3 text-amber-500" />
              <span>{t('privacySettings.statReviews') || '复习日志'}</span>
            </div>
            <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-mono">
              {stats.reviewsCount}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400">
              <HardDrive className="w-3 h-3 text-emerald-500" />
              <span>{t('privacySettings.statFileSize') || '数据库体积'}</span>
            </div>
            <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-mono">
              {formatBytes(stats.fileSize)}
            </div>
          </div>
        </div>

        {/* 数据库路径与操作 */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {t('privacySettings.dbPathTitle') || 'SQLite 数据库文件路径'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">SQLite 3 · WAL Mode</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex-1 p-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-mono truncate select-text">
              {stats.dbPath || '未获取到数据库路径'}
            </div>

            <button
              type="button"
              onClick={handleCopyPath}
              className="p-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-colors border border-slate-200/80 dark:border-slate-700/80 shrink-0"
              title="复制路径"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copied
                  ? t('privacySettings.copied') || '已复制'
                  : t('privacySettings.copyPath') || '复制'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleOpenFolder}
              className="p-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-colors border border-slate-200/80 dark:border-slate-700/80 shrink-0"
              title="在访达中打开"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
              <span>{t('privacySettings.openInFolder') || '在目录中显示'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 数据备份与导出 / 恢复导入 */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
            {t('privacySettings.exportTitle') || '数据备份与迁移'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t('privacySettings.corpusCount', { count: corpusList.length })}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-1">
          {/* 导出 JSON */}
          <button
            type="button"
            onClick={handleExportJSON}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/80 flex flex-col items-center justify-center space-y-1.5 text-center cursor-pointer transition-all hover:border-[var(--color-primary)] group"
          >
            <Download className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {t('privacySettings.exportJson') || '导出 JSON 备份'}
            </span>
            <span className="text-[10px] text-slate-400">完整学习记录与语境</span>
          </button>

          {/* 导出 CSV / Anki */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/80 flex flex-col items-center justify-center space-y-1.5 text-center cursor-pointer transition-all hover:border-blue-500 group"
          >
            <Download className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {t('privacySettings.exportCsv') || '导出 CSV (Anki)'}
            </span>
            <span className="text-[10px] text-slate-400">兼容 Excel 与 Anki 牌组</span>
          </button>

          {/* 导入 JSON 备份 */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/80 flex flex-col items-center justify-center space-y-1.5 text-center cursor-pointer transition-all hover:border-purple-500 group disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {t('privacySettings.importBtn') || '导入 JSON 备份'}
            </span>
            <span className="text-[10px] text-slate-400">恢复历史生词与配置</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            className="hidden"
          />
        </div>
      </div>

      {/* 3. 危险操作区 (Danger Zone) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-4 h-4" />
          <span>{t('privacySettings.dangerZoneTitle') || '危险操作区'}</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {/* 清空生词库数据 */}
          <div className="py-3 flex items-center justify-between first:pt-0">
            <div className="space-y-0.5 max-w-md pr-4">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t('privacySettings.clearCorpusTitle') || '清空全部语料数据'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('privacySettings.clearCorpusDesc') ||
                  '清除本地数据库中记录的所有生词、遇见语境与复习历史，此操作不可逆'}
              </p>
            </div>

            {showClearConfirm ? (
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t('common.cancel') || '取消'}
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmClear}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {t('common.confirm') || '确认清空'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/50 cursor-pointer transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                <span>{t('privacySettings.clearCorpusBtn') || '清空数据'}</span>
              </button>
            )}
          </div>

          {/* 恢复应用默认设置 */}
          <div className="py-3 flex items-center justify-between last:pb-0">
            <div className="space-y-0.5 max-w-md pr-4">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t('privacySettings.resetSettingsTitle') || '恢复应用默认设置'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('privacySettings.resetSettingsDesc') ||
                  '将划词助手、外观主题、系统偏好等配置重置为初始默认状态'}
              </p>
            </div>

            {showResetConfirm ? (
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t('common.cancel') || '取消'}
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmReset}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {t('common.confirm') || '确认重置'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/50 cursor-pointer transition-colors shrink-0"
              >
                <span>{t('privacySettings.resetSettingsBtn') || '恢复默认'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacySettings
