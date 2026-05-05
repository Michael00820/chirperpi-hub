import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './registerServiceWorker'
import { initSentryClient } from './sentry'
import ErrorBoundary from './components/ui/ErrorBoundary'

// Initialize Sentry for error tracking
initSentryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

registerServiceWorker()