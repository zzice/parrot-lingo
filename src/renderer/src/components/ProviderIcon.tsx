import React from 'react'
import logoImg from '../assets/logo.png'

interface ProviderIconProps {
  id: string
  name: string
  icon?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export const ProviderIcon: React.FC<ProviderIconProps> = ({
  id,
  name,
  icon,
  size = 'md',
  className = ''
}) => {
  const sizeMap = {
    xs: 'w-3.5 h-3.5 text-[8px]',
    sm: 'w-4 h-4 text-[9px]',
    md: 'w-7 h-7 text-xs',
    lg: 'w-12 h-12 text-lg'
  }

  const roundedMap = {
    xs: 'rounded',
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl'
  }

  const normalizedId = (id || '').toLowerCase()
  const normalizedIcon = (icon || '').toLowerCase()
  const normalizedName = (name || '').toLowerCase()

  // 1. ParrotLingo AI 官方专属 Logo
  if (
    normalizedId === 'parrotlingo' ||
    normalizedIcon === 'parrot' ||
    normalizedName.includes('parrotlingo')
  ) {
    return (
      <div
        className={`${sizeMap[size]} ${roundedMap[size]} shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs p-1 ${className}`}
      >
        <img
          src={logoImg}
          alt="ParrotLingo AI"
          className="w-full h-full object-contain drop-shadow-2xs"
        />
      </div>
    )
  }

  // 2. DeepSeek 官方品牌 SVG
  if (
    normalizedId === 'deepseek' ||
    normalizedIcon === 'deepseek' ||
    normalizedName.includes('deepseek')
  ) {
    return (
      <div
        className={`${sizeMap[size]} ${roundedMap[size]} shrink-0 flex items-center justify-center bg-gradient-to-br from-[#1E5DED] to-[#0D3CB3] text-white shadow-2xs ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3/4 h-3/4">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.06 14.5c-2.3 0-4.16-1.5-4.16-3.34 0-1.42 1.13-2.62 2.76-3.08l.34-.1-.32-.15c-.95-.45-1.57-1.35-1.57-2.33 0-1.6 1.48-2.9 3.35-2.9 1.7 0 3.12 1.07 3.33 2.5l.04.28h-1.62l-.04-.15c-.15-.55-.78-.93-1.71-.93-.97 0-1.73.63-1.73 1.42 0 .66.52 1.22 1.34 1.43l.53.13-.5.21c-1.32.55-2.09 1.55-2.09 2.67 0 1.09 1.15 1.94 2.65 1.94 1.62 0 2.82-.97 2.82-2.28 0-.25-.05-.49-.14-.72l-.12-.28h1.72l.06.31c.07.31.1.62.1.94 0 2.22-1.92 3.82-4.57 3.82z" />
        </svg>
      </div>
    )
  }

  // 3. 智谱 AI 官方品牌 SVG
  if (
    normalizedId === 'zhipu' ||
    normalizedIcon === 'zhipu' ||
    normalizedName.includes('智谱') ||
    normalizedName.includes('zhipu') ||
    normalizedName.includes('glm')
  ) {
    return (
      <div
        className={`${sizeMap[size]} ${roundedMap[size]} shrink-0 flex items-center justify-center bg-gradient-to-br from-[#3844FF] via-[#5F27CD] to-[#7B2CBF] text-white shadow-2xs ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3/4 h-3/4">
          <path d="M12 2L4 6.5V17.5L12 22L20 17.5V6.5L12 2ZM12 4.3L18 7.7V16.3L12 19.7L6 16.3V7.7L12 4.3ZM12 7L8 9.3V14.7L12 17L16 14.7V9.3L12 7Z" />
        </svg>
      </div>
    )
  }

  // 4. OpenAI
  if (
    normalizedId.includes('openai') ||
    normalizedName.includes('openai') ||
    normalizedName.includes('gpt')
  ) {
    return (
      <div
        className={`${sizeMap[size]} ${roundedMap[size]} shrink-0 flex items-center justify-center bg-gradient-to-br from-[#10A37F] to-[#0A6B53] text-white shadow-2xs ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3/4 h-3/4">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947z" />
        </svg>
      </div>
    )
  }

  // 5. Claude / Anthropic
  if (
    normalizedId.includes('anthropic') ||
    normalizedId.includes('claude') ||
    normalizedName.includes('claude')
  ) {
    return (
      <div
        className={`${sizeMap[size]} ${roundedMap[size]} shrink-0 flex items-center justify-center bg-gradient-to-br from-[#D97706] to-[#B45309] text-white shadow-2xs ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3/4 h-3/4">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
        </svg>
      </div>
    )
  }

  // 6. Ollama / 本地模型
  if (
    normalizedId.includes('ollama') ||
    normalizedId.includes('local') ||
    normalizedName.includes('ollama')
  ) {
    return (
      <div
        className={`${sizeMap[size]} ${roundedMap[size]} shrink-0 flex items-center justify-center bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white shadow-2xs ${className}`}
      >
        <span className="font-mono font-black">O</span>
      </div>
    )
  }

  // 默认兜底图标
  return (
    <div
      className={`${sizeMap[size]} ${roundedMap[size]} shrink-0 flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-800 text-white font-bold shadow-2xs ${className}`}
    >
      <span>{(name || 'AI').charAt(0).toUpperCase()}</span>
    </div>
  )
}

export default ProviderIcon
