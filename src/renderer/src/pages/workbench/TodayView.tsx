import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Sparkles,
  Volume2,
  CheckCircle2,
  Layers,
  ArrowRight,
  Flame,
  RotateCcw,
  BookOpen,
  Check,
  Smile,
  Frown,
  Zap,
  Clock,
  ArrowLeft,
  Quote,
  Eye
} from 'lucide-react'

import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/useAppStore'
import { TodayCard, PosExplanation } from '../../types'
import { CefrBadge } from '../../components/CefrBadge'
import { formatAppName } from '../../utils/formatApp'

export const TodayView: React.FC = () => {
  const { t } = useTranslation()
  const { todayQueue, todaySummary, isTodayLoading, fetchToday, submitReview, setCurrentNav } =
    useAppStore()

  const [viewState, setViewState] = useState<'entry' | 'learning' | 'completed'>('entry')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [selectedRating, setSelectedRating] = useState<1 | 2 | 3 | null>(null)
  const cardBodyRef = useRef<HTMLDivElement | null>(null)
  const [sessionResults, setSessionResults] = useState<{
    hardCount: number
    goodCount: number
    easyCount: number
  }>({ hardCount: 0, goodCount: 0, easyCount: 0 })

  useEffect(() => {
    fetchToday()
  }, [fetchToday])

  const currentCard: TodayCard | undefined = todayQueue[currentIndex]

  // 解析当前词条的丰富元数据 (英/美音标、多词性释义、双语例句等)
  const parsedMeta = useMemo(() => {
    if (!currentCard?.corpusItem.notes) return null
    try {
      const obj = JSON.parse(currentCard.corpusItem.notes)
      if (obj && typeof obj === 'object') {
        return obj as {
          phoneticUk?: string
          phoneticUs?: string
          posExplanations?: PosExplanation[]
          contextMeaning?: string
          bilingualExample?: { en: string; zh: string }
        }
      }
    } catch {
      // ignore
    }
    return null
  }, [currentCard?.corpusItem.notes])

  const detectSpeechLang = (str: string, fallback = 'en-US'): string => {
    if (!str) return fallback
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(str)) return 'ja-JP'
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(str)) return 'ko-KR'
    if (/[\u4E00-\u9FA5]/.test(str)) return 'zh-CN'
    return fallback
  }

  const speak = (text: string, lang?: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang || detectSpeechLang(text, 'en-US')
      utterance.rate = 0.8
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleStart = () => {
    if (todayQueue.length === 0) return
    setCurrentIndex(0)
    setIsRevealed(false)
    setIsTransitioning(false)
    setSelectedRating(null)
    setSessionResults({ hardCount: 0, goodCount: 0, easyCount: 0 })
    setViewState('learning')
  }

  const handleReveal = useCallback(() => {
    if (isTransitioning) return
    setIsRevealed(true)
    if (currentCard?.corpusItem.text) {
      speak(currentCard.corpusItem.text)
    }
  }, [currentCard, isTransitioning])

  const handleRate = useCallback(
    (rating: 1 | 2 | 3) => {
      if (!currentCard || isTransitioning) return

      // 即刻给予按键选中反馈并启动平滑微转场
      setSelectedRating(rating)
      setIsTransitioning(true)

      // 统计本次练习表现
      setSessionResults((prev) => ({
        hardCount: prev.hardCount + (rating === 1 ? 1 : 0),
        goodCount: prev.goodCount + (rating === 2 ? 1 : 0),
        easyCount: prev.easyCount + (rating === 3 ? 1 : 0)
      }))

      // 异步后台提交到 SRS 调度引擎 (乐观更新，不阻塞 UI 转场)
      submitReview({
        corpusItemId: currentCard.corpusItem.id,
        reviewFormat: currentCard.reviewFormat,
        encounterId: currentCard.encounter?.id,
        rating,
        stageBefore: currentCard.corpusItem.srsStage
      }).catch((err) => {
        console.error('Failed to submit review:', err)
      })

      // 140ms 极速优雅微过渡：重置滚动位置与揭晓状态，切换到下一个词
      setTimeout(() => {
        if (cardBodyRef.current) {
          cardBodyRef.current.scrollTop = 0
        }
        if (currentIndex + 1 < todayQueue.length) {
          setCurrentIndex((prev) => prev + 1)
          setIsRevealed(false)
          setSelectedRating(null)
          requestAnimationFrame(() => {
            setIsTransitioning(false)
          })
        } else {
          setViewState('completed')
          setIsTransitioning(false)
          setSelectedRating(null)
        }
      }, 140)
    },
    [currentCard, currentIndex, isTransitioning, todayQueue.length, submitReview]
  )

  // 全局快捷键绑定 (Space 揭晓, 1/2/3 评分, Esc 返回)
  useEffect(() => {
    if (viewState !== 'learning') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        setViewState('entry')
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        if (!isRevealed) {
          handleReveal()
        } else if (currentCard?.corpusItem.text) {
          // 揭晓后再次按空格：重播单词发音
          speak(currentCard.corpusItem.text)
        }
      } else if (isRevealed) {
        if (e.key === '1') {
          e.preventDefault()
          handleRate(1)
        } else if (e.key === '2') {
          e.preventDefault()
          handleRate(2)
        } else if (e.key === '3') {
          e.preventDefault()
          handleRate(3)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewState, isRevealed, handleReveal, handleRate, currentCard])

  // 生成 Cloze (填空) 句式：将原句中的词汇替换为下划线空白
  const renderClozeSentence = (sentence: string, targetWord: string, revealed: boolean) => {
    if (!sentence || !targetWord) return <span>{sentence}</span>

    const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    const parts = sentence.split(regex)

    return (
      <div className="leading-relaxed text-sm md:text-base font-normal text-slate-800 dark:text-slate-200 break-words">
        {parts.map((part, i) => {
          if (part.toLowerCase() === targetWord.toLowerCase()) {
            if (revealed) {
              return (
                <span
                  key={i}
                  style={{
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary)',
                    borderColor: 'var(--color-primary-border)'
                  }}
                  className="px-2 py-0.5 mx-1 rounded-lg border font-bold underline decoration-2 underline-offset-4 inline-block"
                >
                  {part}
                </span>
              )
            }
            return (
              <span
                key={i}
                className="inline-flex items-center justify-center px-3.5 py-0.5 mx-1 rounded-lg bg-slate-200/90 dark:bg-slate-800/90 border-b-2 border-[var(--color-primary)] font-mono text-slate-400 dark:text-slate-500 font-semibold tracking-widest select-none"
              >
                ••••••
              </span>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </div>
    )
  }

  // 高亮例句中的关键词
  const renderHighlightedContext = (sentence: string, targetWord?: string) => {
    if (!sentence) return null
    if (!targetWord) return <span>"{sentence}"</span>

    const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    const parts = sentence.split(regex)

    return (
      <span>
        "
        {parts.map((part, i) => {
          if (part.toLowerCase() === targetWord.toLowerCase()) {
            return (
              <span
                key={i}
                style={{
                  backgroundColor: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)'
                }}
                className="font-bold px-1.5 py-0.5 rounded-md mx-0.5"
              >
                {part}
              </span>
            )
          }
          return <span key={i}>{part}</span>
        })}
        "
      </span>
    )
  }

  // 0. 加载骨架屏 (Skeleton Loading View)
  const renderSkeleton = () => (
    <div className="flex-1 h-full flex flex-col justify-between p-6 md:p-8 overflow-y-auto select-none">
      <div className="max-w-2xl mx-auto w-full my-auto space-y-6">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-7">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
                <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="h-8 w-44 rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-4 w-64 rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          </div>

          <div className="grid grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 h-24 space-y-2">
              <div className="h-4 w-16 rounded bg-slate-200/60 dark:bg-slate-800/60" />
              <div className="h-7 w-12 rounded bg-slate-200/60 dark:bg-slate-800/60" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 h-24 space-y-2">
              <div className="h-4 w-16 rounded bg-slate-200/60 dark:bg-slate-800/60" />
              <div className="h-7 w-12 rounded bg-slate-200/60 dark:bg-slate-800/60" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 h-24 space-y-2">
              <div className="h-4 w-16 rounded bg-slate-200/60 dark:bg-slate-800/60" />
              <div className="h-7 w-12 rounded bg-slate-200/60 dark:bg-slate-800/60" />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="h-4 w-44 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-11 w-36 rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  )

  // 1. 入口与概览页 (Entry View)
  if (viewState === 'entry') {
    if (isTodayLoading && todayQueue.length === 0 && !todaySummary) {
      return renderSkeleton()
    }

    const hasCards = todayQueue.length > 0
    const newCount = todaySummary?.newCount ?? todayQueue.filter((c) => c.cardType === 'new').length
    const reviewCount =
      todaySummary?.reviewCount ?? todayQueue.filter((c) => c.cardType === 'review').length
    const estMinutes =
      todaySummary?.estimatedMinutes ?? Math.max(1, Math.ceil(todayQueue.length * 0.5))

    return (
      <div className="flex-1 h-full flex flex-col justify-between p-6 md:p-8 overflow-y-auto select-none bg-slate-50/40 dark:bg-slate-950/30">
        <div className="max-w-2xl mx-auto w-full my-auto space-y-5">
          {/* 主面板容器卡片 */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
            {/* 顶部标题与图标区 */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 shadow-2xs">
                    <Flame className="w-3.5 h-3.5 fill-emerald-500/20" />
                    <span>{t('today.streakDays', { days: 7 }) || '连续回放 7 天'}</span>
                  </span>
                  {hasCards && (
                    <span
                      style={{
                        backgroundColor: 'var(--color-primary-subtle)',
                        color: 'var(--color-primary)',
                        borderColor: 'var(--color-primary-border)'
                      }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs"
                    >
                      {todayQueue.length} 个待回放
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {t('today.greeting') || '今日遇见回放'}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                  {hasCards
                    ? t('today.overviewDesc', { count: todayQueue.length }) ||
                      `今天有 ${todayQueue.length} 个工作场景中遇见的表达等待回放巩固`
                    : t('today.allDoneDesc') || '今日待复习表达已全部完成，去阅读积累更多遇见吧'}
                </p>
              </div>

              {/* 品牌标志 */}
              <div
                style={{
                  backgroundColor: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary-border)'
                }}
                className="w-12 h-12 rounded-2xl border flex items-center justify-center shadow-2xs shrink-0"
              >
                <Zap className="w-5 h-5 fill-current" />
              </div>
            </div>

            {/* 今日任务卡片概览 (指标网格) */}
            {hasCards ? (
              <div className="grid grid-cols-3 gap-3.5">
                {/* 新词探索 */}
                <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <span>{t('today.newCards') || '新词探索'}</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                    {newCount}{' '}
                    <span className="text-xs font-normal text-slate-400 font-sans">条</span>
                  </div>
                </div>

                {/* 语境复习 */}
                <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <RotateCcw className="w-3 h-3" />
                    </div>
                    <span>{t('today.reviewCards') || '语境复习'}</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                    {reviewCount}{' '}
                    <span className="text-xs font-normal text-slate-400 font-sans">条</span>
                  </div>
                </div>

                {/* 预计耗时 */}
                <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Clock className="w-3 h-3" />
                    </div>
                    <span>{t('today.estTime') || '预计耗时'}</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                    ~{estMinutes}{' '}
                    <span className="text-xs font-normal text-slate-400 font-sans">分钟</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {t('today.emptyTitle') || '太棒了，今日回放任务全部完成！'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    {t('today.emptySub') ||
                      '系统会在艾宾浩斯最佳遗忘点安排后续复习。现在可以去阅读英文积累新遇见。'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentNav('corpus')}
                  className="mt-1 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t('today.viewCorpus') || '浏览语料库'}</span>
                </button>
              </div>
            )}

            {/* 开始回放行动条 */}
            {hasCards && (
              <div className="pt-2 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  按{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    Space
                  </kbd>{' '}
                  快速揭晓 ·{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    1/2/3
                  </kbd>{' '}
                  即时评分
                </div>

                <button
                  type="button"
                  onClick={handleStart}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-primary-foreground)'
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-2xs hover:opacity-90 flex items-center space-x-2 cursor-pointer"
                >
                  <span>{t('today.startPlayback') || '开始遇见回放'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 底部品牌理念 */}
        <div className="max-w-2xl mx-auto w-full text-center text-[11px] text-slate-400 dark:text-slate-600 pb-1 font-medium">
          {t('today.philosophy') ||
            '用户负责遇见，系统负责安排学习 · 把遇到的英语变成真正属于你的英语'}
        </div>
      </div>
    )
  }

  // 2. 完成页 (Completed View)
  if (viewState === 'completed') {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center select-none bg-slate-50/40 dark:bg-slate-950/30">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {t('today.completeTitle') || '🎉 今日回放圆满完成！'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('today.completeSubtitle', { count: todayQueue.length }) ||
                `已完成 ${todayQueue.length} 个表达的场景记忆强化`}
            </p>
          </div>

          {/* 本次复习结果统计卡 */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-xs">
            <div className="space-y-0.5">
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                💪 已掌握
              </div>
              <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                {sessionResults.easyCount}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                😊 差不多
              </div>
              <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                {sessionResults.goodCount}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                😅 还不熟
              </div>
              <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                {sessionResults.hardCount}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => {
                fetchToday()
                setViewState('entry')
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {t('today.backHome') || '返回概览'}
            </button>
            <button
              type="button"
              onClick={() => setCurrentNav('corpus')}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)'
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-2xs hover:opacity-90 cursor-pointer"
            >
              {t('today.gotoCorpus') || '前往语料库'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 3. 卡片学习流 (Learning Flow)
  if (!currentCard) {
    return null
  }

  const progressPercent = Math.round(((currentIndex + 1) / todayQueue.length) * 100)
  const item = currentCard.corpusItem
  const encounter = currentCard.encounter
  const ukPhonetic = parsedMeta?.phoneticUk
  const usPhonetic = parsedMeta?.phoneticUs || item.phonetic
  const posList = parsedMeta?.posExplanations

  // 上下文例句 (优先取当前遇见的语境，若无则取词条的原生例句)
  const contextSentence = encounter?.context || item.nativeExample

  return (
    <div className="flex-1 h-full flex flex-col justify-between p-4 md:p-6 overflow-hidden select-none bg-slate-50/40 dark:bg-slate-950/30">
      {/* 顶部导航与进度条 */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between space-x-4 pb-3 border-b border-slate-200/80 dark:border-slate-800/60 shrink-0">
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setViewState('entry')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 cursor-pointer"
            title="返回概览 (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <span
            style={{
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              borderColor: 'var(--color-primary-border)'
            }}
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center space-x-1"
          >
            <Layers className="w-3 h-3" />
            <span>
              {currentCard.reviewFormat === 'recognize'
                ? 'Stage 0 · 认一认'
                : currentCard.reviewFormat === 'cloze'
                  ? `Stage ${item.srsStage} · 场景填空`
                  : 'Stage 4 · 主动回想'}
            </span>
          </span>

          {(encounter?.sourceApp || item.sourceApp) && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              📍 遇见自 {formatAppName(encounter?.sourceApp || item.sourceApp)}
            </span>
          )}

          {item.difficulty && <CefrBadge level={item.difficulty} />}
        </div>

        {/* 进度计数与进度条 */}
        <div className="flex items-center space-x-3 text-xs font-mono text-slate-500">
          <span>
            {currentIndex + 1} / {todayQueue.length}
          </span>
          <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              style={{
                width: `${progressPercent}%`,
                backgroundColor: 'var(--color-primary)'
              }}
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* 中部核心学习卡片 (稳定高度容器，内部滚动与微平滑过渡，底部操作区恒定锁定) */}
      <div className="flex-1 flex items-center justify-center p-2 md:p-4 overflow-hidden">
        <div className="max-w-2xl w-full h-[520px] max-h-[calc(100vh-170px)] min-h-[440px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          {/* 卡片内容区域 (带微平滑淡入淡出过渡) */}
          <div
            className={`flex-1 flex flex-col min-h-0 transition-opacity duration-150 ease-out ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {/* 卡片头部：明确呈现本次学习挑战的目标词或题干 */}
            <div className="p-6 md:p-7 pb-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
              {/* 1. 认一认模式 (Stage 0) 题干 */}
              {currentCard.reviewFormat === 'recognize' && (
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-wide select-text">
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => speak(item.text)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] cursor-pointer"
                      title="朗读单词"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 音标展示 (支持英美双音标感知) */}
                  <div className="flex items-center justify-center gap-2 text-xs font-mono">
                    {ukPhonetic && (
                      <span className="text-slate-500 dark:text-slate-400">
                        <span className="text-[10px] font-sans mr-0.5 text-slate-400">英</span>
                        <span style={{ color: 'var(--color-primary)' }} className="font-semibold">
                          {ukPhonetic}
                        </span>
                      </span>
                    )}
                    {usPhonetic && (
                      <span className="text-slate-500 dark:text-slate-400">
                        <span className="text-[10px] font-sans mr-0.5 text-slate-400">美</span>
                        <span style={{ color: 'var(--color-primary)' }} className="font-semibold">
                          {usPhonetic}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 2. 场景填空模式 (Stage 1~3) 题干 */}
              {currentCard.reviewFormat === 'cloze' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center space-x-1">
                    <Quote className="w-3.5 h-3.5" />
                    <span>
                      {t('today.clozeGuide') || '根据工作场景语境，回想划线空白处应填入的英文表达'}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70">
                    {renderClozeSentence(contextSentence || item.text, item.text, isRevealed)}
                  </div>
                </div>
              )}

              {/* 3. 主动回想模式 (Stage 4) 题干 */}
              {currentCard.reviewFormat === 'recall' && (
                <div className="text-center space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    {t('today.recallGuide') || '根据中文释义，回想对应的地道英文表达与拼写'}
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 select-text">
                    {item.translation}
                  </div>
                </div>
              )}
            </div>

            {/* 卡片中部：滚动内容区 (当语料或长释义很长时自动滚动，保证布局不溢出) */}
            <div ref={cardBodyRef} className="flex-1 overflow-y-auto p-6 md:p-7 space-y-4">
              {!isRevealed ? (
                /* 未揭晓状态：直观提示引导用户主动回忆 */
                <div
                  onClick={handleReveal}
                  className="h-full min-h-[140px] flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-[var(--color-primary)] text-center space-y-2.5 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-[var(--color-primary)]">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {currentCard.reviewFormat === 'recognize'
                        ? t('today.recognizeGuide') || '在脑海中回忆该词在工作场景中的释义与用法'
                        : currentCard.reviewFormat === 'cloze'
                          ? '回想该表达的拼写与原形'
                          : '回想对应的英文单词与拼写'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {t('today.clickToRevealHint') ||
                        '想好了吗？点击卡片或按空格 [Space] 揭晓答案'}
                    </p>
                  </div>
                </div>
              ) : (
                /* 已揭晓状态：展示释义、音标、工作真实语境及地道搭配 */
                <div className="space-y-4">
                  {/* 填空/回想模式下，揭晓后在顶部呈现目标词完整信息 */}
                  {currentCard.reviewFormat !== 'recognize' && (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70">
                      <div className="space-y-0.5">
                        <div className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 select-text">
                          {item.text}
                        </div>
                        {usPhonetic && (
                          <div
                            style={{ color: 'var(--color-primary)' }}
                            className="text-xs font-mono font-semibold"
                          >
                            {usPhonetic}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => speak(item.text)}
                        className="p-2 rounded-xl text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] cursor-pointer"
                        title="朗读单词"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* 多词性释义列表 或 核心中文释义 */}
                  {posList && posList.length > 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/70 space-y-2 select-text">
                      {posList.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-start space-x-2.5 text-xs leading-relaxed"
                        >
                          <span
                            style={{
                              backgroundColor: 'var(--color-primary-subtle)',
                              color: 'var(--color-primary)',
                              borderColor: 'var(--color-primary-border)'
                            }}
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono shrink-0 mt-0.5"
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
                    <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/70 text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed select-text">
                      {item.translation}
                    </div>
                  )}

                  {/* 真实工作场景语境 */}
                  {contextSentence && (
                    <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <Quote className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t('today.contextEncounter') || '真实工作场景语境'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => speak(contextSentence)}
                          className="p-1 rounded text-slate-400 hover:text-[var(--color-primary)] cursor-pointer"
                          title="朗读语境例句"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs md:text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed select-text">
                        {renderHighlightedContext(contextSentence, item.text)}
                      </div>
                    </div>
                  )}

                  {/* 地道替换搭配与候选表达 */}
                  {item.alternativeExpressions && item.alternativeExpressions.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>{t('today.alternatives') || '地道替换搭配'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.alternativeExpressions.map((alt, idx) => (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: 'var(--color-primary-subtle)',
                              color: 'var(--color-primary)',
                              borderColor: 'var(--color-primary-border)'
                            }}
                            className="text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center space-x-1"
                          >
                            <span>{alt}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 卡片底部操作栏：无论内容多长恒定可见 */}
          <div className="px-6 md:p-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
            {!isRevealed ? (
              <button
                type="button"
                onClick={handleReveal}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)'
                }}
                className="w-full py-3.5 rounded-xl text-xs md:text-sm font-bold shadow-2xs hover:opacity-90 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{t('today.revealAnswer') || '揭晓答案'}</span>
                <span className="text-[11px] opacity-80 font-mono">(Space)</span>
              </button>
            ) : (
              <div className="space-y-2.5">
                <div className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-medium">
                  {t('today.ratePrompt') || '掌握程度自我评价（决定下次遇见时间）'}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {/* 1. 还不熟 */}
                  <button
                    type="button"
                    onClick={() => handleRate(1)}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 cursor-pointer transition-all ${
                      selectedRating === 1
                        ? 'ring-2 ring-amber-500 bg-amber-500/25 border-amber-500 text-amber-800 dark:text-amber-200'
                        : 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Frown className="w-4 h-4" />
                      <span>{t('today.ratingHard') || '还不熟'}</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-normal">
                      {t('today.ratingHardSub') || '明天再来'} (1)
                    </span>
                  </button>

                  {/* 2. 差不多 */}
                  <button
                    type="button"
                    onClick={() => handleRate(2)}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 cursor-pointer transition-all ${
                      selectedRating === 2
                        ? 'ring-2 ring-blue-500 bg-blue-500/25 border-blue-500 text-blue-800 dark:text-blue-200'
                        : 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Smile className="w-4 h-4" />
                      <span>{t('today.ratingGood') || '差不多'}</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-normal">
                      {t('today.ratingGoodSub') || '3 天后'} (2)
                    </span>
                  </button>

                  {/* 3. 已掌握 */}
                  <button
                    type="button"
                    onClick={() => handleRate(3)}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 cursor-pointer transition-all ${
                      selectedRating === 3
                        ? 'ring-2 ring-emerald-500 bg-emerald-500/25 border-emerald-500 text-emerald-800 dark:text-emerald-200'
                        : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Check className="w-4 h-4" />
                      <span>{t('today.ratingEasy') || '已掌握'}</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-normal">
                      {t('today.ratingEasySub') || '7 天后'} (3)
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部快捷键提示 */}
      <div className="text-center text-[10px] text-slate-400 dark:text-slate-600 space-x-4 shrink-0">
        <span>
          按{' '}
          <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">Space</kbd>{' '}
          {isRevealed
            ? t('today.replayPronunciation') || '重听发音'
            : t('today.revealAnswer') || '揭晓'}
        </span>
        <span>
          按 <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">1</kbd>{' '}
          {t('today.ratingHard') || '还不熟'}
        </span>
        <span>
          按 <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">2</kbd>{' '}
          {t('today.ratingGood') || '差不多'}
        </span>
        <span>
          按 <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">3</kbd>{' '}
          {t('today.ratingEasy') || '已掌握'}
        </span>
        <span>
          按 <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">Esc</kbd>{' '}
          {t('today.backHome') || '返回'}
        </span>
      </div>
    </div>
  )
}

export default TodayView
