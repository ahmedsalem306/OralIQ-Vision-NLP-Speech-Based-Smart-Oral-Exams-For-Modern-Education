import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { I18nProvider } from './i18n'
import { ThemeProvider } from './lib/theme'
import { ToastProvider } from './components/ui/toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ServerStatus } from './components/ServerStatus'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <ThemeProvider>
                <I18nProvider>
                    <ToastProvider>
                        <ServerStatus />
                        <BrowserRouter>
                            <App />
                        </BrowserRouter>
                    </ToastProvider>
                </I18nProvider>
            </ThemeProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)
