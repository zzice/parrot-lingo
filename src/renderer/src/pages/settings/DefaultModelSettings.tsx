import React from 'react'
import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/useAppStore'
import { ModelSelect } from '../../components/ModelSelect'

export const DefaultModelSettings: React.FC = () => {
  const { settings, updateSettings } = useAppStore()
  const { t } = useTranslation()

  const defaultModels = settings?.defaultModels || {
    globalModel: 'parrotlingo:parrot-lingo-v1',
    fastModel: 'follow',
    deepModel: 'follow',
    collocationModel: 'follow',
    readingModel: 'follow'
  }

  const handleUpdate = (val: string) => {
    updateSettings({
      defaultModels: {
        ...defaultModels,
        globalModel: val,
        fastModel: 'follow',
        deepModel: 'follow',
        collocationModel: 'follow',
        readingModel: 'follow'
      }
    })
  }

  const currentModel = defaultModels.globalModel || 'parrotlingo:parrot-lingo-v1'

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-5 select-none">
      {/* 核心配置卡片区 */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
        {/* 翻译模型 */}
        <div className="flex items-center justify-between">
          <div className="space-y-1 max-w-md pr-4">
            <div className="flex items-center space-x-2">
              <Languages className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {t('defaultModelSettings.translateModelTitle') || '翻译模型'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('defaultModelSettings.translateModelDesc') ||
                '划词翻译、语境释义与生词解析所使用的默认 AI 模型'}
            </p>
          </div>

          <ModelSelect value={currentModel} onChange={handleUpdate} allowFollow={false} />
        </div>
      </div>
    </div>
  )
}

export default DefaultModelSettings
