import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

console.log('[boot] crossOriginIsolated:', self.crossOriginIsolated, '| hwThreads:', navigator.hardwareConcurrency)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
