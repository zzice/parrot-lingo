import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Languages, Search, Copy, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/useAppStore'
import logoImg from '../../assets/logo.png'
import { applyThemeColorToDOM } from '../../utils/theme'
import i18n, { resolveLanguage } from '../../i18n'
import { buildSearchUrl, SearchEngineType } from '../../utils/searchEngine'

export const SelectionToolbar: React.FC = () => {
  const { t } = useTranslation()
  const { settings, fetchSettings } = useAppStore()
  const [selectedText, setSelectedText] = useState('')
  const [sourceApp, setSourceApp] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isCompact = Boolean(settings?.selection?.compactMode)
  const showSearch = settings?.selection?.showSearch !== false

  // 初始加载设置
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (settings?.system) {
      if (settings.system.themeColor) {
        applyThemeColorToDOM(settings.system.themeColor)
      }
      if (settings.system.theme) {
        const root = document.documentElement
        root.classList.remove('dark', 'light')
        const isDark =
          settings.system.theme === 'dark' ||
          (settings.system.theme === 'system' &&
            window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches)
        root.classList.add(isDark ? 'dark' : 'light')
      }
      if (settings.system.language) {
        i18n.changeLanguage(resolveLanguage(settings.system.language))
      }
    }
  }, [settings?.system])

  // 上报工具栏实际渲染尺寸给主进程
  const reportSize = useCallback(() => {
    if (containerRef.current && window.api?.selection) {
      const el = containerRef.current
      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      const marginLeft = parseFloat(style.marginLeft || '0') || 0
      const marginRight = parseFloat(style.marginRight || '0') || 0
      const marginTop = parseFloat(style.marginTop || '0') || 0
      const marginBottom = parseFloat(style.marginBottom || '0') || 0

      const width = Math.ceil(rect.width + marginLeft + marginRight + 8)
      const height = Math.ceil(rect.height + marginTop + marginBottom + 8)
      window.api.selection.determineToolbarSize(width, height)
    }
  }, [])

  useEffect(() => {
    reportSize()
  }, [reportSize, isCompact, showSearch, selectedText])

  // 监听选中文本事件 (支持 selection.text_selected 与 toolbar:show)
  useEffect(() => {
    if (window.events) {
      const un1 = window.events.on('selection.text_selected', (payload: any) => {
        if (payload?.text) {
          setSelectedText(payload.text)
          if (payload.sourceApp) {
            setSourceApp(payload.sourceApp)
          }
          setCopied(false)
          reportSize()
        }
      })

      const un2 = window.events.on('toolbar:show', (payload: any) => {
        if (payload?.text) {
          setSelectedText(payload.text)
          if (payload.sourceApp) {
            setSourceApp(payload.sourceApp)
          }
          setCopied(false)
          reportSize()
        }
      })

      return () => {
        un1()
        un2()
      }
    }
    return undefined
  }, [reportSize])

  const handleAction = async (action: 'translate' | 'search' | 'copy') => {
    if (!selectedText || !selectedText.trim()) return

    if (action === 'copy') {
      if (window.api?.selection) {
        await window.api.selection.writeToClipboard(selectedText)
      } else {
        await navigator.clipboard.writeText(selectedText)
      }
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        if (window.api?.selection) {
          window.api.selection.hideToolbar()
        }
      }, 800)
      return
    }

    if (action === 'search') {
      const engine = (settings?.selection?.searchEngine || 'google') as SearchEngineType
      const customUrl = settings?.selection?.customSearchEngineUrl
      const searchUrl = buildSearchUrl(engine, selectedText, customUrl)
      if (window.api?.system?.openExternal) {
        await window.api.system.openExternal(searchUrl)
      } else {
        window.open(searchUrl, '_blank')
      }
      if (window.api?.selection) {
        window.api.selection.hideToolbar()
      }
      return
    }

    // 翻译：呼出功能小窗口并隐藏悬浮工具栏 (携带真实 sourceApp)
    if (window.api?.windowControl) {
      window.api.windowControl.showSelection(selectedText, action, undefined, sourceApp)
    }
    if (window.api?.selection) {
      window.api.selection.hideToolbar()
    }
  }

  return (
    <div className="toolbar-wrapper">
      <div ref={containerRef} className="toolbar-container" data-ui="selection.toolbar">
        {/* 左侧 Logo 拖拽区域 */}
        <div className="toolbar-logo" title="ParrotLingo">
          <img src={logoImg} alt="ParrotLingo" draggable={false} />
        </div>

        <div className="toolbar-divider" />

        {/* 操作按钮组 (翻译、搜索、复制) */}
        <div className="toolbar-actions">
          {/* 翻译 */}
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleAction('translate')}
            title={isCompact ? t('selectionSettings.actionTranslate') || '翻译' : undefined}
            className="toolbar-btn"
          >
            <Languages />
            {!isCompact && <span>{t('selectionSettings.actionTranslate') || '翻译'}</span>}
          </button>

          {/* 搜索 */}
          {showSearch && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAction('search')}
              title={isCompact ? t('selectionSettings.actionSearch') || '搜索' : undefined}
              className="toolbar-btn"
            >
              <Search />
              {!isCompact && <span>{t('selectionSettings.actionSearch') || '搜索'}</span>}
            </button>
          )}

          {/* 复制 */}
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleAction('copy')}
            title={
              isCompact
                ? copied
                  ? t('common.copySuccess')
                  : t('selectionSettings.actionCopy')
                : undefined
            }
            className={`toolbar-btn ${copied ? 'copied' : ''}`}
          >
            {copied ? <Check style={{ color: 'var(--color-primary)' }} /> : <Copy />}
            {!isCompact && <span>{t('selectionSettings.actionCopy')}</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SelectionToolbar
