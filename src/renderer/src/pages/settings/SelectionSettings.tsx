import React, { useState, useEffect } from 'react'
import {
  HelpCircle,
  Languages,
  Search,
  Copy,
  Check,
  Sparkles,
  Layers,
  Keyboard,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clsx } from 'clsx'
import { useAppStore } from '../../stores/useAppStore'
import { Switch } from '../../components/ui/switch'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { Slider } from '../../components/ui/slider'
import { Tooltip } from '../../components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select'
import { AccessibilityModal } from '../../components/AccessibilityModal'
import { SearchEngineModal } from '../../components/SearchEngineModal'
import { getShortcutFromKeyboardEvent, formatShortcutKeys } from '../../utils/shortcut'
import logoImg from '../../assets/logo.png'

export const SelectionSettings: React.FC = () => {
  const { settings, updateSettings } = useAppStore()
  const { t } = useTranslation()
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [showSearchEngineModal, setShowSearchEngineModal] = useState(false)
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false)

  const handleShortcutKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!isRecordingShortcut) return
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      setIsRecordingShortcut(false)
      return
    }

    const shortcut = getShortcutFromKeyboardEvent(e)
    if (shortcut) {
      handleUpdate({ shortcutKey: shortcut })
      setIsRecordingShortcut(false)
    }
  }

  useEffect(() => {
    if (window.events) {
      const cleanup = window.events.on('system:accessibility-lost', () => {
        setShowPermissionModal(true)
      })
      return cleanup
    }
    return undefined
  }, [])

  if (!settings) return null
  const { selection } = settings

  const handleToggleEnable = async (checked: boolean) => {
    if (checked) {
      // 开启时必须检查 macOS 辅助功能权限
      if (window.api?.system) {
        const hasPermission = await window.api.system.checkAccessibility(false)
        if (!hasPermission) {
          setShowPermissionModal(true)
          return
        }
      }
    }

    updateSettings({
      selection: {
        ...selection,
        enabled: checked
      }
    })
  }

  const handleUpdate = (updates: Partial<typeof selection>) => {
    updateSettings({
      selection: {
        ...selection,
        ...updates
      }
    })
  }

  const [copied, setCopied] = useState(false)
  const [localOpacity, setLocalOpacity] = useState(selection.opacity)

  useEffect(() => {
    setLocalOpacity(selection.opacity)
  }, [selection.opacity])

  const handleCopyClick = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const getEngineDisplayName = () => {
    const engine = selection.searchEngine || 'google'
    if (engine === 'google') return 'Google'
    if (engine === 'baidu') return 'Baidu (百度)'
    if (engine === 'bing') return 'Bing (必应)'
    if (engine === 'custom') {
      return selection.customSearchEngineName || t('searchEngine.custom') || '自定义'
    }
    return 'Google'
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-5 select-none">
      {/* 提示模态框 */}
      <AccessibilityModal
        open={showPermissionModal}
        onOpenChange={setShowPermissionModal}
        onPermissionGranted={() => {
          updateSettings({
            selection: {
              ...selection,
              enabled: true
            }
          })
        }}
      />

      {/* 卡片 1: 基础启用与工具栏预览 */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('selectionSettings.enable')}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {t('selectionSettings.enableDesc')}
            </div>
          </div>
          <Switch checked={selection.enabled} onCheckedChange={handleToggleEnable} />
        </div>

        {/* 预览工具栏 */}
        {selection.enabled && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                <span>{t('selectionSettings.previewToolbar')}</span>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {selection.compactMode
                  ? t('selectionSettings.compactModeLabel')
                  : t('selectionSettings.standardModeLabel')}
              </span>
            </div>

            {/* 胶囊工具栏浮动预览条 (1:1 还原真实悬浮工具栏) */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center border border-slate-200/60 dark:border-slate-800/40">
              <div className="inline-flex items-stretch h-[36px] rounded-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-md overflow-hidden select-none">
                {/* 左侧 Logo 标识 */}
                <div className="flex items-center justify-center pl-2.5 pr-2">
                  <img
                    src={logoImg}
                    alt="ParrotLingo"
                    className="w-6 h-6 object-contain rounded-full"
                  />
                </div>

                {/* 分隔线 */}
                <div className="w-px bg-slate-200 dark:bg-slate-700/60 my-2" />

                {/* 翻译 */}
                <button
                  type="button"
                  className="group inline-flex items-center gap-1.5 px-3 h-full text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer transition-colors"
                  style={{
                    color: 'inherit'
                  }}
                >
                  <Languages className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  {!selection.compactMode && <span>{t('selectionSettings.actionTranslate')}</span>}
                </button>

                {/* 搜索 */}
                {selection.showSearch !== false && (
                  <button
                    type="button"
                    className="group inline-flex items-center gap-1.5 px-3 h-full text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    {!selection.compactMode && <span>{t('selectionSettings.actionSearch')}</span>}
                  </button>
                )}

                {/* 复制 */}
                <button
                  type="button"
                  onClick={handleCopyClick}
                  className="group inline-flex items-center gap-1.5 px-3 h-full text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  )}
                  {!selection.compactMode && <span>{t('selectionSettings.actionCopy')}</span>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 仅在划词助手启用时显示下方全部设置 */}
      {selection.enabled && (
        <>
          {/* 卡片: 功能列表 (内置 翻译、搜索、复制) */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-2xs space-y-3.5">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              {t('selectionSettings.functionsTitle') || '功能'}
            </h2>

            <div className="space-y-2.5">
              {/* 1. 翻译 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs">
                    <Languages className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {t('selectionSettings.actionTranslate') || '翻译'}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">
                      {t('defaultModelSettings.globalModelDesc') || '即时划词翻译与深度单词解析'}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 px-2 py-0.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-md select-none">
                  {t('selectionSettings.alwaysEnabled') || '常驻'}
                </div>
              </div>

              {/* 2. 搜索 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs">
                    <Search className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {t('selectionSettings.actionSearch') || '搜索'}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">
                      {t('searchEngine.label') || '搜索引擎'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* 搜索引擎配置 Badge 按钮 */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowSearchEngineModal(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-xs text-slate-700 dark:text-slate-200 shadow-2xs cursor-pointer transition-all focus:outline-none"
                  >
                    <span className="font-medium">{getEngineDisplayName()}</span>
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                  </button>

                  {/* 显示/隐藏开关 */}
                  <Switch
                    checked={selection.showSearch !== false}
                    onCheckedChange={(checked) => handleUpdate({ showSearch: checked })}
                  />
                </div>
              </div>

              {/* 3. 复制 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs">
                    <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {t('selectionSettings.actionCopy') || '复制'}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">
                      {t('common.copySuccess') || '快速复制选中文本到剪贴板'}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 px-2 py-0.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-md select-none">
                  {t('selectionSettings.alwaysEnabled') || '常驻'}
                </div>
              </div>
            </div>
          </div>

          {/* 卡片 2: 工具栏 (含取词方式、紧凑模式) */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              {t('selectionSettings.toolbarTitle')}
            </h2>

            {/* 取词方式 */}
            <div className="flex items-center justify-between py-1">
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                  <span>{t('selectionSettings.captureMethod')}</span>
                  <Tooltip placement="top-start" content={t('selectionSettings.tooltipRemap')}>
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors" />
                  </Tooltip>
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('selectionSettings.captureMethodDesc')}
                </div>
              </div>

              <RadioGroup
                value={selection.captureMethod || 'selection'}
                onValueChange={(val: 'selection' | 'shortcut') =>
                  handleUpdate({ captureMethod: val })
                }
                className="flex flex-row items-center gap-5"
              >
                <Tooltip content={t('selectionSettings.tooltipImmediate')}>
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="selection" id="r-selection" />
                    <label
                      htmlFor="r-selection"
                      className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                    >
                      {t('selectionSettings.selectionOption')}
                    </label>
                  </div>
                </Tooltip>

                <Tooltip placement="top-end" content={t('selectionSettings.tooltipShortcut')}>
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="shortcut" id="r-shortcut" />
                    <label
                      htmlFor="r-shortcut"
                      className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                    >
                      {t('selectionSettings.shortcutOption')}
                    </label>
                  </div>
                </Tooltip>
              </RadioGroup>
            </div>

            {/* 当选择快捷键取词时，显示快捷键配置区域 */}
            {selection.captureMethod === 'shortcut' && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between animate-in fade-in duration-150">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                    <Keyboard className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                    <span>{t('selectionSettings.captureShortcut')}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    {t('selectionSettings.captureShortcutDesc')}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsRecordingShortcut(true)}
                    onKeyDown={handleShortcutKeyDown}
                    onBlur={() => setIsRecordingShortcut(false)}
                    style={
                      isRecordingShortcut
                        ? {
                            backgroundColor: 'var(--color-primary-subtle)',
                            borderColor: 'var(--color-primary)',
                            boxShadow: '0 0 0 2px var(--color-primary-border)'
                          }
                        : undefined
                    }
                    className={clsx(
                      'flex items-center justify-center min-w-[110px] px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer select-none outline-none',
                      isRecordingShortcut
                        ? 'shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[var(--color-primary-border)] hover:bg-slate-100 dark:hover:bg-slate-900'
                    )}
                  >
                    {isRecordingShortcut ? (
                      <span
                        style={{ color: 'var(--color-primary)' }}
                        className="font-semibold animate-pulse"
                      >
                        {t('selectionSettings.recordingShortcut')}
                      </span>
                    ) : (
                      <div className="flex items-center space-x-1">
                        {formatShortcutKeys(selection.shortcutKey || 'Alt+S').map((key, i) => (
                          <kbd
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    )}
                  </button>

                  {selection.shortcutKey && selection.shortcutKey !== 'Alt+S' && (
                    <button
                      type="button"
                      onClick={() => handleUpdate({ shortcutKey: 'Alt+S' })}
                      title={t('selectionSettings.resetDefaultShortcut')}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 紧凑模式 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/40">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {t('selectionSettings.compactMode')}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('selectionSettings.compactModeDesc')}
                </div>
              </div>
              <Switch
                checked={selection.compactMode}
                onCheckedChange={(checked) => handleUpdate({ compactMode: checked })}
              />
            </div>
          </div>

          {/* 卡片 3: 功能窗口 */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              {t('selectionSettings.windowTitle')}
            </h2>

            {/* 跟随工具栏 */}
            <div className="flex items-center justify-between py-1">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {t('selectionSettings.followToolbar')}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('selectionSettings.followToolbarDesc')}
                </div>
              </div>
              <Switch
                checked={selection.followToolbar}
                onCheckedChange={(checked) => handleUpdate({ followToolbar: checked })}
              />
            </div>

            {/* 记住大小 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/40">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {t('selectionSettings.rememberSize')}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('selectionSettings.rememberSizeDesc')}
                </div>
              </div>
              <Switch
                checked={selection.rememberSize}
                onCheckedChange={(checked) => handleUpdate({ rememberSize: checked })}
              />
            </div>

            {/* 自动关闭 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/40">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {t('selectionSettings.autoClose')}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('selectionSettings.autoCloseDesc')}
                </div>
              </div>
              <Switch
                checked={selection.autoClose}
                onCheckedChange={(checked) => handleUpdate({ autoClose: checked })}
              />
            </div>

            {/* 自动置顶 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/40">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {t('selectionSettings.autoPin')}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('selectionSettings.autoPinDesc')}
                </div>
              </div>
              <Switch
                checked={selection.autoPin}
                onCheckedChange={(checked) => handleUpdate({ autoPin: checked })}
              />
            </div>

            {/* 透明度 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/40">
              <div className="space-y-1 pr-6 flex-1">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {t('selectionSettings.opacity')}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('selectionSettings.opacityDesc')}
                </div>
              </div>

              <div className="flex items-center space-x-3 w-48">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-12 text-right">
                  {localOpacity}%
                </span>
                <Slider
                  value={[localOpacity]}
                  min={20}
                  max={100}
                  step={1}
                  onValueChange={(val) => setLocalOpacity(val[0])}
                  onValueCommit={(val) => handleUpdate({ opacity: val[0] })}
                />
              </div>
            </div>

            {/* 目标解释语言 */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/40">
              <div className="space-y-1 pr-6 flex-1">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {t('selectionSettings.targetLanguageTitle') || '目标解释语言'}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('selectionSettings.targetLanguageDesc') ||
                    '划词翻译与学习解析时，AI 默认输出的母语释义与例句语言'}
                </div>
              </div>

              <div className="w-56">
                <Select
                  value={selection.targetLanguage || 'follow'}
                  onValueChange={(val: string) => handleUpdate({ targetLanguage: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t('selectionSettings.targetLanguageFollow')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow">
                      <span className="mr-2">🌐</span>
                      <span>{t('selectionSettings.targetLanguageFollow')}</span>
                    </SelectItem>
                    <SelectItem value="zh-CN">
                      <span className="mr-2">🇨🇳</span>
                      <span>{t('selectionSettings.targetLanguageZhCN')}</span>
                    </SelectItem>
                    <SelectItem value="zh-TW">
                      <span className="mr-2">🇭🇰</span>
                      <span>{t('selectionSettings.targetLanguageZhTW')}</span>
                    </SelectItem>
                    <SelectItem value="en-US">
                      <span className="mr-2">🇺🇸</span>
                      <span>{t('selectionSettings.targetLanguageEn')}</span>
                    </SelectItem>
                    <SelectItem value="ja-JP">
                      <span className="mr-2">🇯🇵</span>
                      <span>{t('selectionSettings.targetLanguageJa')}</span>
                    </SelectItem>
                    <SelectItem value="ko-KR">
                      <span className="mr-2">🇰🇷</span>
                      <span>{t('selectionSettings.targetLanguageKo')}</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 卡片 4: 高级 - 应用筛选 (暂未实现) */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-2xs space-y-4 opacity-75">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <Layers className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <span>{t('selectionSettings.advancedTitle')}</span>
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700 select-none">
                {t('selectionSettings.comingSoon')}
              </span>
            </div>

            {/* 应用筛选 (置灰禁用并悬浮提示) */}
            <Tooltip content={t('selectionSettings.comingSoonTip')} placement="top">
              <div className="flex items-center justify-between py-1 cursor-not-allowed select-none">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {t('selectionSettings.appFilter')}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    {t('selectionSettings.appFilterDesc')}
                  </div>
                </div>

                <RadioGroup
                  value="off"
                  disabled
                  className="flex items-center space-x-4 pointer-events-none opacity-50"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="off" id="filter-off" disabled />
                    <label
                      htmlFor="filter-off"
                      className="text-xs text-slate-700 dark:text-slate-300 cursor-not-allowed"
                    >
                      {t('selectionSettings.filterOff')}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="whitelist" id="filter-whitelist" disabled />
                    <label
                      htmlFor="filter-whitelist"
                      className="text-xs text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    >
                      {t('selectionSettings.filterWhitelist')}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="blacklist" id="filter-blacklist" disabled />
                    <label
                      htmlFor="filter-blacklist"
                      className="text-xs text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    >
                      {t('selectionSettings.filterBlacklist')}
                    </label>
                  </div>
                </RadioGroup>
              </div>
            </Tooltip>
          </div>
        </>
      )}

      {/* 辅助功能权限引导弹窗 */}
      <AccessibilityModal open={showPermissionModal} onOpenChange={setShowPermissionModal} />

      {/* 搜索引擎配置弹窗 */}
      <SearchEngineModal
        open={showSearchEngineModal}
        onOpenChange={setShowSearchEngineModal}
        engine={selection.searchEngine || 'google'}
        customName={selection.customSearchEngineName || ''}
        customUrl={selection.customSearchEngineUrl || ''}
        onSave={(engine, customName, customUrl) => {
          handleUpdate({
            searchEngine: engine,
            customSearchEngineName: customName,
            customSearchEngineUrl: customUrl
          })
        }}
      />
    </div>
  )
}

export default SelectionSettings
