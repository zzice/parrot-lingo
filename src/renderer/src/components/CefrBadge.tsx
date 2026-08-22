import React, { useState, useRef, useEffect } from 'react'
import { GraduationCap, Info, X } from 'lucide-react'

interface CefrBadgeProps {
  level?: string
  className?: string
  align?: 'left' | 'right' | 'auto'
}

const CEFR_INFO: Record<
  string,
  { name: string; title: string; desc: string; vocab: string; color: string }
> = {
  A1: {
    name: 'A1 · 入门基础',
    title: '入门级 (Beginner)',
    desc: '掌握日常最基本的简短用语与常见简单词汇。',
    vocab: '约 1,000 词',
    color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20'
  },
  A2: {
    name: 'A2 · 初级日常',
    title: '初级 (Elementary)',
    desc: '能够就熟悉的日常话题进行基础交流与阅读。',
    vocab: '约 2,000 词',
    color: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20'
  },
  B1: {
    name: 'B1 · 中级应用',
    title: '中级 (Intermediate)',
    desc: '可理解工作、学习及旅行中的常见英语表达与要点。',
    vocab: '约 3,500 词',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  },
  B2: {
    name: 'B2 · 中高进阶',
    title: '中高级进阶 (Upper Intermediate)',
    desc: '职场办公、专业技术文档与较复杂话题的核心高频用词。',
    vocab: '约 5,000 词',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  },
  C1: {
    name: 'C1 · 高级流利',
    title: '高级 (Advanced)',
    desc: '学术研究、商务谈判与高难度长篇材料的深度表达。',
    vocab: '约 7,500 词',
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
  },
  C2: {
    name: 'C2 · 母语精通',
    title: '精通级 (Proficient / Mastery)',
    desc: '自如领会复杂隐喻、精确细微差别，接近母语者水平。',
    vocab: '10,000+ 词',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20'
  }
}

export const CefrBadge: React.FC<CefrBadgeProps> = ({ level, className = '', align = 'auto' }) => {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<'left' | 'right'>('left')
  const popoverRef = useRef<HTMLDivElement>(null)

  const cleanLevel = (level || '').toUpperCase().trim()
  const matchedKey = Object.keys(CEFR_INFO).find((k) => cleanLevel.includes(k)) || 'B2'
  const info = CEFR_INFO[matchedKey]

  // 动态检测屏幕/窗口边缘，避免超出右侧边界被裁切
  useEffect(() => {
    if (open && popoverRef.current) {
      if (align === 'right') {
        setPlacement('right')
      } else if (align === 'left') {
        setPlacement('left')
      } else {
        const rect = popoverRef.current.getBoundingClientRect()
        // 浮层宽度约为 288px，若距右侧不足 300px 则自动右对齐
        if (rect.left + 300 > window.innerWidth) {
          setPlacement('right')
        } else {
          setPlacement('left')
        }
      }
    }
  }, [open, align])

  // 点击外部自动关闭
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
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

  if (!level) return null

  return (
    <div ref={popoverRef} className="relative inline-block select-none">
      {/* 触发胶囊按钮 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((prev) => !prev)
        }}
        className={`text-[10px] font-sans font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${info.color} ${className}`}
        title="点击查看 CEFR 难度等级详解"
      >
        {cleanLevel}
      </button>

      {/* 交互式浮层弹窗 (智能左右对齐自适应) */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-2 z-50 w-72 max-w-[calc(100vw-32px)] rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800/90 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 text-xs select-text ${
            placement === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-100">
              <GraduationCap className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
              <span>CEFR 语言难度等级</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 当前等级高亮卡片 */}
          <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {info.name}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                {info.vocab}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              {info.desc}
            </p>
          </div>

          {/* CEFR 全景阶梯条 */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1">
              <Info className="w-3 h-3" />
              <span>欧洲语言共同参考标准 (CEFR)</span>
            </div>
            <div className="grid grid-cols-6 gap-1 text-center font-mono text-[10px] font-bold">
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((step) => {
                const isCurrent = step === matchedKey
                return (
                  <div
                    key={step}
                    style={
                      isCurrent
                        ? {
                            backgroundColor: 'var(--color-primary)',
                            color: 'var(--color-primary-foreground)'
                          }
                        : undefined
                    }
                    className={`py-1 rounded-md border ${
                      isCurrent
                        ? 'border-transparent shadow-2xs scale-105'
                        : 'bg-slate-100/70 dark:bg-slate-800/60 border-slate-200/50 dark:border-slate-700/50 text-slate-400'
                    }`}
                  >
                    {step}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CefrBadge
