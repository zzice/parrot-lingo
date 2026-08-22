import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { ShieldAlert, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface AccessibilityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPermissionGranted?: () => void
}

export const AccessibilityModal: React.FC<AccessibilityModalProps> = ({
  open,
  onOpenChange,
  onPermissionGranted
}) => {
  const { t } = useTranslation()
  const [checking, setChecking] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [grantedSuccess, setGrantedSuccess] = useState(false)

  // 弹窗开启期间，定时（1.2s）后台轮询检测用户是否已在系统偏好中开启了开关
  useEffect(() => {
    if (!open) {
      setErrorMessage(null)
      setGrantedSuccess(false)
      return
    }

    const interval = setInterval(async () => {
      if (window.api?.system) {
        try {
          const hasPermission = await window.api.system.checkAccessibility(false)
          if (hasPermission) {
            setGrantedSuccess(true)
            clearInterval(interval)
            if (onPermissionGranted) {
              onPermissionGranted()
            }
            setTimeout(() => {
              onOpenChange(false)
            }, 800)
          }
        } catch {
          // 忽略轮询检测异常
        }
      }
    }, 1200)

    return () => clearInterval(interval)
  }, [open, onPermissionGranted, onOpenChange])

  const handleOpenSettings = async () => {
    setErrorMessage(null)
    if (window.api?.system) {
      // 触发 macOS 系统的权限申请弹窗与直接打开系统偏好设置
      await window.api.system.checkAccessibility(true)
      await window.api.system.openAccessibilitySettings()
    }
  }

  const handleCheckPermissionAgain = async () => {
    setChecking(true)
    setErrorMessage(null)
    try {
      if (window.api?.system) {
        const hasPermission = await window.api.system.checkAccessibility(false)
        if (hasPermission) {
          setGrantedSuccess(true)
          if (onPermissionGranted) {
            onPermissionGranted()
          }
          setTimeout(() => {
            onOpenChange(false)
          }, 600)
          return
        }
      }
      setErrorMessage(
        t('accessibilityModal.notGrantedError') ||
          '系统尚未检测到授权，请在系统设置中找到 ParrotLingo 并开启权限开关。'
      )
    } catch {
      setErrorMessage('检测辅助功能授权时出错，请重试')
    } finally {
      setChecking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 select-none">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <span>{t('accessibilityModal.title') || '开启划词助手 · 需要辅助功能授权'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            {t('accessibilityModal.desc') ||
              '划词助手需要 macOS 的「辅助功能权限」，才能在浏览器、阅读器及其他应用中快速捕获选中文本并即时翻译。'}
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/60 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <span>{t('accessibilityModal.guideTitle') || '授权指引：'}</span>
            </div>
            <div className="space-y-1">
              <div>{t('accessibilityModal.step1') || '1. 点击下方「前往开启授权」；'}</div>
              <div>{t('accessibilityModal.step2') || '2. 在系统设置列表中找到 ParrotLingo；'}</div>
              <div>
                {t('accessibilityModal.step3') || '3. 开启权限开关后返回，系统将自动就绪。'}
              </div>
            </div>
            <div className="pt-1 text-[10px] text-amber-600 dark:text-amber-400/90 leading-tight">
              {t('accessibilityModal.reinstallTip') ||
                '💡 提示：若列表中已有 ParrotLingo 且开关已开启，因重新安装更新，请先关闭开关再重新开启（或删除后重新添加）以刷新 macOS 权限。'}
            </div>
          </div>

          {grantedSuccess ? (
            <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-in fade-in-0 duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {t('accessibilityModal.grantedSuccess') || '已成功获取授权，划词助手已就绪！'}
              </span>
            </div>
          ) : errorMessage ? (
            <div className="flex items-start space-x-1.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          ) : null}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleOpenSettings}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t('accessibilityModal.openSettings') || '前往开启授权'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              {t('accessibilityModal.later') || '稍后再说'}
            </button>
            <button
              type="button"
              disabled={checking || grantedSuccess}
              onClick={handleCheckPermissionAgain}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)'
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {grantedSuccess
                  ? '已就绪'
                  : checking
                    ? t('accessibilityModal.checking') || '检测中...'
                    : t('accessibilityModal.checkButton') || '我已授权'}
              </span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
