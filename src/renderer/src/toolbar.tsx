import React from 'react'
import { createRoot } from 'react-dom/client'
import { SelectionToolbar } from './pages/selection/SelectionToolbar'
import './i18n'
// 注意：工具栏使用独立的极简 CSS，不引入 main.css（main.css 会设置 body 背景色）
import './assets/toolbar.css'

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <SelectionToolbar />
  </React.StrictMode>
)
