import React, { useState, useEffect, useMemo } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, Search, Check, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RemoteModelItem } from '../types'

interface SelectModelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerName: string
  remoteModels: RemoteModelItem[]
  currentSelectedIds: string[]
  onSave: (selectedModelIds: string[]) => void
}

export const SelectModelModal: React.FC<SelectModelModalProps> = ({
  open,
  onOpenChange,
  providerName,
  remoteModels,
  currentSelectedIds,
  onSave
}) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      setSearch('')
      // 如果当前已有保存的模型，预选已有模型；若无，默认全选或选前几个
      if (currentSelectedIds.length > 0) {
        setSelectedIds(new Set(currentSelectedIds))
      } else {
        setSelectedIds(new Set(remoteModels.map((m) => m.id)))
      }
    }
  }, [open, remoteModels, currentSelectedIds])

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return remoteModels
    return remoteModels.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q))
    )
  }, [remoteModels, search])

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleSelectAll = () => {
    const next = new Set(selectedIds)
    filteredModels.forEach((m) => next.add(m.id))
    setSelectedIds(next)
  }

  const handleDeselectAll = () => {
    const next = new Set(selectedIds)
    filteredModels.forEach((m) => next.delete(m.id))
    setSelectedIds(next)
  }

  const handleSave = () => {
    onSave(Array.from(selectedIds))
    onOpenChange(false)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-xl max-h-[85vh] flex flex-col translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-800/80 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 select-none">
          {/* Header */}
          <div className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  style={{
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary)',
                    borderColor: 'var(--color-primary-border)'
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border"
                >
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <DialogPrimitive.Title className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                    <span>{t('modelSettings.selectModelsTitle') || '选择并启用模型'}</span>
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-mono">
                      ({providerName})
                    </span>
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-[11px] text-slate-400 dark:text-slate-500">
                    {t('modelSettings.selectModelsDesc') ||
                      `从服务商拉取到的 ${remoteModels.length} 个模型中勾选需要保留使用的模型`}
                  </DialogPrimitive.Description>
                </div>
              </div>

              <DialogPrimitive.Close
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </DialogPrimitive.Close>
            </div>

            {/* 搜索与全选工具条 */}
            <div className="mt-3.5 flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('modelSettings.searchModelsPlaceholder') || '搜索模型名称或 ID...'}
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[var(--color-primary)] font-mono"
                />
              </div>

              <div className="flex items-center space-x-1.5 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium cursor-pointer transition-colors"
                >
                  {t('modelSettings.selectAll') || '全选'}
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium cursor-pointer transition-colors"
                >
                  {t('modelSettings.deselectAll') || '取消全选'}
                </button>
                <span
                  style={{
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary)'
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium font-mono border border-[var(--color-primary-border)]"
                >
                  {selectedIds.size} / {remoteModels.length}
                </span>
              </div>
            </div>
          </div>

          {/* Model List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5 min-h-[220px] max-h-[380px]">
            {filteredModels.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                {t('modelSettings.noRemoteModelsFound') || '未发现匹配的模型'}
              </div>
            ) : (
              filteredModels.map((model) => {
                const isChecked = selectedIds.has(model.id)
                return (
                  <div
                    key={model.id}
                    onClick={() => handleToggle(model.id)}
                    style={
                      isChecked
                        ? {
                            borderColor: 'var(--color-primary-border)',
                            backgroundColor: 'var(--color-primary-subtle)'
                          }
                        : undefined
                    }
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isChecked
                        ? 'shadow-2xs'
                        : 'border-slate-200/70 dark:border-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white/60 dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 pr-2">
                      <div
                        style={
                          isChecked
                            ? {
                                backgroundColor: 'var(--color-primary)',
                                borderColor: 'var(--color-primary)'
                              }
                            : undefined
                        }
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                          isChecked
                            ? 'text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-100 font-mono truncate">
                            {model.id}
                          </span>
                          {model.name && model.name !== model.id && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              ({model.name})
                            </span>
                          )}
                        </div>
                        {model.description && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            {model.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('modelSettings.selectedCount', {
                selected: selectedIds.size,
                total: remoteModels.length
              }) || `已选择 ${selectedIds.size} / ${remoteModels.length} 个模型`}
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                {t('common.cancel') || '取消'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={selectedIds.size === 0}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)'
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 shadow-2xs cursor-pointer flex items-center space-x-1.5 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {t('modelSettings.saveSelectedModels') || '保存并启用所选模型'} (
                  {selectedIds.size})
                </span>
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export default SelectModelModal
