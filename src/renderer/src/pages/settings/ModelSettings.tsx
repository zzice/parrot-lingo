import React, { useState } from 'react'
import {
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
  Plus,
  GripVertical,
  Pin,
  Trash2,
  Activity,
  AlertCircle
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '../../stores/useAppStore'
import { TestConnectionResult, ModelProvider, RemoteModelItem, ModelItem } from '../../types'
import { Switch } from '../../components/ui/switch'
import { ProviderIcon } from '../../components/ProviderIcon'
import { AddProviderModal } from '../../components/AddProviderModal'
import { SelectModelModal } from '../../components/SelectModelModal'

interface SortableProviderItemProps {
  provider: ModelProvider
  isSelected: boolean
  isPinned: boolean
  searchActive: boolean
  onSelect: () => void
}

const SortableProviderItem: React.FC<SortableProviderItemProps> = ({
  provider,
  isSelected,
  isPinned,
  searchActive,
  onSelect
}) => {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: provider.id,
    disabled: isPinned || searchActive
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.25 : 1
  }

  const enabledCount = provider.models.filter((m) => m.enabled).length

  return (
    <div ref={setNodeRef} style={style} className="relative group select-none">
      <button
        type="button"
        onClick={onSelect}
        style={
          isSelected
            ? {
                backgroundColor: 'var(--color-primary-subtle)',
                borderColor: 'var(--color-primary-border)',
                color: 'var(--color-primary)'
              }
            : undefined
        }
        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer border transition-all ${
          isSelected
            ? 'shadow-2xs font-semibold'
            : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-transparent'
        }`}
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          {/* 拖拽手柄 / 置顶图标：统一 16px 宽高度容器，保证所有列表项 Logo 严格垂直对齐 */}
          <div className="w-4 h-4 flex items-center justify-center shrink-0">
            {isPinned ? (
              <Pin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            ) : (
              <div
                {...attributes}
                {...listeners}
                className="p-0.5 rounded cursor-grab active:cursor-grabbing hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors"
                title="按住拖拽排序"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {/* 服务商图标 */}
          <ProviderIcon id={provider.id} name={provider.name} icon={provider.icon} size="md" />

          <div className="truncate text-left min-w-0 flex-1">
            <div className="font-medium truncate leading-tight">{provider.name}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {t('modelSettings.modelsCount', { count: enabledCount })}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {provider.badge && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium"
              style={{
                backgroundColor: `${provider.badgeColor || '#10b981'}20`,
                color: provider.badgeColor || '#10b981'
              }}
            >
              {provider.badge}
            </span>
          )}
          <div
            style={provider.enabled ? { backgroundColor: 'var(--color-primary)' } : undefined}
            className={`w-2 h-2 rounded-full ${
              provider.enabled ? 'shadow-2xs' : 'bg-slate-400 dark:bg-slate-600'
            }`}
          />
        </div>
      </button>
    </div>
  )
}

export const ModelSettings: React.FC = () => {
  const {
    providers,
    selectedProviderId,
    setSelectedProviderId,
    addProvider,
    updateProvider,
    deleteProvider,
    reorderProviders,
    addModel,
    deleteModel,
    toggleModel
  } = useAppStore()
  const { t } = useTranslation()

  const [searchFilter, setSearchFilter] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [fetchResultMsg, setFetchResultMsg] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 模型选择弹窗状态
  const [isSelectModelModalOpen, setIsSelectModelModalOpen] = useState(false)
  const [remoteModelsList, setRemoteModelsList] = useState<RemoteModelItem[]>([])

  // 单模型业务探针检验状态
  const [modelCheckResults, setModelCheckResults] = useState<
    Record<string, { checking?: boolean; success?: boolean; message?: string; latency?: number }>
  >({})

  // @dnd-kit 拖拽状态与传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // 鼠标移动 5px 后触发拖拽，丝滑且防止普通点击误判
      }
    })
  )

  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const activeDragProvider = activeDragId ? providers.find((p) => p.id === activeDragId) : null

  // 添加自定义模型状态
  const [showAddModel, setShowAddModel] = useState(false)
  const [newModelId, setNewModelId] = useState('')
  const [newModelName, setNewModelName] = useState('')

  const activeProvider = providers.find((p) => p.id === selectedProviderId) || providers[0]

  const filteredProviders = providers.filter((p) =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase())
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)

    if (over && active.id !== over.id) {
      const oldIndex = providers.findIndex((p) => p.id === active.id)
      const newIndex = providers.findIndex((p) => p.id === over.id)

      // 禁止移动置顶项（index === 0），且禁止移动到第 0 项上方
      if (oldIndex > 0 && newIndex > 0) {
        const nextProviders = arrayMove(providers, oldIndex, newIndex)
        reorderProviders(nextProviders.map((p) => p.id))
      }
    }
  }

  const handleDragCancel = () => {
    setActiveDragId(null)
  }

  const handleTestConnection = async () => {
    if (!activeProvider || !window.api?.providers) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await window.api.providers.testConnection(activeProvider.id)
      setTestResult(res)
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || t('modelSettings.connectionError')
      })
    } finally {
      setTesting(false)
    }
  }

  const handleCheckModel = async (modelId: string) => {
    if (!activeProvider || !window.api?.providers?.checkModel) return
    const key = `${activeProvider.id}:${modelId}`
    setModelCheckResults((prev) => ({
      ...prev,
      [key]: { checking: true }
    }))
    try {
      const res = await window.api.providers.checkModel(activeProvider.id, modelId)
      setModelCheckResults((prev) => ({
        ...prev,
        [key]: {
          checking: false,
          success: res.success,
          message: res.message,
          latency: res.latency
        }
      }))
    } catch (e: any) {
      setModelCheckResults((prev) => ({
        ...prev,
        [key]: {
          checking: false,
          success: false,
          message: e.message || '检测失败'
        }
      }))
    }
  }

  const handleFetchRemoteModels = async () => {
    if (!activeProvider || !window.api?.providers) return

    setFetchingModels(true)
    setFetchResultMsg(null)
    try {
      const res = await window.api.providers.fetchRemoteModels(activeProvider.id)
      if (res.success && res.models && res.models.length > 0) {
        setRemoteModelsList(res.models)
        setIsSelectModelModalOpen(true)
      } else {
        setFetchResultMsg(res.message || '未获取到可用模型')
        setTimeout(() => setFetchResultMsg(null), 4000)
      }
    } catch (e: any) {
      setFetchResultMsg(e.message || '获取失败')
      setTimeout(() => setFetchResultMsg(null), 4000)
    } finally {
      setFetchingModels(false)
    }
  }

  const handleSaveSelectedModels = async (selectedIds: string[]) => {
    if (!activeProvider) return
    const existingMap = new Map(activeProvider.models.map((m) => [m.id, m]))
    const remoteMap = new Map(remoteModelsList.map((m) => [m.id, m]))

    const newModels: ModelItem[] = selectedIds.map((id) => {
      const existing = existingMap.get(id)
      const remote = remoteMap.get(id)
      return {
        id,
        name: existing?.name || remote?.name || id,
        providerId: activeProvider.id,
        enabled: existing ? existing.enabled : true,
        description: existing?.description || remote?.description || `远程获取模型 (${id})`
      }
    })

    await updateProvider(activeProvider.id, { models: newModels })
    setFetchResultMsg(
      t('modelSettings.saveModelsSuccess', { count: newModels.length }) ||
        `已成功保存 ${newModels.length} 个可用模型`
    )
    setTimeout(() => setFetchResultMsg(null), 3000)
  }

  const handleToggleProvider = (enabled: boolean) => {
    if (!activeProvider) return
    updateProvider(activeProvider.id, { enabled })
  }

  const handleApiKeyChange = (apiKey: string) => {
    if (!activeProvider) return
    updateProvider(activeProvider.id, { apiKey })
  }

  const handleBaseUrlChange = (baseUrl: string) => {
    if (!activeProvider) return
    updateProvider(activeProvider.id, { baseUrl })
  }

  const handleNameChange = (name: string) => {
    if (!activeProvider || !activeProvider.isCustom) return
    updateProvider(activeProvider.id, { name })
  }

  const handleDescriptionChange = (description: string) => {
    if (!activeProvider) return
    updateProvider(activeProvider.id, { description })
  }

  const handleAddCustomProvider = async (newProvider: ModelProvider) => {
    await addProvider(newProvider)
  }

  const handleDeleteActiveProvider = async () => {
    if (!activeProvider || activeProvider.isBuiltIn || activeProvider.id === 'parrotlingo') return
    await deleteProvider(activeProvider.id)
    setShowDeleteConfirm(false)
  }

  const handleAddNewModel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeProvider || !newModelId.trim()) return

    const trimmedId = newModelId.trim()
    const trimmedName = newModelName.trim() || trimmedId

    await addModel(activeProvider.id, {
      id: trimmedId,
      name: trimmedName,
      providerId: activeProvider.id,
      enabled: true,
      description: '自定义添加模型'
    })

    setNewModelId('')
    setNewModelName('')
    setShowAddModel(false)
  }

  return (
    <div className="flex-1 h-full flex overflow-hidden select-none">
      {/* 左侧平台列表栏 */}
      <div className="w-68 border-r border-slate-200 dark:border-slate-800/80 flex flex-col bg-slate-50 dark:bg-slate-900/60 shrink-0">
        {/* 搜索框 */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={t('modelSettings.searchPlaceholder')}
              className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* 平台列表 (@dnd-kit 拖拽) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={filteredProviders.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredProviders.map((p, index) => {
                const isSelected = p.id === activeProvider?.id
                const isPinned = p.isPinned || p.id === 'parrotlingo' || index === 0

                return (
                  <SortableProviderItem
                    key={p.id}
                    provider={p}
                    isSelected={isSelected}
                    isPinned={isPinned}
                    searchActive={!!searchFilter.trim()}
                    onSelect={() => {
                      setSelectedProviderId(p.id)
                      setTestResult(null)
                      setShowDeleteConfirm(false)
                    }}
                  />
                )
              })}
            </SortableContext>

            {/* 顶层拖拽跟随卡片 (零白边、纯圆角悬浮) */}
            <DragOverlay
              dropAnimation={{
                duration: 180,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
              }}
            >
              {activeDragProvider ? (
                <div className="p-2.5 rounded-xl text-xs flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl scale-[1.02] cursor-grabbing select-none">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <GripVertical className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                    <ProviderIcon
                      id={activeDragProvider.id}
                      name={activeDragProvider.name}
                      icon={activeDragProvider.icon}
                      size="md"
                    />
                    <div className="truncate text-left min-w-0">
                      <div className="font-medium text-slate-800 dark:text-slate-100 truncate">
                        {activeDragProvider.name}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {t('modelSettings.modelsCount', {
                          count: activeDragProvider.models.filter((m) => m.enabled).length
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {activeDragProvider.badge && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium"
                        style={{
                          backgroundColor: `${activeDragProvider.badgeColor || '#10b981'}20`,
                          color: activeDragProvider.badgeColor || '#10b981'
                        }}
                      >
                        {activeDragProvider.badge}
                      </span>
                    )}
                    <div
                      style={
                        activeDragProvider.enabled
                          ? { backgroundColor: 'var(--color-primary)' }
                          : undefined
                      }
                      className={`w-2 h-2 rounded-full ${
                        activeDragProvider.enabled ? 'shadow-2xs' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                    />
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* 底部：添加服务商按钮 */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700/80 hover:border-[var(--color-primary)] text-slate-600 dark:text-slate-300 hover:text-[var(--color-primary)] bg-white/60 dark:bg-slate-900/60 hover:bg-[var(--color-primary-subtle)] text-xs font-medium transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('modelSettings.addProvider')}</span>
          </button>
        </div>
      </div>

      {/* 右侧平台配置与模型卡片 */}
      {activeProvider && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 顶部主卡片 Header */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-5 shadow-2xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <ProviderIcon
                  id={activeProvider.id}
                  name={activeProvider.name}
                  icon={activeProvider.icon}
                  size="lg"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {activeProvider.name}
                    </h2>
                    {activeProvider.isBuiltIn && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: 'var(--color-primary-subtle)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--color-primary-border)'
                        }}
                      >
                        {t('modelSettings.builtInTag')}
                      </span>
                    )}
                    {activeProvider.isCustom && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                        {activeProvider.apiType === 'anthropic'
                          ? 'Anthropic'
                          : activeProvider.apiType === 'openai-responses'
                            ? 'OpenAI Responses'
                            : 'OpenAI'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeProvider.description}
                  </p>
                </div>
              </div>

              {/* 右侧控制：开关与删除服务商（仅允许删除用户新增的自定义服务商） */}
              <div className="flex items-center space-x-3">
                {Boolean(activeProvider.isCustom) && (
                  <div>
                    {showDeleteConfirm ? (
                      <div className="flex items-center space-x-1.5 p-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                        <span className="text-[11px] font-medium">确认删除？</span>
                        <button
                          type="button"
                          onClick={handleDeleteActiveProvider}
                          className="px-2 py-0.5 bg-rose-600 text-white rounded font-semibold hover:bg-rose-700 cursor-pointer text-[11px]"
                        >
                          删除
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-1.5 py-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer text-[11px]"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title={t('modelSettings.deleteProvider')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* 启用开关 */}
                <Switch
                  checked={activeProvider.enabled}
                  onCheckedChange={(checked) => handleToggleProvider(checked)}
                />
              </div>
            </div>

            {/* 自定义服务商专属：服务商名称编辑 */}
            {Boolean(activeProvider.isCustom) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {t('modelSettings.providerName')}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {t('modelSettings.providerNamePlaceholder') || '自定义服务商显示名称'}
                  </span>
                </div>
                <input
                  type="text"
                  value={activeProvider.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('modelSettings.providerName') || '服务商名称'}
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            )}

            {/* 服务商备注 / 描述编辑 (内置与自定义均支持) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {t('modelSettings.providerDescription') || '服务商备注'}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('modelSettings.providerDescTip') || '自定义备注信息，便于区分使用场景'}
                </span>
              </div>
              <input
                type="text"
                value={activeProvider.description || ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder={t('modelSettings.descPlaceholder') || '请输入服务商备注说明（选填）'}
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {/* API 密钥输入区 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {t('modelSettings.apiKey')}
                </span>
                {activeProvider.apiKeyDocUrl && (
                  <a
                    href={activeProvider.apiKeyDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--color-primary)' }}
                    className="hover:underline flex items-center space-x-1"
                  >
                    <span>{t('modelSettings.getKey')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={activeProvider.apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder={t('modelSettings.customKeyPlaceholder') || '请输入 API 密钥'}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] font-mono"
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
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-primary-foreground)'
                  }}
                  className="px-4 py-2 hover:opacity-90 disabled:opacity-50 rounded-lg text-xs font-medium flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? t('modelSettings.testing') : t('modelSettings.test')}</span>
                </button>
              </div>

              {/* 连通性测试结果提示 */}
              {testResult && (
                <div
                  className={`mt-2 p-2.5 rounded-lg flex items-center space-x-2 text-xs ${
                    testResult.success
                      ? 'border shadow-2xs'
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}
                  style={
                    testResult.success
                      ? {
                          backgroundColor: 'var(--color-primary-subtle)',
                          borderColor: 'var(--color-primary-border)',
                          color: 'var(--color-primary)'
                        }
                      : undefined
                  }
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* API 地址配置 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {t('modelSettings.apiAddress')}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('modelSettings.endpointConfig')}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={activeProvider.baseUrl}
                  onChange={(e) => handleBaseUrlChange(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="flex-1 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)] font-mono"
                />
              </div>
            </div>
          </div>

          {/* 下方模型列表区域 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide uppercase">
                  {t('modelSettings.modelsList')} ({activeProvider.models.length})
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                {/* 手动添加模型按钮 */}
                <button
                  type="button"
                  onClick={() => setShowAddModel((prev) => !prev)}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-[var(--color-primary)] flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-200/60 dark:bg-slate-800/60 hover:bg-[var(--color-primary-subtle)] cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t('modelSettings.addModel')}</span>
                </button>

                {/* 获取/刷新远程模型列表按钮 */}
                <button
                  type="button"
                  onClick={handleFetchRemoteModels}
                  disabled={fetchingModels}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-200/60 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`} />
                  <span>{fetchingModels ? '拉取中...' : t('modelSettings.refreshList')}</span>
                </button>
              </div>
            </div>

            {/* 获取远程模型反馈提示 */}
            {fetchResultMsg && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 ${
                  fetchResultMsg.includes('成功')
                    ? 'border shadow-2xs'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}
                style={
                  fetchResultMsg.includes('成功')
                    ? {
                        backgroundColor: 'var(--color-primary-subtle)',
                        borderColor: 'var(--color-primary-border)',
                        color: 'var(--color-primary)'
                      }
                    : undefined
                }
              >
                {fetchResultMsg.includes('成功') ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{fetchResultMsg}</span>
              </div>
            )}

            {/* 手动添加新模型折叠面板 */}
            {showAddModel && (
              <form
                onSubmit={handleAddNewModel}
                className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('modelSettings.addCustomModelTitle')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddModel(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newModelId}
                    onChange={(e) => setNewModelId(e.target.value)}
                    placeholder={t('modelSettings.modelIdPlaceholder')}
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)] font-mono"
                  />
                  <input
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder={t('modelSettings.modelNamePlaceholder')}
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModel(false)}
                    className="px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!newModelId.trim()}
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-foreground)'
                    }}
                    className="px-3 py-1 text-xs rounded hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {t('common.confirm')}
                  </button>
                </div>
              </form>
            )}

            {/* 模型列表为空时的友好引导卡片 */}
            {activeProvider.models.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div
                  style={{
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary)',
                    borderColor: 'var(--color-primary-border)'
                  }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto border shadow-2xs"
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t('modelSettings.noModelsAddedTitle') || '暂无可用模型'}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                    {t('modelSettings.noModelsAddedDesc') ||
                      '请填写 API Key 后，点击上方「获取/刷新列表」选取需要启用的模型，或点击「+ 添加模型」手动录入'}
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleFetchRemoteModels}
                    disabled={fetchingModels}
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-foreground)'
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${fetchingModels ? 'animate-spin' : ''}`}
                    />
                    <span>
                      {fetchingModels
                        ? '拉取中...'
                        : t('modelSettings.refreshList') || '获取模型列表'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModel(true)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer flex items-center space-x-1 border border-slate-200/80 dark:border-slate-700/80"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('modelSettings.addModel') || '添加模型'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* 模型条目列表 */
              <div className="space-y-2">
                {activeProvider.models.map((model) => (
                  <div
                    key={model.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 flex items-center justify-between shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0 pr-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {model.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {model.id}
                        </span>
                      </div>
                      {model.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {model.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2.5 shrink-0">
                      {/* 单模型业务探针检测与延迟徽标 */}
                      {(() => {
                        const checkKey = `${activeProvider.id}:${model.id}`
                        const checkInfo = modelCheckResults[checkKey]

                        if (checkInfo?.checking) {
                          return (
                            <div className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-medium animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>{t('modelSettings.checking') || '检测中...'}</span>
                            </div>
                          )
                        }

                        if (checkInfo && !checkInfo.checking) {
                          return (
                            <div className="flex items-center space-x-1">
                              {checkInfo.success ? (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium flex items-center space-x-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs"
                                  title={checkInfo.message}
                                >
                                  <Activity className="w-2.5 h-2.5" />
                                  <span>{checkInfo.latency}ms</span>
                                </span>
                              ) : (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center space-x-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 max-w-[130px] truncate shadow-2xs"
                                  title={checkInfo.message}
                                >
                                  <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{checkInfo.message}</span>
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCheckModel(model.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title={t('modelSettings.recheck') || '重新检测'}
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        }

                        return (
                          <button
                            type="button"
                            onClick={() => handleCheckModel(model.id)}
                            className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center space-x-1 transition-colors border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
                            title={t('modelSettings.checkModel') || '检测此模型可用性与延迟'}
                          >
                            <Activity className="w-3 h-3 text-slate-400" />
                            <span>{t('modelSettings.checkModel') || '检测'}</span>
                          </button>
                        )
                      })()}

                      {/* 模型删除按钮 */}
                      <button
                        type="button"
                        onClick={() => deleteModel(activeProvider.id, model.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                        title={t('modelSettings.deleteModel')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <Switch
                        checked={model.enabled}
                        onCheckedChange={(checked) =>
                          toggleModel(activeProvider.id, model.id, checked)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 添加服务商弹窗 */}
      <AddProviderModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onAdd={handleAddCustomProvider}
      />

      {/* 获取与选择模型弹窗 */}
      {activeProvider && (
        <SelectModelModal
          open={isSelectModelModalOpen}
          onOpenChange={setIsSelectModelModalOpen}
          providerName={activeProvider.name}
          remoteModels={remoteModelsList}
          currentSelectedIds={activeProvider.models.map((m) => m.id)}
          onSave={handleSaveSelectedModels}
        />
      )}
    </div>
  )
}

export default ModelSettings
