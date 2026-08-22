import React, { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'

export type TooltipPlacement =
  'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
  placement?: TooltipPlacement
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  className,
  placement = 'top'
}) => {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setVisible(true), 120)
  }

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <div
      className={clsx('relative inline-flex items-center', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && content && (
        <div
          className={clsx(
            'absolute z-50 w-max max-w-[280px] px-3 py-2 text-xs font-normal text-slate-100 bg-[#18181b] border border-slate-700/80 rounded-xl shadow-2xl transition-all duration-150 animate-in fade-in zoom-in-95 pointer-events-none leading-relaxed text-left break-words select-none',
            placement === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
            placement === 'top-start' && 'bottom-full left-[-8px] mb-2',
            placement === 'top-end' && 'bottom-full right-[-8px] mb-2',
            placement === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
            placement === 'bottom-start' && 'top-full left-[-8px] mt-2',
            placement === 'bottom-end' && 'top-full right-[-8px] mt-2'
          )}
        >
          {content}
          {/* Arrow */}
          <div
            className={clsx(
              'absolute w-2 h-2 bg-[#18181b] border-slate-700/80 rotate-45',
              placement.startsWith('top') && 'bottom-[-5px] border-r border-b',
              placement.startsWith('bottom') && 'top-[-5px] border-l border-t',
              placement === 'top' && 'left-1/2 -translate-x-1/2',
              placement === 'top-start' && 'left-4',
              placement === 'top-end' && 'right-4',
              placement === 'bottom' && 'left-1/2 -translate-x-1/2',
              placement === 'bottom-start' && 'left-4',
              placement === 'bottom-end' && 'right-4'
            )}
          />
        </div>
      )}
    </div>
  )
}
