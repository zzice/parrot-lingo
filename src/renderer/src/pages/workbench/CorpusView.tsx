import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  BookMarked,
  Search,
  Volume2,
  Trash2,
  Copy,
  Check,
  Plus,
  Sparkles,
  Layers,
  Flame,
  Calendar,
  ChevronDown,
  ChevronUp,
  Footprints,
  Clock,
  Loader2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/useAppStore'
import { EncounterItem, PosExplanation } from '../../types'
import { CefrBadge } from '../../components/CefrBadge'
import { formatAppName } from '../../utils/formatApp'

export const CorpusView: React.FC = () => {
  const {
    corpusList,
    corpusSearch,
    isCorpusLoading,
    setCorpusSearch,
    deleteCorpusItem,
    addCorpusItem
  } = useAppStore()
  const { t } = useTranslation()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newWord, setNewWord] = useState('')
  const [newTrans, setNewTrans] = useState('')
  const [newContext, setNewContext] = useState('')

  // 遇见足迹展开与数据缓存状态
  const [expandedFootprints, setExpandedFootprints] = useState<Record<string, boolean>>({})
  const [encountersMap, setEncountersMap] = useState<Record<string, EncounterItem[]>>({})
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

  // 增量渐进式加载分页参数 (初始渲染 12 条，向下滑动动态载入)
  const INITIAL_PAGE_SIZE = 12
  const PAGE_SIZE = 12
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // 搜索关键词变更时重置可见数量
  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE)
  }, [corpusSearch])

  // 列表搜索记忆过滤
  const filtered = useMemo(() => {
    const q = corpusSearch.toLowerCase().trim()
    if (!q) return corpusList
    return corpusList.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        (item.canonical && item.canonical.toLowerCase().includes(q)) ||
        item.translation.toLowerCase().includes(q) ||
        (item.nativeExample && item.nativeExample.toLowerCase().includes(q))
    )
  }, [corpusList, corpusSearch])

  // 当前增量切片展示列表
  const visibleList = useMemo(() => {
    return filtered.slice(0, visibleCount)
  }, [filtered, visibleCount])

  // 监听触底元素实现平滑连续加载
  useEffect(() => {
    const target = sentinelRef.current
    if (!target) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))
        }
      },
      { rootMargin: '250px' }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [filtered.length, visibleCount])

  // 滚动容器备用加载触发
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      if (scrollHeight - scrollTop - clientHeight < 350) {
        if (visibleCount < filtered.length) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))
        }
      }
    },
    [filtered.length, visibleCount]
  )

  // 批量缓存解析多维词条元数据，避免渲染遍历时的重复 JSON.parse
  const metadataMap = useMemo(() => {
    const map = new Map<
      string,
      {
        phoneticUk?: string
        phoneticUs?: string
        posExplanations?: PosExplanation[]
        contextMeaning?: string
        bilingualExample?: { en: string; zh: string }
      }
    >()
    for (const item of corpusList) {
      if (item.notes) {
        try {
          const parsed = JSON.parse(item.notes)
          if (parsed && typeof parsed === 'object') {
            map.set(item.id, parsed)
          }
        } catch {
          // ignore
        }
      }
    }
    return map
  }, [corpusList])

  const detectSpeechLang = (str: string, fallback = 'en-US'): string => {
    if (!str) return fallback
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(str)) return 'ja-JP'
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(str)) return 'ko-KR'
    if (/[\u4E00-\u9FA5]/.test(str)) return 'zh-CN'
    return fallback
  }

  // Web Speech API 多语言发音 (支持英音 en-GB、美音 en-US 及日/韩/中智能感知)
  const speak = useCallback((text: string, lang?: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang || detectSpeechLang(text, 'en-US')
      utterance.rate = 0.95
      window.speechSynthesis.speak(utterance)
    }
  }, [])

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWord.trim()) return
    await addCorpusItem({
      text: newWord.trim(),
      canonical: newWord.trim().toLowerCase(),
      translation: newTrans.trim() || 'Custom vocabulary',
      nativeExample: newContext.trim() || undefined,
      alternativeExpressions: [],
      tags: ['手动录入', '语料']
    })
    setNewWord('')
    setNewTrans('')
    setNewContext('')
    setShowAddModal(false)
  }

  // 切换展开/收起遇见历史足迹
  const toggleFootprints = useCallback(
    async (corpusItemId: string) => {
      const isCurrentlyExpanded = Boolean(expandedFootprints[corpusItemId])
      const nextState = !isCurrentlyExpanded

      setExpandedFootprints((prev) => ({ ...prev, [corpusItemId]: nextState }))

      if (nextState && !encountersMap[corpusItemId] && window.api?.encounters) {
        setLoadingMap((prev) => ({ ...prev, [corpusItemId]: true }))
        try {
          const list = await window.api.encounters.getByCorpusId(corpusItemId)
          setEncountersMap((prev) => ({ ...prev, [corpusItemId]: list }))
        } catch (err) {
          console.error('Failed to load encounters:', err)
        } finally {
          setLoadingMap((prev) => ({ ...prev, [corpusItemId]: false }))
        }
      }
    },
    [expandedFootprints, encountersMap]
  )

  // 骨架屏组件：1:1 还原生词卡片视觉骨架，提供丝滑流光过渡
  const renderSkeleton = () => (
    <div className="flex-1 h-full flex flex-col overflow-hidden select-none bg-slate-50/40 dark:bg-slate-950/30 animate-pulse">
      {/* 顶部统计与操作栏骨架 */}
      <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-3 w-48 bg-slate-200/70 dark:bg-slate-800/70 rounded" />
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-64 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="w-24 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* 卡片列表骨架 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 space-y-4 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-5 w-20 bg-slate-200/70 dark:bg-slate-800/70 rounded-full" />
                <div className="h-5 w-16 bg-slate-200/70 dark:bg-slate-800/70 rounded-full" />
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-7 h-7 bg-slate-200/60 dark:bg-slate-800/60 rounded-lg" />
                <div className="w-7 h-7 bg-slate-200/60 dark:bg-slate-800/60 rounded-lg" />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="h-6 w-24 bg-slate-200/60 dark:bg-slate-800/60 rounded-lg" />
              <div className="h-6 w-24 bg-slate-200/60 dark:bg-slate-800/60 rounded-lg" />
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 space-y-2">
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-1/2 bg-slate-200/70 dark:bg-slate-800/70 rounded" />
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-slate-800/30 space-y-2">
              <div className="h-3.5 w-5/6 bg-slate-200/70 dark:bg-slate-800/70 rounded" />
              <div className="h-3 w-2/3 bg-slate-200/50 dark:bg-slate-800/50 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  if (isCorpusLoading) {
    return renderSkeleton()
  }

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden select-none bg-slate-50/40 dark:bg-slate-950/30 animate-in fade-in duration-200">
      {/* 顶部搜索与操作栏 */}
      <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div
            style={{
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              borderColor: 'var(--color-primary-border)'
            }}
            className="w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-sm shadow-2xs"
          >
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <span>{t('corpus.title') || '生词语料库'}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-medium">
                {corpusList.length} {t('common.items') || '条'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {t('corpus.desc') || '所有在工作与阅读中遇见的生词短语及真实语境'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={corpusSearch}
              onChange={(e) => setCorpusSearch(e.target.value)}
              placeholder={t('corpus.searchPlaceholder') || '搜索单词、释义或上下文例句...'}
              className="w-full bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[var(--color-primary)] transition-colors shadow-2xs"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)'
            }}
            className="px-3.5 py-2 hover:opacity-90 active:scale-95 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('corpus.manualAdd') || '录入词条'}</span>
          </button>
        </div>
      </div>

      {/* 语料卡片列表区域 (支持滑动增量分页与丝滑加载) */}
      <div onScroll={handleScroll} className="flex-1 overflow-y-auto p-6 space-y-4">
        {filtered.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2.5">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <BookMarked className="w-7 h-7 text-slate-400 dark:text-slate-600" />
            </div>
            <div className="text-sm font-semibold">
              {t('corpus.emptyHint') || '未找到匹配的语料词条'}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-600 max-w-sm text-center">
              {t('corpus.emptySubHint') || '在任意应用中通过划词助手翻译，系统会自动将遇见保存于此'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {visibleList.map((item) => {
              const meta = metadataMap.get(item.id) || {}
              const ukPhonetic = meta.phoneticUk
              const usPhonetic = meta.phoneticUs || item.phonetic
              const posList = meta.posExplanations
              const isFootprintsOpen = Boolean(expandedFootprints[item.id])
              const itemEncounters = encountersMap[item.id] || []
              const isLoadingFootprints = Boolean(loadingMap[item.id])

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 space-y-3.5 shadow-2xs hover:shadow-xs transition-all group"
                >
                  {/* 第一行：词头 + 状态徽章 + 操作工具栏 */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <span className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-wide">
                        {item.text}
                      </span>

                      {/* 遇见频次可点击按钮 (点击直接展开遇见时间线) */}
                      <button
                        type="button"
                        onClick={() => toggleFootprints(item.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1 shadow-2xs transition-all cursor-pointer ${
                          item.encounterCount > 1
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                        title="点击查看所有遇见足迹与时间轴"
                      >
                        <Flame className="w-3 h-3 fill-amber-500/20" />
                        <span>遇见 {item.encounterCount} 次</span>
                        {isFootprintsOpen ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {/* SRS 阶段 / 毕业徽章 */}
                      {item.isGraduated ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                          🎉 毕业掌握
                        </span>
                      ) : item.srsStage > 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center space-x-1 shadow-2xs">
                          <Layers className="w-3 h-3" />
                          <span>Stage {item.srsStage}</span>
                        </span>
                      ) : null}

                      {/* CEFR 难度等级 (支持点击交互) */}
                      {item.difficulty && <CefrBadge level={item.difficulty} />}
                    </div>

                    {/* 快捷操作区 */}
                    <div className="flex items-center space-x-1 text-slate-400 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(item.id, `${item.text} - ${item.translation}`)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title={t('common.copySuccess') || '复制词条'}
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteCorpusItem(item.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                        title={t('common.delete') || '删除词条'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 第二行：英式 / 美式独立音标或非英语注音与发音按钮 */}
                  {(() => {
                    const isEnglish = /^[a-zA-Z\s'’\-]+$/.test((item.text || '').trim())
                    if (isEnglish) {
                      if (!ukPhonetic && !usPhonetic && !item.phonetic) return null
                      return (
                        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
                          {/* 英式音标 */}
                          {ukPhonetic && (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-400 font-sans">英</span>
                              <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                                {ukPhonetic}
                              </span>
                              <button
                                type="button"
                                onClick={() => speak(item.text, 'en-GB')}
                                className="p-0.5 text-slate-400 hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                                title="英式发音 (en-GB)"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* 美式音标 */}
                          {usPhonetic && (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-400 font-sans">美</span>
                              <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                                {usPhonetic}
                              </span>
                              <button
                                type="button"
                                onClick={() => speak(item.text, 'en-US')}
                                className="p-0.5 text-slate-400 hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                                title="美式发音 (en-US)"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* 兜底单音标 */}
                          {!ukPhonetic && !usPhonetic && item.phonetic && (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 shadow-2xs">
                              <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                                {item.phonetic}
                              </span>
                              <button
                                type="button"
                                onClick={() => speak(item.text, 'en-US')}
                                className="p-0.5 text-slate-400 hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                                title="发音"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    }

                    // 非英语单词专属注音
                    const nonEnglishPhonetic = item.phonetic || usPhonetic || ukPhonetic
                    if (!nonEnglishPhonetic) return null

                    const getNativeLabel = (str: string): string => {
                      if (/[\u3040-\u309F\u30A0-\u30FF]/.test(str)) return '假名'
                      if (/[\u4E00-\u9FA5]/.test(str)) return '拼音'
                      return '读音'
                    }

                    return (
                      <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 font-sans">
                            {getNativeLabel(item.text)}
                          </span>
                          <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                            {nonEnglishPhonetic}
                          </span>
                          <button
                            type="button"
                            onClick={() => speak(item.text)}
                            className="p-0.5 text-slate-400 hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                            title="朗读发音"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })()}

                  {/* 第三行：多词性释义列表 或 核心中文释义 */}
                  {posList && posList.length > 0 ? (
                    <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                      {posList.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-start space-x-2 text-xs leading-relaxed"
                        >
                          <span
                            style={{
                              backgroundColor: 'var(--color-primary-subtle)',
                              color: 'var(--color-primary)',
                              borderColor: 'var(--color-primary-border)'
                            }}
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded border font-mono shrink-0 mt-0.5 shadow-2xs"
                          >
                            {p.pos || '释'}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium">
                            {p.meaning}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                      {item.translation}
                    </div>
                  )}

                  {/* 第四行：原生例句上下文 */}
                  {item.nativeExample && (
                    <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/40 text-xs text-slate-600 dark:text-slate-300 italic flex items-start justify-between space-x-2">
                      <span>"{item.nativeExample}"</span>
                      <button
                        type="button"
                        onClick={() => speak(item.nativeExample!, 'en-US')}
                        className="p-0.5 text-slate-400 hover:text-[var(--color-primary)] shrink-0 cursor-pointer"
                        title="朗读例句"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* 第五行：地道搭配推荐与分类标签 */}
                  {((item.alternativeExpressions && item.alternativeExpressions.length > 0) ||
                    (item.tags && item.tags.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {item.alternativeExpressions?.map((alt, idx) => (
                        <span
                          key={idx}
                          style={{
                            backgroundColor: 'var(--color-primary-subtle)',
                            color: 'var(--color-primary)',
                            borderColor: 'var(--color-primary-border)'
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg border flex items-center space-x-1 font-medium shadow-2xs"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{alt}</span>
                        </span>
                      ))}

                      {/* 标签列表 */}
                      {item.tags
                        ?.filter(
                          (tag) =>
                            tag !== '划词助手' &&
                            tag !== item.sourceApp &&
                            tag !== formatAppName(item.sourceApp)
                        )
                        .map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* 第六行：卡片底部栏（左侧遇见足迹与时间，右下角来源应用） */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                    {/* 左侧：足迹与录入时间 */}
                    <div className="flex items-center space-x-3 font-mono">
                      <button
                        type="button"
                        onClick={() => toggleFootprints(item.id)}
                        className="hover:text-[var(--color-primary)] transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <Footprints className="w-3 h-3" />
                        <span>{isFootprintsOpen ? '收起足迹' : '遇见足迹'}</span>
                      </button>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 opacity-60" />
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* 右下角：来源应用标识 */}
                    {item.sourceApp && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-medium flex items-center space-x-1 shadow-2xs">
                        <span>📍 来自 {formatAppName(item.sourceApp)}</span>
                      </span>
                    )}
                  </div>

                  {/* 遇见历史足迹时间轴抽屉 (当展开时) */}

                  {isFootprintsOpen && (
                    <div className="mt-3 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 space-y-3 animate-in fade-in-0 duration-200">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          <Footprints
                            className="w-4 h-4"
                            style={{ color: 'var(--color-primary)' }}
                          />
                          <span>遇见历史足迹 ({item.encounterCount} 次)</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          真实记录每次遇到的应用与上下文
                        </span>
                      </div>

                      {isLoadingFootprints ? (
                        <div className="py-4 flex items-center justify-center space-x-2 text-xs text-slate-400">
                          <Loader2
                            className="w-4 h-4 animate-spin"
                            style={{ color: 'var(--color-primary)' }}
                          />
                          <span>正在加载历史足迹...</span>
                        </div>
                      ) : itemEncounters.length === 0 ? (
                        <div className="py-3 text-center text-xs text-slate-400 italic">
                          暂无详细足迹快照
                        </div>
                      ) : (
                        <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-200/80 dark:before:bg-slate-800">
                          {itemEncounters.map((enc, eIdx) => {
                            const isLatest = eIdx === 0
                            return (
                              <div key={enc.id} className="relative text-xs space-y-1.5 group/enc">
                                {/* 时间轴小圆点 */}
                                <div
                                  style={
                                    isLatest
                                      ? {
                                          backgroundColor: 'var(--color-primary)',
                                          boxShadow: '0 0 0 3px var(--color-primary-subtle)'
                                        }
                                      : undefined
                                  }
                                  className={`absolute -left-4 top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                                    isLatest ? '' : 'bg-slate-300 dark:bg-slate-700'
                                  }`}
                                />

                                {/* 来源应用与时间 */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1 text-xs">
                                      <span>📍 {formatAppName(enc.sourceApp) || '未知应用'}</span>
                                    </span>
                                    {isLatest && (
                                      <span
                                        style={{
                                          backgroundColor: 'var(--color-primary-subtle)',
                                          color: 'var(--color-primary)'
                                        }}
                                        className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                                      >
                                        最新
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center space-x-1">
                                    <Clock className="w-3 h-3 opacity-60" />
                                    <span>
                                      {new Date(enc.seenAt).toLocaleString(undefined, {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </div>

                                {/* 当次遇见的真实上下文例句 */}
                                {enc.context && (
                                  <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-300 italic flex items-start justify-between space-x-2">
                                    <span>"{enc.context}"</span>
                                    <button
                                      type="button"
                                      onClick={() => speak(enc.context!, 'en-US')}
                                      className="p-0.5 text-slate-400 hover:text-[var(--color-primary)] shrink-0 cursor-pointer"
                                      title="朗读语境例句"
                                    >
                                      <Volume2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 滑动到底部加载更多与状态提示 */}
        {filtered.length > 0 && visibleCount < filtered.length && (
          <div
            ref={sentinelRef}
            className="py-4 flex items-center justify-center space-x-2 text-xs text-slate-400 dark:text-slate-500"
          >
            <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
            <span>
              正在载入更多词条... ({visibleList.length} / {filtered.length})
            </span>
          </div>
        )}
        {filtered.length > 0 && visibleCount >= filtered.length && (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-600 font-medium">
            已展示全部 {filtered.length} 条生词语料
          </div>
        )}
      </div>

      {/* 手动添加生词弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('corpus.manualModalTitle') || '录入新词 / 表达'}
            </h3>
            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  {t('corpus.wordLabel') || '单词 / 表达'}
                </label>
                <input
                  type="text"
                  required
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder={t('corpus.wordPlaceholder') || '例如: serendipity'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  {t('corpus.transLabel') || '释义 / 含义'}
                </label>
                <input
                  type="text"
                  required
                  value={newTrans}
                  onChange={(e) => setNewTrans(e.target.value)}
                  placeholder={t('corpus.transPlaceholder') || '例如: n. 意外发现珍奇事物的本领'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  {t('corpus.contextLabel') || '语境例句 (可选)'}
                </label>
                <textarea
                  rows={2}
                  value={newContext}
                  onChange={(e) => setNewContext(e.target.value)}
                  placeholder={
                    t('corpus.contextPlaceholder') ||
                    '例如: Finding this cafe was pure serendipity.'
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-medium"
                >
                  {t('common.cancel') || '取消'}
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-primary-foreground)'
                  }}
                  className="px-5 py-2 rounded-xl font-bold hover:opacity-90 shadow-2xs transition-all cursor-pointer"
                >
                  {t('corpus.addBtn') || '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CorpusView
