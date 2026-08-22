import React from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'

export const Toast: React.FC = () => {
  const { toast, hideToast } = useAppStore()

  if (!toast) return null

  const isSuccess = toast.type === 'success'
  const isError = toast.type === 'error'

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-300 ease-out"
      style={{
        animation: 'toast-slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <div
        className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-full backdrop-blur-xl border shadow-lg shadow-black/10 select-none ${
          isSuccess
            ? 'bg-white/95 dark:bg-slate-900/95 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : isError
              ? 'bg-white/95 dark:bg-slate-900/95 border-rose-500/30 text-rose-700 dark:text-rose-300'
              : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100'
        }`}
      >
        {/* 图标 */}
        <div
          className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${
            isSuccess
              ? 'bg-emerald-500/15 text-emerald-500'
              : isError
                ? 'bg-rose-500/15 text-rose-500'
                : 'bg-blue-500/15 text-blue-500'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : isError ? (
            <AlertCircle className="w-3.5 h-3.5" />
          ) : (
            <Info className="w-3.5 h-3.5" />
          )}
        </div>

        {/* 提示文案 */}
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
          {toast.message}
        </span>

        {/* 关闭按钮 */}
        <button
          onClick={hideToast}
          className="ml-1 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
