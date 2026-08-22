import React, { useEffect, Component, ErrorInfo, ReactNode, Activity } from 'react'

import { TitleBar } from './layouts/TitleBar'
import { Sidebar } from './layouts/Sidebar'
import { useAppStore } from './stores/useAppStore'
import { TodayView } from './pages/workbench/TodayView'
import { CorpusView } from './pages/workbench/CorpusView'
import { ReadingView } from './pages/workbench/ReadingView'
import { NotebookView } from './pages/workbench/NotebookView'
import { SettingsView } from './pages/settings/SettingsView'
import { SelectionPopup } from './pages/selection/SelectionPopup'
import { SelectionToolbar } from './pages/selection/SelectionToolbar'
import { AccessibilityModal } from './components/AccessibilityModal'
import { UpdateDialog } from './components/UpdateDialog'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ParrotLingo React tree:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-900 text-white p-6">
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <p className="text-xs text-slate-400 mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs"
          >
            Reload App
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export const App: React.FC = () => {
  const {
    currentNav,
    settings,
    updateSettings,
    hasAccessibility,
    checkAccessibility,
    isAccessibilityModalOpen,
    setIsAccessibilityModalOpen,
    updaterState,
    isUpdateDialogOpen,
    setIsUpdateDialogOpen,
    downloadUpdate,
    cancelDownloadUpdate,
    installUpdate,
    init
  } = useAppStore()

  const isSelectionPopup = window.location.hash === '#selection-popup'
  const isSelectionToolbar = window.location.hash === '#selection-toolbar'

  useEffect(() => {
    init()
  }, [init])

  // 首次启动时，若在 macOS 且未获得辅助功能授权，弹出向导弹窗引导用户开启
  useEffect(() => {
    const isMac =
      typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
    if (!isMac) return

    if (hasAccessibility === false) {
      const prompted = sessionStorage.getItem('parrot_accessibility_prompted')
      if (!prompted) {
        sessionStorage.setItem('parrot_accessibility_prompted', 'true')
        setIsAccessibilityModalOpen(true)
      }
    }
  }, [hasAccessibility, setIsAccessibilityModalOpen])

  const handlePermissionGranted = async () => {
    await checkAccessibility()
    if (settings) {
      updateSettings({
        selection: {
          ...settings.selection,
          enabled: true
        }
      })
    }
  }

  if (isSelectionPopup) {
    return <SelectionPopup />
  }

  if (isSelectionToolbar) {
    return <SelectionToolbar />
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen w-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden select-none relative">
        {/* 顶部标题栏 */}
        <TitleBar />

        {/* 主体两栏/三栏布局 */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* 左侧一级主导航栏 */}
          <Sidebar />

          {/* 主工作区展示 (常驻内存保活，0ms 瞬时无损切换) */}
          <main className="flex-1 h-full flex overflow-hidden bg-slate-100/60 dark:bg-slate-950/60 relative">
            <Activity mode={currentNav === 'today' ? 'visible' : 'hidden'}>
              <div
                className={`flex-1 h-full flex flex-col overflow-hidden ${
                  currentNav === 'today' ? '' : 'hidden'
                }`}
              >
                <TodayView />
              </div>
            </Activity>

            <Activity mode={currentNav === 'corpus' ? 'visible' : 'hidden'}>
              <div
                className={`flex-1 h-full flex flex-col overflow-hidden ${
                  currentNav === 'corpus' ? '' : 'hidden'
                }`}
              >
                <CorpusView />
              </div>
            </Activity>

            <Activity mode={currentNav === 'reading' ? 'visible' : 'hidden'}>
              <div
                className={`flex-1 h-full flex flex-col overflow-hidden ${
                  currentNav === 'reading' ? '' : 'hidden'
                }`}
              >
                <ReadingView />
              </div>
            </Activity>

            <Activity mode={currentNav === 'notebook' ? 'visible' : 'hidden'}>
              <div
                className={`flex-1 h-full flex flex-col overflow-hidden ${
                  currentNav === 'notebook' ? '' : 'hidden'
                }`}
              >
                <NotebookView />
              </div>
            </Activity>
          </main>

          {/* 设置全屏覆盖层 (盖住工作台，左侧带返回按钮) */}
          {currentNav === 'settings' && <SettingsView />}
        </div>

        {/* 辅助功能授权向导弹窗 */}
        <AccessibilityModal
          open={isAccessibilityModalOpen}
          onOpenChange={setIsAccessibilityModalOpen}
          onPermissionGranted={handlePermissionGranted}
        />

        {/* 全局应用更新弹窗（任何页面均可弹出提示） */}
        <UpdateDialog
          open={isUpdateDialogOpen}
          onOpenChange={setIsUpdateDialogOpen}
          updateInfo={updaterState.updateInfo}
          progress={updaterState.progress}
          isDownloading={updaterState.status === 'downloading'}
          isDownloaded={updaterState.status === 'downloaded'}
          onDownload={downloadUpdate}
          onInstall={installUpdate}
          onCancelDownload={cancelDownloadUpdate}
        />
      </div>
    </ErrorBoundary>
  )
}

export default App
