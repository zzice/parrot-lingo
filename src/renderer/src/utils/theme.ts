/**
 * theme.ts — 主题色彩计算与 CSS 变量动态注入工具
 */

export const THEME_COLOR_PRESETS = [
  { id: 'parrot-red', label: '鹦鹉红', hex: '#EF4444' },
  { id: 'parrot-gold', label: '金羽黄', hex: '#F59E0B' },
  { id: 'parrot-green', label: '翠羽绿', hex: '#10B981' },
  { id: 'parrot-blue', label: '飞羽蓝', hex: '#3B82F6' },
  { id: 'ocean-cyan', label: '碧海青', hex: '#06B6D4' },
  { id: 'mystic-purple', label: '幻羽紫', hex: '#8B5CF6' },
  { id: 'slate-gray', label: '玄羽灰', hex: '#64748B' }
] as const

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/
const SHORT_HEX_PATTERN = /^#[0-9a-fA-F]{3}$/

export function normalizeHex(color?: string): string {
  if (!color) return '#EF4444'
  let val = color.trim()
  if (!val.startsWith('#')) val = `#${val}`
  if (SHORT_HEX_PATTERN.test(val)) {
    val = `#${val
      .slice(1)
      .split('')
      .map((c) => c + c)
      .join('')}`
  }
  if (!HEX_PATTERN.test(val)) return '#EF4444'
  return val.toUpperCase()
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex).slice(1)
  const num = parseInt(normalized, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

/**
 * 根据背景色彩计算高对比前景色 (白色或深灰色)
 */
export function getForegroundColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  // 相对亮度公式 (WCAG 2.0)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#0F172A' : '#FFFFFF'
}

/**
 * 调整颜色明度生成 Hover / Active 色阶
 */
export function adjustBrightness(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex)
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)))
  const nr = factor > 0 ? clamp(r + (255 - r) * factor) : clamp(r * (1 + factor))
  const ng = factor > 0 ? clamp(g + (255 - g) * factor) : clamp(g * (1 + factor))
  const nb = factor > 0 ? clamp(b + (255 - b) * factor) : clamp(b * (1 + factor))
  return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1).toUpperCase()}`
}

/**
 * 动态应用主题色变量至 document.documentElement
 */
export function applyThemeColorToDOM(primaryColorHex?: string): void {
  const hex = normalizeHex(primaryColorHex || '#10B981')
  const { r, g, b } = hexToRgb(hex)
  const fg = getForegroundColor(hex)
  const hover = adjustBrightness(hex, -0.1) // 稍微加深 10%
  const active = adjustBrightness(hex, -0.2) // 加深 20%

  const root = document.documentElement
  root.style.setProperty('--color-primary', hex)
  root.style.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`)
  root.style.setProperty('--color-primary-hover', hover)
  root.style.setProperty('--color-primary-active', active)
  root.style.setProperty('--color-primary-foreground', fg)
  root.style.setProperty('--color-primary-subtle', `rgba(${r}, ${g}, ${b}, 0.12)`)
  root.style.setProperty('--color-primary-subtle-hover', `rgba(${r}, ${g}, ${b}, 0.2)`)
  root.style.setProperty('--color-primary-border', `rgba(${r}, ${g}, ${b}, 0.3)`)
}
