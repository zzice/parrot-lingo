import React, { useState, useEffect, useCallback } from 'react'
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
  ArrowLeft
} from 'lucide-react'

import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/useAppStore'
import { TodayCard } from '../../types'

export const TodayView: React.FC = () => {
  const { t } = useTranslation()
  const { todayQueue, todaySummary, isTodayLoading, fetchToday, submitReview, setCurrentNav } =
    useAppStore()

  const [viewState, setViewState] = useState<'entry' | 'learning' | 'completed'>('entry')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [sessionResults, setSessionResults] = useState<{
    hardCount: number
    goodCount: number
    easyCount: number
  }>({ hardCount: 0, goodCount: 0, easyCount: 0 })

  useEffect(() => {
    fetchToday()
  }, [fetchToday])

  const currentCard: TodayCard | undefined = todayQueue[currentIndex]

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
      utterance.rate = 0.95
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleStart = () => {
    if (todayQueue.length === 0) return
    setCurrentIndex(0)
    setIsRevealed(false)
    setSessionResults({ hardCount: 0, goodCount: 0, easyCount: 0 })
    setViewState('learning')
  }

  const handleReveal = useCallback(() => {
    setIsRevealed(true)
    if (currentCard?.corpusItem.text) {
      speak(currentCard.corpusItem.text)
    }
  }, [currentCard])

  const handleRate = useCallback(
    async (rating: 1 | 2 | 3) => {
      if (!currentCard) return

      // 统计本次练习表现
      setSessionResults((prev) => ({
        hardCount: prev.hardCount + (rating === 1 ? 1 : 0),
        goodCount: prev.goodCount + (rating === 2 ? 1 : 0),
        easyCount: prev.easyCount + (rating === 3 ? 1 : 0)
      }))

      // 提交到 SRS 调度引擎
      await submitReview({
        corpusItemId: currentCard.corpusItem.id,
        reviewFormat: currentCard.reviewFormat,
        encounterId: currentCard.encounter?.id,
        rating,
        stageBefore: currentCard.corpusItem.srsStage
      })

      // 切换到下一张卡片或完成页
      if (currentIndex + 1 < todayQueue.length) {
        setCurrentIndex((prev) => prev + 1)
        setIsRevealed(false)
      } else {
        setViewState('completed')
      }
    },
    [currentCard, currentIndex, todayQueue.length, submitReview]
  )

  // 全局快捷键绑定 (Space 揭晓, 1/2/3 评分)
  useEffect(() => {
    if (viewState !== 'learning') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        if (!isRevealed) {
          handleReveal()
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
  }, [viewState, isRevealed, handleReveal, handleRate])

  // 生成 Cloze (填空) 句式：将原句中的词汇替换为下划线空白
  const renderClozeSentence = (sentence: string, targetWord: string, revealed: boolean) => {
    if (!sentence || !targetWord) return <span>{sentence}</span>

    const regex = new RegExp(`(${targetWord})`, 'gi')
    const parts = sentence.split(regex)

    return (
      <div className="leading-relaxed text-base font-normal">
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
                  className="px-2.5 py-0.5 mx-1 rounded-lg border font-bold underline decoration-2 underline-offset-4 shadow-2xs inline-block animate-in zoom-in-95 duration-200"
                >
                  {part}
                </span>
              )
            }
            return (
              <span
                key={i}
                className="inline-flex items-center justify-center px-4 py-0.5 mx-1 rounded-lg bg-slate-200/80 dark:bg-slate-800/90 border-b-2 border-[var(--color-primary)] font-mono text-slate-400 dark:text-slate-500 font-semibold tracking-widest shadow-inner select-none"
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

  // 0. 加载骨架屏 (Skeleton Loading View)
  const renderSkeleton = () => (
    <div className="flex-1 h-full flex flex-col justify-between p-6 md:p-10 overflow-y-auto select-none">
      <div className="max-w-2xl mx-auto w-full my-auto space-y-6">
        <div className="p-7 md:p-9 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/70 shadow-sm backdrop-blur-xl space-y-7 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-24 rounded-full bg-slate-200/80 dark:bg-slate-800/80" />
                <div className="h-6 w-20 rounded-full bg-slate-200/80 dark:bg-slate-800/80" />
              </div>
              <div className="h-8 w-44 rounded-xl bg-slate-200/80 dark:bg-slate-800/80" />
              <div className="h-4 w-64 rounded-lg bg-slate-100 dark:bg-slate-800/60" />
            </div>
            <div className="w-13 h-13 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80" />
          </div>

          <div className="grid grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 h-24 space-y-2">
              <div className="h-4 w-16 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="h-7 w-12 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 h-24 space-y-2">
              <div className="h-4 w-16 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="h-7 w-12 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 h-24 space-y-2">
              <div className="h-4 w-16 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="h-7 w-12 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="h-4 w-44 rounded bg-slate-100 dark:bg-slate-800/60" />
            <div className="h-11 w-36 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80" />
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
      <div className="flex-1 h-full flex flex-col justify-between p-6 md:p-10 overflow-y-auto select-none animate-in fade-in duration-200">
        <div className="max-w-2xl mx-auto w-full my-auto space-y-6">
          {/* 主面板容器卡片 (采用现代毛玻璃与细腻微光边框) */}
          <div className="p-7 md:p-9 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/70 shadow-sm backdrop-blur-xl space-y-7 transition-all">
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

                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                  {t('today.greeting') || '今日遇见回放'}
                </h1>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                  {hasCards
                    ? t('today.overviewDesc', { count: todayQueue.length }) ||
                      `今天有 ${todayQueue.length} 个工作场景中遇见的表达等待回放巩固`
                    : t('today.allDoneDesc') || '今日待复习表达已全部完成，去阅读积累更多遇见吧'}
                </p>
              </div>

              {/* 优雅品牌动态标志 */}
              <div
                style={{
                  backgroundColor: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary-border)'
                }}
                className="w-13 h-13 rounded-2xl border flex items-center justify-center shadow-xs transition-transform hover:scale-105"
              >
                <Zap className="w-6 h-6 fill-current" />
              </div>
            </div>

            {/* 今日任务卡片概览 (指标网格) */}
            {hasCards ? (
              <div className="grid grid-cols-3 gap-3.5">
                {/* 新词探索 */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs space-y-1.5 transition-all hover:border-amber-500/30 group">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <span>{t('today.newCards') || '新词探索'}</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 pl-0.5">
                    {newCount} <span className="text-xs font-normal text-slate-400">条</span>
                  </div>
                </div>

                {/* 语境复习 */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs space-y-1.5 transition-all hover:border-blue-500/30 group">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <RotateCcw className="w-3 h-3" />
                    </div>
                    <span>{t('today.reviewCards') || '语境复习'}</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 pl-0.5">
                    {reviewCount} <span className="text-xs font-normal text-slate-400">条</span>
                  </div>
                </div>

                {/* 预计耗时 */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs space-y-1.5 transition-all hover:border-emerald-500/30 group">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Clock className="w-3 h-3" />
                    </div>
                    <span>{t('today.estTime') || '预计耗时'}</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 pl-0.5">
                    ~{estMinutes} <span className="text-xs font-normal text-slate-400">分钟</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-center space-y-3">
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
                  className="mt-1 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs"
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
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
                    Space
                  </kbd>{' '}
                  快速揭晓 ·{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
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
                  className="px-6 py-3 rounded-2xl text-xs md:text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center space-x-2 cursor-pointer"
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
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
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
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 text-xs">
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
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:opacity-90 transition-all cursor-pointer"
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

  return (
    <div className="flex-1 h-full flex flex-col justify-between p-6 overflow-hidden select-none bg-slate-100/50 dark:bg-slate-950/40">
      {/* 顶部进度条与模式标签 */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between space-x-4 pb-3 border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setViewState('entry')}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
            title="返回概览"
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

          {encounter?.sourceApp && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60">
              📍 遇见自 {encounter.sourceApp}
            </span>
          )}
        </div>

        {/* 进度计数 */}
        <div className="flex items-center space-x-3 text-xs font-mono text-slate-500">
          <span>
            {currentIndex + 1} / {todayQueue.length}
          </span>
          <div className="w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              style={{
                width: `${progressPercent}%`,
                backgroundColor: 'var(--color-primary)'
              }}
              className="h-full transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* 中部核心学习卡片 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-xl w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xl space-y-6 transition-all">
          {/* A. 认一认模式 (Stage 0) */}
          {currentCard.reviewFormat === 'recognize' && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <div className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-wide flex items-center justify-center space-x-2">
                  <span>{item.text}</span>
                  <button
                    type="button"
                    onClick={() => speak(item.text)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] cursor-pointer transition-colors"
                    title="发音"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
                {item.phonetic && (
                  <div
                    style={{ color: 'var(--color-primary)' }}
                    className="text-sm font-mono tracking-wider font-semibold"
                  >
                    {item.phonetic}
                  </div>
                )}
              </div>

              {isRevealed ? (
                <div className="space-y-4 pt-2 text-left border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-200">
                  {/* 中文释义 */}
                  <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                    {item.translation}
                  </div>

                  {/* 替换表达 */}
                  {item.alternativeExpressions && item.alternativeExpressions.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>地道替换搭配</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.alternativeExpressions.map((alt, idx) => (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: 'var(--color-primary-subtle)',
                              color: 'var(--color-primary)'
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium"
                          >
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 原生例句 */}
                  {(encounter?.context || item.nativeExample) && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/40">
                      "{encounter?.context || item.nativeExample}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-slate-400 dark:text-slate-500 text-xs font-medium">
                  {t('today.guessMeaningHint') || '回想这个表达在工作中的含义与场景'}
                </div>
              )}
            </div>
          )}

          {/* B. 场景填空模式 (Stage 1~3 Cloze) */}
          {currentCard.reviewFormat === 'cloze' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  语境回放 · 填空挑战
                </div>
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
                  {renderClozeSentence(
                    encounter?.context || item.nativeExample || item.text,
                    item.text,
                    isRevealed
                  )}
                </div>
              </div>

              {isRevealed && (
                <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {item.text}
                      </span>
                      {item.phonetic && (
                        <span
                          style={{ color: 'var(--color-primary)' }}
                          className="text-xs font-mono font-semibold"
                        >
                          {item.phonetic}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => speak(item.text)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] cursor-pointer transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {item.translation}
                  </div>

                  {item.alternativeExpressions && item.alternativeExpressions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.alternativeExpressions.map((alt, idx) => (
                        <span
                          key={idx}
                          style={{
                            backgroundColor: 'var(--color-primary-subtle)',
                            color: 'var(--color-primary)'
                          }}
                          className="text-[11px] px-2.5 py-0.5 rounded-md font-medium"
                        >
                          {alt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* C. 主动回忆模式 (Stage 4 Recall) */}
          {currentCard.reviewFormat === 'recall' && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  主动回忆 · 英文表达
                </div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
                  {item.translation}
                </div>
              </div>

              {isRevealed ? (
                <div className="space-y-4 pt-2 text-left border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                        {item.text}
                      </span>
                      {item.phonetic && (
                        <span
                          style={{ color: 'var(--color-primary)' }}
                          className="text-xs font-mono font-semibold"
                        >
                          {item.phonetic}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => speak(item.text)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--color-primary)] cursor-pointer"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  {(encounter?.context || item.nativeExample) && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 italic p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/40">
                      "{encounter?.context || item.nativeExample}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-slate-400 text-xs">
                  {t('today.recallPromptHint') || '用英文怎么表达？点击或按空格揭晓答案'}
                </div>
              )}
            </div>
          )}

          {/* 交互操作区：未揭晓显示【揭晓答案】，揭晓后显示 3 档评分 */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
            {!isRevealed ? (
              <button
                type="button"
                onClick={handleReveal}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)'
                }}
                className="w-full py-3.5 rounded-2xl text-xs md:text-sm font-bold shadow-xs hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>{t('today.revealAnswer') || '揭晓答案'}</span>
                <span className="text-[11px] opacity-80 font-mono">(Space)</span>
              </button>
            ) : (
              <div className="space-y-2.5">
                <div className="text-[10px] text-center text-slate-400 font-medium">
                  {t('today.ratePrompt') || '掌握程度自我评价（决定下次遇见时间）'}
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleRate(1)}
                    className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all flex flex-col items-center space-y-1 cursor-pointer active:scale-95"
                  >
                    <div className="flex items-center space-x-1">
                      <Frown className="w-4 h-4" />
                      <span>{t('today.ratingHard') || '还不熟'}</span>
                    </div>
                    <span className="text-[10px] opacity-70 font-normal">明天再来 (1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate(2)}
                    className="p-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all flex flex-col items-center space-y-1 cursor-pointer active:scale-95"
                  >
                    <div className="flex items-center space-x-1">
                      <Smile className="w-4 h-4" />
                      <span>{t('today.ratingGood') || '差不多'}</span>
                    </div>
                    <span className="text-[10px] opacity-70 font-normal">3 天后 (2)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate(3)}
                    className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all flex flex-col items-center space-y-1 cursor-pointer active:scale-95"
                  >
                    <div className="flex items-center space-x-1">
                      <Check className="w-4 h-4" />
                      <span>{t('today.ratingEasy') || '已掌握'}</span>
                    </div>
                    <span className="text-[10px] opacity-70 font-normal">7 天后 (3)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部快捷键提示 */}
      <div className="text-center text-[10px] text-slate-400 dark:text-slate-600 space-x-4">
        <span>
          按{' '}
          <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">Space</kbd>{' '}
          揭晓
        </span>
        <span>
          按 <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">1</kbd>{' '}
          还不熟
        </span>
        <span>
          按 <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">2</kbd>{' '}
          差不多
        </span>
        <span>
          按 <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">3</kbd>{' '}
          已掌握
        </span>
      </div>
    </div>
  )
}

export default TodayView
