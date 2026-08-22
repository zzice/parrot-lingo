import React, { useState } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/useAppStore'
import { Switch } from '../../components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select'
import { TestProxyResult } from '../../types'

export const GeneralSettings: React.FC = () => {
  const { settings, updateSettings } = useAppStore()
  const { t } = useTranslation()

  const [testingProxy, setTestingProxy] = useState(false)
  const [proxyTestResult, setProxyTestResult] = useState<TestProxyResult | null>(null)

  if (!settings) return null
  const { system } = settings

  // 托盘与联动更新逻辑
  const updateTray = (showTray: boolean) => {
    updateSettings({
      system: {
        ...system,
        showTrayIcon: showTray,
        closeToTray: showTray ? system.closeToTray : false,
        startMinimized: showTray ? system.startMinimized : false
      }
    })
  }

  const updateCloseToTray = (closeToTray: boolean) => {
    updateSettings({
      system: {
        ...system,
        closeToTray,
        showTrayIcon: closeToTray && !system.showTrayIcon ? true : system.showTrayIcon
      }
    })
  }

  const updateStartMinimized = (startMinimized: boolean) => {
    updateSettings({
      system: {
        ...system,
        startMinimized,
        showTrayIcon: startMinimized && !system.showTrayIcon ? true : system.showTrayIcon
      }
    })
  }

  const handleTestProxy = async () => {
    if (!window.api?.system?.testProxy) return
    setTestingProxy(true)
    setProxyTestResult(null)
    try {
      const res = await window.api.system.testProxy(system.customProxyUrl)
      setProxyTestResult(res)
    } catch (err: any) {
      setProxyTestResult({
        success: false,
        message: err.message || '测试失败'
      })
    } finally {
      setTestingProxy(false)
    }
  }

  const handleQuickPresetProxy = (url: string) => {
    updateSettings({
      system: {
        ...system,
        proxyMode: 'custom',
        customProxyUrl: url
      }
    })
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 select-none [&::-webkit-scrollbar]:hidden">
      <div className="max-w-3xl space-y-5">
        {/* 卡片 1: 启动与托盘行为 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3.5">
          <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
            {t('generalSettings.startupTitle')}
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800/70" />

          {/* 开机自动启动 */}
          <div className="flex items-center justify-between min-h-[30px] py-0.5">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {t('generalSettings.autoLaunch')}
            </span>
            <Switch
              checked={system.autoLaunch ?? false}
              onCheckedChange={(checked) =>
                updateSettings({
                  system: { ...system, autoLaunch: checked }
                })
              }
            />
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800/70" />

          {/* 启动时最小化到托盘 */}
          <div className="flex items-center justify-between min-h-[30px] py-0.5">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {t('generalSettings.startMinimized')}
            </span>
            <Switch
              checked={system.startMinimized ?? false}
              onCheckedChange={updateStartMinimized}
            />
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800/70" />

          {/* 显示托盘图标 */}
          <div className="flex items-center justify-between min-h-[30px] py-0.5">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {t('generalSettings.showTrayIcon')}
            </span>
            <Switch checked={system.showTrayIcon ?? true} onCheckedChange={updateTray} />
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800/70" />

          {/* 关闭时最小化到托盘 */}
          <div className="flex items-center justify-between min-h-[30px] py-0.5">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {t('generalSettings.closeToTray')}
            </span>
            <Switch checked={system.closeToTray ?? true} onCheckedChange={updateCloseToTray} />
          </div>
        </div>

        {/* 卡片 2: 网络代理配置 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-slate-500" />
                <span>{t('generalSettings.proxyTitle')}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('generalSettings.proxyDesc') ||
                  '配置全局网络代理，保障国外 AI 模型与接口服务畅通访问'}
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800/70" />

          {/* 代理模式选择 */}
          <div className="flex items-center justify-between min-h-[30px] py-0.5">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {t('generalSettings.proxyMode')}
            </span>
            <div className="w-52">
              <Select
                value={system.proxyMode || 'system'}
                onValueChange={(val: 'system' | 'direct' | 'custom') =>
                  updateSettings({
                    system: { ...system, proxyMode: val }
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder={t('generalSettings.proxyMode')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t('generalSettings.proxySystem')}</SelectItem>
                  <SelectItem value="direct">{t('generalSettings.proxyDirect')}</SelectItem>
                  <SelectItem value="custom">{t('generalSettings.proxyCustom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 自定义代理服务器配置 */}
          {system.proxyMode === 'custom' && (
            <>
              <div className="h-px bg-slate-100 dark:bg-slate-800/70" />

              {/* 常用代理预设快捷标签 */}
              <div className="flex items-center justify-between text-[11px] py-0.5">
                <span className="text-slate-500 dark:text-slate-400">
                  {t('generalSettings.quickProxyPresets') || '常用代理端口预设：'}
                </span>
                <div className="flex items-center space-x-1.5">
                  {[
                    { label: 'Clash (7890)', url: 'http://127.0.0.1:7890' },
                    { label: 'Verge (7897)', url: 'http://127.0.0.1:7897' },
                    { label: 'V2Ray (10808)', url: 'http://127.0.0.1:10808' },
                    { label: 'Surge (6152)', url: 'http://127.0.0.1:6152' }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleQuickPresetProxy(preset.url)}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-[var(--color-primary-subtle)] text-slate-600 dark:text-slate-300 hover:text-[var(--color-primary)] text-[10px] font-mono transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 代理地址输入框与测试按钮 */}
              <div className="flex items-center justify-between min-h-[30px] py-0.5">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200 block">
                    {t('generalSettings.proxyAddress')}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    支持 HTTP、HTTPS、SOCKS5 协议
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={system.customProxyUrl || ''}
                    onChange={(e) =>
                      updateSettings({
                        system: { ...system, customProxyUrl: e.target.value }
                      })
                    }
                    placeholder="http://127.0.0.1:7890 或 socks5://127.0.0.1:10808"
                    className="w-72 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[var(--color-primary)] font-mono"
                  />

                  <button
                    type="button"
                    onClick={handleTestProxy}
                    disabled={testingProxy || !system.customProxyUrl?.trim()}
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-foreground)'
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-2xs shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingProxy ? 'animate-spin' : ''}`} />
                    <span>
                      {testingProxy ? '测试中...' : t('generalSettings.testProxy') || '测试'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 代理连通性测试结果徽标 */}
              {proxyTestResult && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in-0 ${
                    proxyTestResult.success
                      ? 'border shadow-2xs'
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}
                  style={
                    proxyTestResult.success
                      ? {
                          backgroundColor: 'var(--color-primary-subtle)',
                          borderColor: 'var(--color-primary-border)',
                          color: 'var(--color-primary)'
                        }
                      : undefined
                  }
                >
                  {proxyTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  )}
                  <span>{proxyTestResult.message}</span>
                </div>
              )}

              <div className="h-px bg-slate-100 dark:bg-slate-800/70" />

              {/* 绕过代理规则 (Bypass Rules) */}
              <div className="flex items-center justify-between min-h-[30px] py-0.5">
                <div className="space-y-0.5 max-w-sm">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {t('generalSettings.proxyBypass') || '绕过代理规则 (Bypass Rules)'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {t('generalSettings.proxyBypassTip') ||
                      '本地私有模型 (Ollama/LocalAI) 及局域网地址直连，逗号分隔'}
                  </p>
                </div>

                <input
                  type="text"
                  value={system.proxyBypassRules || 'localhost,127.0.0.1,::1,*.local,<local>'}
                  onChange={(e) =>
                    updateSettings({
                      system: { ...system, proxyBypassRules: e.target.value }
                    })
                  }
                  placeholder="localhost,127.0.0.1,::1,*.local,<local>"
                  className="w-72 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[var(--color-primary)] font-mono"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default GeneralSettings
