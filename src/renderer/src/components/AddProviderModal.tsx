import React, { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, Plus, Eye, EyeOff, Server } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ModelProvider, ApiProtocolType } from '../types'

interface AddProviderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (provider: ModelProvider) => void
}

export const AddProviderModal: React.FC<AddProviderModalProps> = ({
  open,
  onOpenChange,
  onAdd
}) => {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [apiType, setApiType] = useState<ApiProtocolType>('openai')
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [apiKey, setApiKey] = useState('')
  const [modelId, setModelId] = useState('')
  const [description, setDescription] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    setName('')
    setApiType('openai')
    setBaseUrl('https://api.openai.com/v1')
    setApiKey('')
    setModelId('')
    setDescription('')
    setError(null)
    onOpenChange(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('modelSettings.nameRequired') || '请输入服务商名称')
      return
    }
    if (!baseUrl.trim()) {
      setError(t('modelSettings.baseUrlRequired') || '请输入 API 基础地址')
      return
    }
    if (!modelId.trim()) {
      setError(t('modelSettings.modelRequired') || '请输入默认模型名称/ID')
      return
    }

    const uniqueId = `custom-${Date.now()}`
    const trimmedModelId = modelId.trim()

    let badge = 'OpenAI'
    let badgeColor = '#10b981'
    if (apiType === 'anthropic') {
      badge = 'Claude'
      badgeColor = '#d97706'
    } else if (apiType === 'openai-responses') {
      badge = 'Responses'
      badgeColor = '#8b5cf6'
    }

    const newProvider: ModelProvider = {
      id: uniqueId,
      name: name.trim(),
      description:
        description.trim() ||
        (apiType === 'anthropic'
          ? '自定义 Anthropic Messages 接口服务商'
          : apiType === 'openai-responses'
            ? '自定义 OpenAI Responses 接口服务商'
            : t('modelSettings.customProviderDesc') || '自定义 OpenAI 兼容接口服务商'),
      baseUrl: baseUrl.trim().replace(/\/+$/, ''),
      apiKey: apiKey.trim(),
      apiType,
      enabled: true,
      isBuiltIn: false,
      isCustom: true,
      badge,
      badgeColor,
      models: [
        {
          id: trimmedModelId,
          name: trimmedModelId,
          providerId: uniqueId,
          enabled: true,
          description: '默认配置模型'
        }
      ]
    }

    onAdd(newProvider)
    handleClose()
  }

  const presets: Array<{
    id: string
    name: string
    apiType: ApiProtocolType
    baseUrl: string
    modelId: string
    description: string
  }> = [
    {
      id: 'ollama',
      name: 'Ollama 本地',
      apiType: 'openai',
      baseUrl: 'http://localhost:11434/v1',
      modelId: 'llama3.2',
      description: '本地私有化部署的大模型通道'
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      apiType: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      modelId: 'claude-3-5-sonnet-20241022',
      description: 'Anthropic Claude 官方 Messages 接口'
    },
    {
      id: 'openai-chat',
      name: 'OpenAI 官方 (Chat)',
      apiType: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      modelId: 'gpt-4o-mini',
      description: 'OpenAI 官方 Chat Completions 标准接口'
    },
    {
      id: 'openai-responses',
      name: 'OpenAI (Responses)',
      apiType: 'openai-responses',
      baseUrl: 'https://api.openai.com/v1',
      modelId: 'gpt-4o',
      description: 'OpenAI 官方新一代 Responses API 接口'
    },
    {
      id: 'siliconflow',
      name: 'SiliconFlow 硅基流动',
      apiType: 'openai',
      baseUrl: 'https://api.siliconflow.cn/v1',
      modelId: 'deepseek-ai/DeepSeek-V3',
      description: '高并发高性价比模型云服务'
    },
    {
      id: 'moonshot',
      name: 'Moonshot Kimi',
      apiType: 'openai',
      baseUrl: 'https://api.moonshot.cn/v1',
      modelId: 'moonshot-v1-8k',
      description: '月之暗面 Kimi 官方开放平台'
    },
    {
      id: 'qwen',
      name: '通义千问 Qwen',
      apiType: 'openai',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      modelId: 'qwen-plus',
      description: '阿里云百炼通义千问系列模型'
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      apiType: 'openai',
      baseUrl: 'https://openrouter.ai/api/v1',
      modelId: 'google/gemini-2.0-flash-exp:free',
      description: '全球主流大模型聚合通道'
    }
  ]

  const applyPreset = (preset: (typeof presets)[0]) => {
    setName(preset.name)
    setApiType(preset.apiType)
    setBaseUrl(preset.baseUrl)
    setModelId(preset.modelId)
    setDescription(preset.description)
    if (error) setError(null)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800/80 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] select-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center space-x-2">
              <div
                style={{
                  backgroundColor: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary-border)'
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center border"
              >
                <Server className="w-4 h-4" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {t('modelSettings.addProviderTitle') || '添加模型服务商'}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('modelSettings.addProviderDesc') ||
                    '配置兼容 OpenAI 格式的第三方或私有部署模型通道'}
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close
              onClick={handleClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Quick Preset Templates */}
          <div className="mt-3.5 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {t('modelSettings.quickPresets') || '快捷模版预设 (点击自动填入)'}
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2 py-1.5 text-[11px] font-medium rounded-lg bg-slate-100/80 dark:bg-slate-800/80 hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer truncate text-left"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="mt-3.5 space-y-3.5">
            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-1.5">
                <span>{error}</span>
              </div>
            )}

            {/* 接口协议规范选择 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                  <span>{t('modelSettings.apiProtocol') || '接口协议规范'}</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {apiType === 'openai'
                    ? 'POST /v1/chat/completions'
                    : apiType === 'anthropic'
                      ? 'POST /v1/messages'
                      : 'POST /v1/responses'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    type: 'openai' as ApiProtocolType,
                    label: t('modelSettings.protocolOpenAIChat') || 'OpenAI (Chat)',
                    tag: 'Chat Completions',
                    desc: '通用 95%+ 服务商'
                  },
                  {
                    type: 'anthropic' as ApiProtocolType,
                    label: t('modelSettings.protocolAnthropic') || 'Anthropic (Claude)',
                    tag: 'Messages',
                    desc: 'Claude 官方及专线'
                  },
                  {
                    type: 'openai-responses' as ApiProtocolType,
                    label: t('modelSettings.protocolOpenAIResponses') || 'OpenAI Responses',
                    tag: 'Responses API',
                    desc: '新一代统一端点'
                  }
                ].map((proto) => {
                  const isActive = apiType === proto.type
                  return (
                    <button
                      key={proto.type}
                      type="button"
                      onClick={() => {
                        setApiType(proto.type)
                        if (proto.type === 'anthropic' && baseUrl === 'https://api.openai.com/v1') {
                          setBaseUrl('https://api.anthropic.com/v1')
                          if (!modelId || modelId === 'gpt-4o-mini') {
                            setModelId('claude-3-5-sonnet-20241022')
                          }
                        } else if (
                          proto.type !== 'anthropic' &&
                          baseUrl === 'https://api.anthropic.com/v1'
                        ) {
                          setBaseUrl('https://api.openai.com/v1')
                          if (modelId === 'claude-3-5-sonnet-20241022') {
                            setModelId(proto.type === 'openai-responses' ? 'gpt-4o' : 'gpt-4o-mini')
                          }
                        }
                      }}
                      style={
                        isActive
                          ? {
                              borderColor: 'var(--color-primary)',
                              backgroundColor: 'var(--color-primary-subtle)',
                              color: 'var(--color-primary)'
                            }
                          : undefined
                      }
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        isActive
                          ? 'font-semibold shadow-2xs'
                          : 'border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-[11px] font-semibold truncate">{proto.label}</div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                        {proto.tag}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 服务商名称 */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <span>{t('modelSettings.providerName') || '服务商名称'}</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError(null)
                }}
                placeholder={
                  t('modelSettings.providerNamePlaceholder') || '例如: Ollama / 硅基流动 / OneAPI'
                }
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {/* API 基础地址 */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <span>{t('modelSettings.apiAddress') || 'API 基础地址 (Base URL)'}</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="https://api.openai.com/v1 或 http://localhost:11434/v1"
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)] font-mono"
              />
            </div>

            {/* API 密钥 (选填) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {t('modelSettings.apiKey') || 'API 密钥 (API Key)'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {t('modelSettings.apiKeyOptional') || '本地部署可留空'}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showApiKey ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* 默认模型 ID */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <span>{t('modelSettings.defaultModelId') || '默认模型 ID / 名称'}</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={modelId}
                onChange={(e) => {
                  setModelId(e.target.value)
                  if (error) setError(null)
                }}
                placeholder={
                  t('modelSettings.defaultModelPlaceholder') ||
                  '例如: gpt-4o-mini / deepseek-chat / llama3.2'
                }
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)] font-mono"
              />
            </div>

            {/* 描述说明 */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('modelSettings.description') || '服务商描述 (可选)'}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  t('modelSettings.descPlaceholder') || '简短描述，例如: 本地 Ollama 私有化大模型'
                }
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t('common.cancel') || '取消'}
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)'
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 shadow-2xs cursor-pointer flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('modelSettings.confirmAdd') || '确认添加'}</span>
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export default AddProviderModal
