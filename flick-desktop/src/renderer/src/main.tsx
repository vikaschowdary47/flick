import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/800.css'
import { designTokenCssVariables } from '../../design/tokens'
import App from './App'
import './styles.css'

for (const [name, value] of Object.entries(designTokenCssVariables)) {
  document.documentElement.style.setProperty(name, value)
}

// Desktop app: the window is transparent on macOS, so only the rounded
// .widget card should paint. Mark the page so html/body stay transparent.
if ('flick' in window) document.documentElement.classList.add('is-desktop-app')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
