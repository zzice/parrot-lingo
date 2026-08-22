import React, { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Sparkles, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/useAppStore'
import { ProviderIcon } from './ProviderIcon'

interface ModelSelectProps {
  value: string
  onChange: (value: string) => void
  allowFollow?: boolean
  followLabel?: string
  placeholder?: string
  className?: string
  compact?: boolean
}

export const ModelSelect: React.FC<ModelSelectProps> = ({
  value,
  onChange,
  allowFollow = false,
  followLabel,
  placeholder,
  className = '',
  compact = false
}) => {
  const { t } = useTranslation()
  const { providers, settings, fetchProviders, fetchSettings } = useAppStore()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProviders()
    fetchSettings()
  }, [fetchProviders, fetchSettings])

  // 打开下拉菜单时即时拉取最新状态
  useEffect(() => {
    if (open) {
      fetchProviders()
      fetchSettings()
    }
  }, [open, fetchProviders, fetchSettings])

  // 点击外部自动关闭
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [open])

  // 解析当前选中项信息
  const isFollow = allowFollow && (value === 'follow' || !value)

  let selectedProvider = providers.find(
    (p) =>
      p.models.some((m) => `${p.id}:${m.id}` === value || m.id === value) ||
      p.id === value ||
      value?.startsWith(`${p.id}:`)
  )
  let selectedModel =
    selectedProvider?.models.find(
      (m) => `${selectedProvider?.id}:${m.id}` === value || m.id === value
    ) ||
    (selectedProvider && value?.startsWith(`${selectedProvider.id}:`)
      ? { id: value.split(':')[1], name: value.split(':')[1] }
      : null)

  // 如果跟随全局默认，解析全局默认模型展示
  let globalDisplay = ''
  if (isFollow) {
    const globalVal = settings?.defaultModels?.globalModel || 'parrotlingo:parrot-lingo-v1'
    const gp = providers.find(
      (p) =>
        p.models.some((m) => `${p.id}:${m.id}` === globalVal || m.id === globalVal) ||
        p.id === globalVal ||
        globalVal?.startsWith(`${p.id}:`)
    )
    const gm = gp?.models.find((m) => `${gp?.id}:${m.id}` === globalVal || m.id === globalVal)
    if (gm && gp) {
      globalDisplay = `${gp.name} · ${gm.name}`
    } else if (gp) {
      globalDisplay = gp.name
    }
  }

  // 按钮上显示的简洁文本 (compact 模式下不展开长括号)
  const renderTriggerLabel = () => {
    if (isFollow) {
      if (compact) {
        return followLabel || t('defaultModelSettings.followGlobal') || '默认模型'
      }
      return (
        <span className="truncate">
          <span>{followLabel || t('defaultModelSettings.followGlobal') || '跟随默认模型'}</span>
          {globalDisplay && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1 font-mono">
              ({globalDisplay})
            </span>
          )}
        </span>
      )
    }
    if (selectedModel) {
      return <span className="truncate">{selectedModel.name}</span>
    }
    return (
      <span className="text-slate-400 truncate">
        {placeholder || t('defaultModelSettings.selectModel') || '选择模型'}
      </span>
    )
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left select-none">
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={
          isFollow && globalDisplay
            ? `默认模型: ${globalDisplay}`
            : selectedModel
              ? `${selectedProvider?.name} · ${selectedModel.name}`
              : undefined
        }
        tabIndex={-1}
        className={`flex items-center justify-between gap-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 hover:border-[var(--color-primary-border)] shadow-2xs text-xs transition-all cursor-pointer group focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
          compact ? 'px-2 py-0.5 h-6 max-w-[210px]' : 'px-3 py-1.5 min-w-[180px] max-w-[280px]'
        } ${className}`}
      >
        <div className="flex items-center space-x-1.5 min-w-0 flex-1 overflow-hidden">
          {isFollow ? (
            <div
              style={{
                backgroundColor: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)'
              }}
              className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0"
            >
              <Sparkles className="w-2.5 h-2.5" />
            </div>
          ) : selectedProvider ? (
            <ProviderIcon
              id={selectedProvider.id}
              name={selectedProvider.name}
              icon={selectedProvider.icon}
              size="xs"
              className="w-3.5 h-3.5 shrink-0"
            />
          ) : (
            <div className="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Layers className="w-2 h-2 text-slate-400" />
            </div>
          )}

          <div className="truncate text-left font-medium text-slate-800 dark:text-slate-200 text-xs">
            {renderTriggerLabel()}
          </div>
        </div>

        <div className="flex items-center shrink-0 ml-0.5">
          <ChevronDown
            className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* 下拉浮层面板 */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 max-h-80 overflow-y-auto rounded-2xl bg-white/95 dark:bg-slate-900/95 p-2 shadow-2xl border border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xl text-xs animate-in fade-in-0 zoom-in-95 select-none">
          {/* 跟随全局默认选项 */}
          {allowFollow && (
            <button
              type="button"
              onClick={() => {
                onChange('follow')
                setOpen(false)
              }}
              style={
                isFollow
                  ? {
                      backgroundColor: 'var(--color-primary-subtle)',
                      color: 'var(--color-primary)',
                      borderColor: 'var(--color-primary-border)'
                    }
                  : undefined
              }
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                isFollow
                  ? 'border-transparent font-bold shadow-2xs'
                  : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div
                  style={{
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary)'
                  }}
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="truncate text-left">
                  <div className="text-xs font-semibold">
                    {followLabel || t('defaultModelSettings.followGlobal') || '跟随默认模型'}
                  </div>
                  {globalDisplay && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono mt-0.5">
                      指向: {globalDisplay}
                    </div>
                  )}
                </div>
              </div>
              {isFollow && (
                <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
              )}
            </button>
          )}

          {allowFollow && <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1.5" />}

          {/* 各服务商与模型分组列表 */}
          <div className="space-y-2">
            {providers
              .filter((p) => p.enabled)
              .map((provider) => {
                const models =
                  provider.models && provider.models.length > 0
                    ? provider.models.filter((m) => m.enabled !== false)
                    : provider.id === 'parrotlingo'
                      ? [
                          {
                            id: 'default',
                            name: 'ParrotLingo 官方智能通道',
                            description: '官方原生极速翻译'
                          }
                        ]
                      : [
                          {
                            id: 'default',
                            name: `${provider.name} (默认通道)`,
                            description: '使用该服务商默认配置'
                          }
                        ]

                if (models.length === 0) return null

                return (
                  <div key={provider.id} className="space-y-1">
                    {/* 分组标题 */}
                    <div className="flex items-center justify-between px-2.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <ProviderIcon
                          id={provider.id}
                          name={provider.name}
                          icon={provider.icon}
                          size="sm"
                          className="w-3.5 h-3.5"
                        />
                        <span>{provider.name}</span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                        {models.length} 个模型
                      </span>
                    </div>

                    {/* 模型列表项 */}
                    <div className="space-y-0.5">
                      {models.map((model) => {
                        const fullModelKey = `${provider.id}:${model.id}`
                        const isSelected =
                          !isFollow &&
                          (value === fullModelKey ||
                            value === model.id ||
                            (value === provider.id && model.id === 'default'))

                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              onChange(fullModelKey)
                              setOpen(false)
                            }}
                            style={
                              isSelected
                                ? {
                                    backgroundColor: 'var(--color-primary-subtle)',
                                    color: 'var(--color-primary)'
                                  }
                                : undefined
                            }
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? 'font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="truncate text-left min-w-0 pr-2">
                              <div className="truncate text-xs">{model.name}</div>
                              {model.id !== model.name && (
                                <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate">
                                  {model.id}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <Check
                                className="w-3.5 h-3.5 shrink-0"
                                style={{ color: 'var(--color-primary)' }}
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelSelect
