import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/hanken-grotesk/400.css'
import '@fontsource/hanken-grotesk/500.css'
import '@fontsource/hanken-grotesk/600.css'
import { designTokenCssVariables } from '../../design/tokens'
import App from './App'
import './styles.css'
import './popover-v2.css'

// Tokens go in a zero-specificity rule at the top of <head>, so the
// stylesheet's dark-mode block can override them (inline styles couldn't).
const tokenStyle = document.createElement('style')
tokenStyle.textContent = `:where(:root){${Object.entries(designTokenCssVariables)
  .map(([name, value]) => `${name}:${value};`)
  .join('')}}`
document.head.prepend(tokenStyle)

// Desktop app: the window is transparent on macOS, so only the rounded
// .widget card should paint. Mark the page so html/body stay transparent.
if ('flick' in window) document.documentElement.classList.add('is-desktop-app')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
