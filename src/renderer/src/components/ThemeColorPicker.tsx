import React, { useState, useEffect, useRef } from 'react'
import { THEME_COLOR_PRESETS, normalizeHex, applyThemeColorToDOM } from '../utils/theme'

interface ThemeColorPickerProps {
  value?: string
  onChange: (hex: string) => void
  className?: string
}

export const ThemeColorPicker: React.FC<ThemeColorPickerProps> = ({
  value = '#10B981',
  onChange,
  className = ''
}) => {
  const normalizedValue = normalizeHex(value)
  const [draftValue, setDraftValue] = useState(normalizedValue)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setDraftValue(normalizedValue)
  }, [normalizedValue])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // 预设颜色点击：立即保存并应用
  const handlePresetClick = (presetHex: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    const hex = normalizeHex(presetHex)
    setDraftValue(hex)
    applyThemeColorToDOM(hex)
    onChange(hex)
  }

  // 原生拾色器连续拖动：即时更新 DOM 样式，防抖持久化写入数据库
  const handleNativePickerInput = (nextValue: string) => {
    const hex = normalizeHex(nextValue)
    setDraftValue(hex)
    applyThemeColorToDOM(hex)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange(hex)
    }, 120)
  }

  // 文本框失焦：立即保存
  const handleInputBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    const hex = normalizeHex(draftValue)
    setDraftValue(hex)
    applyThemeColorToDOM(hex)
    if (hex !== normalizedValue) {
      onChange(hex)
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* 预设色块列表 */}
      <div className="flex flex-wrap items-center gap-2.5">
        {THEME_COLOR_PRESETS.map((preset) => {
          const isSelected = preset.hex.toUpperCase() === normalizedValue.toUpperCase()
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              aria-label={preset.label}
              onClick={() => handlePresetClick(preset.hex)}
              className="relative flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110 cursor-pointer focus:outline-none"
            >
              <span
                className={`h-5 w-5 rounded-full transition-all shadow-xs ${
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110'
                    : 'hover:opacity-90'
                }`}
                style={{
                  backgroundColor: preset.hex,
                  boxShadow: isSelected ? `0 0 0 2px ${preset.hex}` : undefined
                }}
              />
            </button>
          )
        })}
      </div>

      {/* 原生拾色器方形瓷贴 */}
      <label className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
        <input
          type="color"
          value={draftValue || normalizedValue}
          onInput={(e: any) => handleNativePickerInput(e.target.value)}
          onChange={(e) => handleNativePickerInput(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <span
          className="h-5 w-5 rounded-md border border-black/10 dark:border-white/10 shadow-xs"
          style={{ backgroundColor: draftValue || normalizedValue }}
        />
      </label>

      {/* HEX 代码输入框 */}
      <div className="flex items-center">
        <input
          type="text"
          value={draftValue}
          onChange={(e) => {
            const val = e.target.value
            setDraftValue(val)
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
              handleNativePickerInput(val)
            }
          }}
          onBlur={handleInputBlur}
          maxLength={7}
          spellCheck={false}
          className="h-8 w-24 px-2.5 text-center font-mono text-xs uppercase font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[var(--color-primary)] shadow-2xs"
        />
      </div>
    </div>
  )
}

export default ThemeColorPicker
