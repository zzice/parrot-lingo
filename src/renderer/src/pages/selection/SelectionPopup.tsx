import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Languages,
  FileQuestion,
  Volume2,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Copy,
  Pin,
  Droplet,
  ChevronDown,
  ChevronUp,
  CircleX,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ExplainRequest, ExplainResponse } from '../../types'
import { useAppStore } from '../../stores/useAppStore'
import { Slider } from '../../components/ui/slider'
import { ModelSelect } from '../../components/ModelSelect'
import { applyThemeColorToDOM } from '../../utils/theme'
import { formatAppName } from '../../utils/formatApp'

import i18n, { resolveLanguage } from '../../i18n'

export const SelectionPopup: React.FC = () => {
  const { t } = useTranslation()
  const { settings, fetchSettings, updateSettings, fetchProviders, init } = useAppStore()

  const [selectedText, setSelectedText] = useState('')
  const [contextText, setContextText] = useState('')
  const [actionType, setActionType] = useState<'translate' | 'explain'>('translate')
  const [currentModelKey, setCurrentModelKey] = useState<string>('follow')
  const [loading, setLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [result, setResult] = useState<ExplainResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [sourceApp, setSourceApp] = useState<string>('')

  const [isPinned, setIsPinned] = useState<boolean>(() => Boolean(settings?.selection?.autoPin))
  const [showOriginal, setShowOriginal] = useState(false)
  const [showOpacitySlider, setShowOpacitySlider] = useState(false)
  const [localOpacity, setLocalOpacity] = useState<number>(
    () => settings?.selection?.opacity ?? 100
  )

  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')

  // 初始化设置与透明模式与服务商列表
  useEffect(() => {
    document.documentElement.classList.add('selection-popup-active')
    document.body.classList.add('selection-popup-active')
    init()
    fetchSettings().then(() => {
      const curSettings = useAppStore.getState().settings
      if (curSettings?.selection) {
        setLocalOpacity(curSettings.selection.opacity ?? 100)
        setIsPinned(Boolean(curSettings.selection.autoPin))
      }
    })
    fetchProviders()

    return () => {
      document.documentElement.classList.remove('selection-popup-active')
      document.body.classList.remove('selection-popup-active')
    }
  }, [init, fetchSettings, fetchProviders])

  useEffect(() => {
    if (settings?.system) {
      if (settings.system.themeColor) {
        applyThemeColorToDOM(settings.system.themeColor)
      }
      if (settings.system.theme) {
        const root = document.documentElement
        root.classList.remove('dark', 'light')
        const isDark =
          settings.system.theme === 'dark' ||
          (settings.system.theme === 'system' &&
            window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches)
        root.classList.add(isDark ? 'dark' : 'light')
      }
      if (settings.system.language) {
        i18n.changeLanguage(resolveLanguage(settings.system.language))
      }
    }
  }, [settings?.system])

  // 保存入库状态与倒计时管理
  const [saveInfo, setSaveInfo] = useState<{
    encounterId: string
    isFirst: boolean
    count: number
    undone: boolean
    secondsLeft: number
  } | null>(null)

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const inFlightReqIdRef = useRef<number>(0)
  const lastFetchedKeyRef = useRef<string>('')
  const sourceAppRef = useRef<string | null>(null)
  const currentModelKeyRef = useRef<string>(currentModelKey)
  const streamAbortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    currentModelKeyRef.current = currentModelKey
  }, [currentModelKey])

  const clearCountdown = (): void => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearCountdown()
      if (streamAbortRef.current) {
        streamAbortRef.current()
        streamAbortRef.current = null
      }
    }
  }, [])

  const fetchExplanation = useCallback(
    async (
      text: string,
      context?: string,
      action: 'translate' | 'explain' = 'translate',
      overrideModelKey?: string,
      force = false
    ) => {
      const cleanText = text.trim()
      if (!cleanText || !window.api?.ai) {
        setLoading(false)
        setIsStreaming(false)
        return
      }

      const modelKey = overrideModelKey ?? currentModelKeyRef.current
      const cacheKey = `${cleanText}:::${context || ''}:::${action}:::${modelKey}`

      // 防抖去重：如果完全相同的文本+语境+模式+模型已请求过且未指定强制刷新，直接忽略
      if (!force && lastFetchedKeyRef.current === cacheKey) {
        return
      }

      lastFetchedKeyRef.current = cacheKey
      const thisReqId = ++inFlightReqIdRef.current

      clearCountdown()
      if (streamAbortRef.current) {
        streamAbortRef.current()
        streamAbortRef.current = null
      }

      setLoading(true)
      setIsStreaming(true)
      setSaveInfo(null)
      setResult(null)

      const reqPayload: ExplainRequest = {
        text: cleanText,
        context,
        task: action,
        force
      }
      if (modelKey && modelKey !== 'follow') {
        if (modelKey.includes(':')) {
          const [pId, mId] = modelKey.split(':')
          reqPayload.providerId = pId
          reqPayload.modelId = mId
        } else {
          reqPayload.modelId = modelKey
        }
      }

      let lastRenderTime = 0
      let pendingData: Partial<ExplainResponse> | null = null
      let animationFrameId: number | null = null

      const abortFn = window.api.ai.explainStream(
        reqPayload,
        async (partialData, isDone, error) => {
          if (inFlightReqIdRef.current !== thisReqId) return

          if (error) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId)
            setIsStreaming(false)
            setLoading(false)
            setResult({
              text: cleanText,
              translation: '',
              error: error || '翻译失败',
              ...partialData
            })
            return
          }

          if (isDone) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId)
            setIsStreaming(false)
            setLoading(false)

            const finalRes: ExplainResponse = {
              text: cleanText,
              translation: partialData.translation || '',
              detectedLanguage: partialData.detectedLanguage,
              phonetic: partialData.phonetic,
              phoneticUk: partialData.phoneticUk,
              phoneticUs: partialData.phoneticUs,
              partOfSpeech: partialData.partOfSpeech,
              posExplanations: partialData.posExplanations,
              contextMeaning: partialData.contextMeaning,
              explanation: partialData.explanation,
              difficulty: partialData.difficulty,
              alternativeExpressions: partialData.alternativeExpressions,
              bilingualExample: partialData.bilingualExample,
              tags: partialData.tags,
              targetLanguage: partialData.targetLanguage,
              providerName: partialData.providerName,
              modelName: partialData.modelName,
              error: partialData.error
            }

            setResult(finalRes)

            // 核心逻辑：划词即存，全量自动入库 + 5s 撤销窗口 (真实记录被划词的应用来源)
            if (finalRes.translation && window.api?.encounters) {
              try {
                const currentApp = sourceAppRef.current || undefined
                const appTag = currentApp ? currentApp : undefined
                const customTags =
                  finalRes.tags && finalRes.tags.length > 0 ? finalRes.tags : appTag ? [appTag] : []

                const saveRes = await window.api.encounters.add({
                  text: finalRes.text || cleanText,
                  phonetic: finalRes.phonetic,
                  phoneticUk: finalRes.phoneticUk,
                  phoneticUs: finalRes.phoneticUs,
                  partOfSpeech: finalRes.partOfSpeech,
                  posExplanations: finalRes.posExplanations,
                  contextMeaning: finalRes.contextMeaning,
                  translation: finalRes.translation,
                  explanation: finalRes.explanation,
                  difficulty: finalRes.difficulty,
                  targetLanguage: finalRes.targetLanguage,
                  alternativeExpressions: finalRes.alternativeExpressions || [],
                  bilingualExample: finalRes.bilingualExample,
                  tags: customTags.length > 0 ? customTags : undefined,
                  context: context || finalRes.contextExample || undefined,
                  actionType: action,
                  sourceApp: currentApp
                })

                if (inFlightReqIdRef.current !== thisReqId) return

                setSaveInfo({
                  encounterId: saveRes.encounter.id,
                  isFirst: saveRes.isFirstEncounter,
                  count: saveRes.corpusItem.encounterCount,
                  undone: false,
                  secondsLeft: 5
                })

                // 启动 5 秒倒计时
                countdownTimerRef.current = setInterval(() => {
                  setSaveInfo((prev) => {
                    if (!prev) return null
                    if (prev.secondsLeft <= 1) {
                      clearCountdown()
                      return { ...prev, secondsLeft: 0 }
                    }
                    return { ...prev, secondsLeft: prev.secondsLeft - 1 }
                  })
                }, 1000)
              } catch (saveErr) {
                console.error('[SelectionPopup] Auto save error:', saveErr)
              }
            }
            return
          }

          // 流式传输中：只要解析出 translation 或内容，立即取消 loading 骨架屏
          pendingData = partialData
          if (partialData.translation || partialData.phoneticUk || partialData.phoneticUs) {
            setLoading(false)
          }

          const now = performance.now()
          if (now - lastRenderTime > 25) {
            lastRenderTime = now
            setResult(
              (prev) =>
                ({
                  ...(prev || {}),
                  ...pendingData,
                  text: cleanText
                }) as ExplainResponse
            )
          } else if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(() => {
              lastRenderTime = performance.now()
              if (pendingData) {
                setResult(
                  (prev) =>
                    ({
                      ...(prev || {}),
                      ...pendingData,
                      text: cleanText
                    }) as ExplainResponse
                )
              }
              animationFrameId = null
            })
          }
        }
      )

      streamAbortRef.current = abortFn
    },
    []
  )

  const resetState = useCallback(() => {
    lastFetchedKeyRef.current = ''
    clearCountdown()
    if (streamAbortRef.current) {
      streamAbortRef.current()
      streamAbortRef.current = null
    }
    setSelectedText('')
    setContextText('')
    setSourceApp('')
    sourceAppRef.current = null
    setResult(null)
    setLoading(false)
    setIsStreaming(false)
    setSaveInfo(null)
    setShowOriginal(false)
  }, [])

  const updateContent = useCallback(
    (
      payload: { text: string; context?: string; action?: string; sourceApp?: string },
      force = false
    ) => {
      clearCountdown()
      if (streamAbortRef.current) {
        streamAbortRef.current()
        streamAbortRef.current = null
      }
      setResult(null)
      setSaveInfo(null)
      setShowOriginal(false)

      const rawText = payload?.text || ''
      const cleanText = rawText.trim()

      setSelectedText(rawText)
      setContextText(payload?.context || '')
      const app = payload?.sourceApp || ''
      setSourceApp(app)
      sourceAppRef.current = app

      const type = payload?.action === 'explain' ? 'explain' : 'translate'
      setActionType(type)
      const title =
        type === 'translate'
          ? t('selectionSettings.actionTranslate') || '翻译'
          : t('selectionSettings.actionExplain') || '解释'
      document.title = `${title} - ParrotLingo`

      if (!cleanText) {
        setLoading(false)
        setIsStreaming(false)
        return
      }

      setLoading(true)
      setIsStreaming(false)
      fetchExplanation(cleanText, payload?.context, type, undefined, force)
    },
    [fetchExplanation, t]
  )

  const updateContentRef = React.useRef(updateContent)
  useEffect(() => {
    updateContentRef.current = updateContent
  }, [updateContent])

  // 初始化加载当前窗口专属数据 (仅在挂载时执行一次)
  useEffect(() => {
    let isMounted = true
    const loadInitData = async (): Promise<void> => {
      if (window.api?.selection?.getInitData) {
        const initData = await window.api.selection.getInitData()
        if (isMounted && initData?.text) {
          updateContentRef.current(initData)
        }
      }
    }
    loadInitData()
    return () => {
      isMounted = false
    }
  }, [])

  // 监听触发与重置事件 (仅在挂载时注册单次，通过 ref 保证获取最新逻辑，默认非强制刷新以命中本地缓存)
  useEffect(() => {
    if (window.events) {
      const cleanupReset = window.events.on('selection:reset', () => {
        resetState()
      })
      const cleanupTrigger = window.events.on(
        'selection:triggered',
        (payload: { text: string; context?: string; action?: string; sourceApp?: string }) => {
          fetchProviders()
          fetchSettings()
          setCurrentModelKey('follow')
          if (payload) {
            updateContentRef.current(payload, false)
          }
        }
      )
      return () => {
        if (cleanupReset) cleanupReset()
        if (cleanupTrigger) cleanupTrigger()
      }
    }
    return undefined
  }, [fetchProviders, fetchSettings, resetState])

  // 置顶切换
  const handleTogglePin = async (): Promise<void> => {
    const next = !isPinned
    setIsPinned(next)
    if (window.api?.selection) {
      await window.api.selection.togglePin()
    }
  }

  // 透明度拖动实时生效
  const handleOpacityChange = (value: number[]): void => {
    const val = value[0]
    setLocalOpacity(val)
    if (window.api?.selection) {
      window.api.selection.setOpacity(val)
    }
  }

  // 透明度释放保存到偏好
  const handleOpacityCommit = (value: number[]): void => {
    const val = value[0]
    if (settings?.selection) {
      updateSettings({
        selection: {
          ...settings.selection,
          opacity: val
        }
      })
    }
  }

  const detectSpeechLang = (str: string, fallback = 'en-US'): string => {
    if (!str) return fallback
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(str)) return 'ja-JP'
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(str)) return 'ko-KR'
    if (/[\u4E00-\u9FA5]/.test(str)) return 'zh-CN'
    return fallback
  }

  const speak = (text: string, lang?: string): void => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang || detectSpeechLang(text, 'en-US')
      utterance.rate = 0.8
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleUndoEncounter = async (): Promise<void> => {
    if (!saveInfo?.encounterId || !window.api?.encounters) return
    clearCountdown()
    await window.api.encounters.undo(saveInfo.encounterId)
    setSaveInfo((prev) => (prev ? { ...prev, undone: true, secondsLeft: 0 } : null))
  }

  const handleCopy = useCallback((): void => {
    if (!result?.translation) return
    navigator.clipboard.writeText(result.translation)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [result])

  const handleClose = useCallback((): void => {
    resetState()
    if (window.api?.windowControl) {
      window.api.windowControl.hideSelection()
    }
  }, [resetState])

  const handleRegenerate = useCallback((): void => {
    if (!selectedText.trim()) return
    fetchExplanation(selectedText, contextText, actionType, currentModelKey, true)
  }, [fetchExplanation, selectedText, contextText, actionType, currentModelKey])

  // 快捷键支持 (Esc 退出, R 重新生成, C 复制)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleClose()
      } else if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        handleRegenerate()
      } else if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // 如果用户没有选中文本，直接快捷键复制完整译文
        if (!window.getSelection()?.toString()) {
          handleCopy()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, handleCopy, handleRegenerate])

  return (
    <div className="w-screen h-screen m-0 p-0 select-none flex flex-col justify-between overflow-hidden bg-transparent">
      <div className="relative flex flex-col h-full w-full overflow-hidden rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-2xl">
        {/* 顶部 Header: 原生 Traffic Light 避让 + 标题 + 模型选择 + 置顶 + 透明度 */}
        <div
          className="flex h-9 flex-row items-center justify-between px-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 [-webkit-app-region:drag]"
          style={isMac ? { paddingLeft: '78px' } : {}}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0 pr-2">
            <div className="flex items-center space-x-1.5 shrink-0 text-slate-700 dark:text-slate-200">
              {actionType === 'translate' ? (
                <Languages
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: 'var(--color-primary)' }}
                />
              ) : (
                <FileQuestion
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: 'var(--color-primary)' }}
                />
              )}
              <span className="text-xs font-bold truncate shrink-0">
                {actionType === 'translate'
                  ? t('selectionSettings.actionTranslate') || '翻译'
                  : t('selectionSettings.actionExplain') || '解释'}
              </span>
            </div>

            {/* 划词弹窗即时切换模型 (放宽宽度上限，完整展示模型名，位置固定不位移) */}
            <div className="[-webkit-app-region:no-drag] shrink-0 min-w-[130px] max-w-[220px]">
              <ModelSelect
                value={currentModelKey}
                onChange={(val) => {
                  setCurrentModelKey(val)
                  fetchExplanation(selectedText, contextText, actionType, val, true)
                }}
                compact={true}
                allowFollow={true}
                followLabel="默认模型"
                className="h-6 py-0.5 px-2 text-[11px] bg-slate-100/90 dark:bg-slate-800/90 border-slate-200/70 dark:border-slate-700/70 shadow-2xs max-w-[220px]"
              />
            </div>
          </div>

          {/* 右侧控制按钮组 (置顶、透明度调节) */}
          <div className="relative flex items-center space-x-1 shrink-0 [-webkit-app-region:no-drag]">
            {/* 置顶按钮 */}
            <button
              type="button"
              tabIndex={-1}
              onClick={handleTogglePin}
              style={
                isPinned
                  ? {
                      color: 'var(--color-primary)',
                      backgroundColor: 'var(--color-primary-subtle)'
                    }
                  : undefined
              }
              className={`p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                isPinned
                  ? 'font-medium'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
              title={isPinned ? t('selectionPopup.unpinTooltip') : t('selectionPopup.pinTooltip')}
            >
              <Pin className={`w-3.5 h-3.5 transition-transform ${isPinned ? 'rotate-45' : ''}`} />
            </button>

            {/* 透明度调节按钮 */}
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowOpacitySlider((prev) => !prev)}
              style={
                showOpacitySlider
                  ? {
                      color: 'var(--color-primary)',
                      backgroundColor: 'var(--color-primary-subtle)'
                    }
                  : undefined
              }
              className={`p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                showOpacitySlider
                  ? 'font-medium'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
              title={t('selectionPopup.opacityTooltip')}
            >
              <Droplet className="w-3.5 h-3.5" />
            </button>

            {/* 透明度浮层卡片 */}
            {showOpacitySlider && (
              <div className="absolute top-full right-0 mt-2 z-50 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center space-y-2 w-44">
                <div className="flex items-center justify-between w-full text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{t('selectionSettings.opacity')}</span>
                  <span className="font-bold" style={{ color: 'var(--color-primary)' }}>
                    {localOpacity}%
                  </span>
                </div>
                <Slider
                  value={[localOpacity]}
                  min={20}
                  max={100}
                  step={1}
                  onValueChange={handleOpacityChange}
                  onValueCommit={handleOpacityCommit}
                />
              </div>
            )}

            {!isMac && (
              <button
                type="button"
                tabIndex={-1}
                onClick={handleClose}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
                title={t('selectionPopup.closeTooltip')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 顶部原文与词条标题栏 (纯净展示选中文本) */}
        {selectedText.trim() && (
          <div className="px-4 pt-3 flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="text-base font-bold text-slate-900 dark:text-slate-50 truncate max-w-[340px]">
                {selectedText}
              </span>
            </div>

            {/* 显示/折叠原文 */}
            <button
              type="button"
              onClick={() => setShowOriginal((prev) => !prev)}
              className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer select-none"
            >
              <span>
                {showOriginal ? t('selectionPopup.hideOriginal') : t('selectionPopup.showOriginal')}
              </span>
              {showOriginal ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}

        {/* 音标与注音展示区域 */}
        {selectedText.trim() &&
          (() => {
            const isEnglishSelection = /^[a-zA-Z\s'’-]+$/.test((selectedText || '').trim())
            const nonEnglishPhonetic =
              result?.phonetic ||
              (!isEnglishSelection ? result?.phoneticUs || result?.phoneticUk : undefined)

            if (isEnglishSelection) {
              if (!result?.phoneticUk && !result?.phoneticUs && !result?.phonetic) return null
              return (
                <div className="px-4 pt-1.5 flex items-center flex-wrap gap-2 text-xs font-mono">
                  {/* 英式音标 */}
                  {result.phoneticUk && (
                    <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 font-sans">英</span>
                      <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {result.phoneticUk}
                      </span>
                      <button
                        type="button"
                        onClick={() => speak(selectedText, 'en-GB')}
                        className="p-0.5 text-slate-400 hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                        title="英音朗读"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* 美式音标 */}
                  {result.phoneticUs && (
                    <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 font-sans">美</span>
                      <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {result.phoneticUs}
                      </span>
                      <button
                        type="button"
                        onClick={() => speak(selectedText, 'en-US')}
                        className="p-0.5 text-slate-400 hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                        title="美音朗读"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* 兜底单音标 */}
                  {!result.phoneticUk && !result.phoneticUs && result.phonetic && (
                    <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                      <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {result.phonetic}
                      </span>
                      <button
                        type="button"
                        onClick={() => speak(selectedText, 'en-US')}
                        className="p-0.5 text-slate-400 hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                        title="朗读"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            }

            // 非英语单词（韩文/日文/中文/法文等）专属注音标签
            if (!nonEnglishPhonetic) return null

            const getNativeLabel = (str: string, detected?: string): string => {
              if (detected === 'ja' || /[\u3040-\u309F\u30A0-\u30FF]/.test(str)) return '假名'
              if (detected === 'zh' || /[\u4E00-\u9FA5]/.test(str)) return '拼音'
              return '读音'
            }

            return (
              <div className="px-4 pt-1.5 flex items-center flex-wrap gap-2 text-xs font-mono">
                <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 font-sans">
                    {getNativeLabel(selectedText, result?.detectedLanguage)}
                  </span>
                  <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                    {nonEnglishPhonetic}
                  </span>
                  <button
                    type="button"
                    onClick={() => speak(selectedText)}
                    className="p-0.5 text-slate-400 hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                    title="朗读发音"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })()}

        {/* 折叠的原本文内容卡片 */}
        {showOriginal && selectedText.trim() && (
          <div className="mx-4 mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-400 italic">
            &ldquo;{contextText || selectedText}&rdquo;
          </div>
        )}

        {/* 顶部与翻译内容的分割线间隔 */}
        {selectedText.trim() && (
          <div className="mx-4 mt-2.5 h-px bg-slate-100 dark:border-b dark:border-slate-800/80" />
        )}

        {/* 中部内容展示区 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-xs select-text">
          {!selectedText.trim() && !loading ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 space-y-3 select-none">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                  {t('selectionPopup.emptySelectionTitle')}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 max-w-[280px] leading-relaxed">
                  {t('selectionPopup.emptySelectionHint')}
                </div>
              </div>
              {isMac && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.api?.system?.openAccessibilitySettings) {
                      window.api.system.openAccessibilitySettings()
                    }
                  }}
                  className="mt-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {t('selectionPopup.openAccessibility')}
                </button>
              )}
            </div>
          ) : loading ? (
            <div className="h-36 flex flex-col items-center justify-center text-slate-400 space-y-2.5 select-none">
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
                <Loader2
                  className="w-4 h-4 animate-spin"
                  style={{ color: 'var(--color-primary)' }}
                />
                <span>正在翻译中...</span>
              </div>
            </div>
          ) : result?.error ? (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs space-y-2.5">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="font-semibold text-rose-700 dark:text-rose-300">
                    {actionType === 'translate' ? '翻译服务调用异常' : '解释失败'}
                  </div>
                  <div className="text-rose-600/90 dark:text-rose-400/90 leading-relaxed break-all">
                    {result.error}
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (window.api?.windowControl) {
                      window.api.windowControl.openMain()
                    }
                  }}
                  className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 cursor-pointer shadow-xs"
                >
                  前往配置模型 API
                </button>
              </div>
            </div>
          ) : result?.translation ? (
            <>
              {/* A. 词性分类释义列表 或 核心译文 */}
              {result.posExplanations && result.posExplanations.length > 0 ? (
                <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/70 space-y-2.5 select-text shadow-2xs">
                  {result.posExplanations.map((item, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs leading-relaxed">
                      <span
                        style={{
                          backgroundColor: 'var(--color-primary-subtle)',
                          color: 'var(--color-primary)',
                          borderColor: 'var(--color-primary-border)'
                        }}
                        className="text-[10px] font-bold px-1.5 py-0.2 rounded border font-mono shrink-0 mt-0.5 shadow-2xs"
                      >
                        {item.pos || '释'}
                      </span>
                      <span className="text-slate-800 dark:text-slate-100 font-medium">
                        {item.meaning}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/70 text-slate-800 dark:text-slate-100 text-sm leading-relaxed font-normal whitespace-pre-wrap select-text flex items-start justify-between space-x-2">
                  <div className="flex-1">{result.translation}</div>
                  <button
                    type="button"
                    onClick={() => speak(result.translation)}
                    className="p-1 text-slate-400 hover:text-[var(--color-primary)] shrink-0 cursor-pointer"
                    title="朗读译文"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* B. 当前语境释义 */}
              {result.contextMeaning && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start space-x-1.5">
                  <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">
                    🎯 当前语境:
                  </span>
                  <span>{result.contextMeaning}</span>
                </div>
              )}

              {/* C. 候选地道表达与常用搭配推荐 */}
              {result.alternativeExpressions && result.alternativeExpressions.length > 0 && (
                <div className="space-y-1.5 pt-0.5">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
                    <span>
                      {t('selectionPopup.alternativesTitle') || '候选地道表达 / 常用搭配'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.alternativeExpressions.map((alt, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: 'var(--color-primary-subtle)',
                          color: 'var(--color-primary)',
                          borderColor: 'var(--color-primary-border)'
                        }}
                        className="text-[11px] px-2.5 py-0.5 rounded-lg border font-medium flex items-center space-x-1 shadow-2xs"
                      >
                        <span>{alt}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* D. 双语例句 */}
              {result.bilingualExample &&
                (result.bilingualExample.source ||
                  result.bilingualExample.target ||
                  result.bilingualExample.en ||
                  result.bilingualExample.zh) && (
                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 space-y-1 text-xs">
                    {(result.bilingualExample.source || result.bilingualExample.en) && (
                      <div className="font-serif italic text-slate-700 dark:text-slate-200 leading-relaxed flex items-start justify-between space-x-2">
                        <span>
                          &ldquo;{result.bilingualExample.source || result.bilingualExample.en}
                          &rdquo;
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            speak(result.bilingualExample!.source || result.bilingualExample!.en!)
                          }
                          className="p-0.5 text-slate-400 hover:text-[var(--color-primary)] shrink-0 cursor-pointer"
                          title="朗读例句"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {(result.bilingualExample.target || result.bilingualExample.zh) && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-1">
                        {result.bilingualExample.target || result.bilingualExample.zh}
                      </div>
                    )}
                  </div>
                )}

              {/* 释义模式下的附加解析 (可选) */}
              {actionType === 'explain' && result.explanation && (
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
                    <span>{t('selectionPopup.deepExplanation')}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed pl-1 whitespace-pre-wrap">
                    {result.explanation}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* 底部动作栏 (严防换行，保持单行清晰排布) */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 select-none gap-2">
          {/* 左侧快捷操作按钮 */}
          <div className="flex items-center space-x-1 shrink-0">
            {/* Esc 退出/停止 */}
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <CircleX className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{t('selectionPopup.escQuit')}</span>
            </button>

            {/* R 重新生成 */}
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={!selectedText.trim() || loading}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`w-3 h-3 text-slate-400 shrink-0 ${loading ? 'animate-spin' : ''}`}
              />
              <span>{t('selectionPopup.regenerate')}</span>
            </button>

            {/* C 复制 */}
            <button
              type="button"
              onClick={handleCopy}
              disabled={!result || loading}
              style={
                copied
                  ? {
                      backgroundColor: 'var(--color-primary-subtle)',
                      color: 'var(--color-primary)'
                    }
                  : undefined
              }
              className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                copied
                  ? ''
                  : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {copied ? (
                <Check className="w-3 h-3 shrink-0" style={{ color: 'var(--color-primary)' }} />
              ) : (
                <Copy className="w-3 h-3 text-slate-400 shrink-0" />
              )}
              <span>{copied ? t('common.copySuccess') : t('selectionPopup.copy')}</span>
            </button>
          </div>

          {/* 右侧：遇见状态与撤销控制 */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {saveInfo?.undone ? (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                {t('selectionPopup.notRecorded') || '○ 未记录'}
              </span>
            ) : saveInfo ? (
              <div className="flex items-center space-x-1.5 shrink-0">
                {/* 撤销按钮 (放在已记录左侧，消失时不会导致已记录胶囊位移) */}
                {saveInfo.secondsLeft > 0 && (
                  <button
                    type="button"
                    onClick={handleUndoEncounter}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-500 dark:text-slate-400 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                    title={t('selectionPopup.undoTooltip') || '撤销本次遇见记录'}
                  >
                    <span>
                      {t('selectionPopup.undo', { seconds: saveInfo.secondsLeft }) ||
                        `撤销 (${saveInfo.secondsLeft}s)`}
                    </span>
                  </button>
                )}

                {/* 遇见状态胶囊 (始终固定在右侧) */}
                <div
                  style={{
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary)',
                    borderColor: 'var(--color-primary-border)'
                  }}
                  className="px-2.5 py-0.5 rounded-full border text-[11px] font-medium flex items-center space-x-1 shadow-2xs whitespace-nowrap shrink-0 max-w-[130px]"
                  title={
                    saveInfo.isFirst
                      ? `已记录 · 初次遇见${sourceApp ? ` (来自 ${formatAppName(sourceApp)})` : ''}`
                      : `已记录 · 第 ${saveInfo.count} 次遇见${sourceApp ? ` (来自 ${formatAppName(sourceApp)})` : ''}`
                  }
                >
                  <Check className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {saveInfo.isFirst ? '已记录 · 初遇' : `已记录 · 第${saveInfo.count}次`}
                  </span>
                </div>
              </div>
            ) : isStreaming || loading ? (
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium animate-pulse shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="whitespace-nowrap">
                  {isStreaming
                    ? t('selectionPopup.streaming') || '流式生成中...'
                    : t('selectionPopup.analyzing') || '正在分析...'}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SelectionPopup
