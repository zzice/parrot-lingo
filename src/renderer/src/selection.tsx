import React from 'react'
import { createRoot } from 'react-dom/client'
import { SelectionPopup } from './pages/selection/SelectionPopup'
import './i18n'
import './assets/main.css'

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <SelectionPopup />
  </React.StrictMode>
)
