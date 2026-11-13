import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { AppProviders } from './AppProviders'
import { privateErrorEvent } from './lib/privacyTelemetry'

// ── Sentry Error Tracking (only active when VITE_SENTRY_DSN is set) ──
const _sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (_sentryDsn) {
    import('@sentry/react').then(Sentry => {
        Sentry.init({
            dsn: _sentryDsn,
            environment: import.meta.env.MODE,         // 'production' | 'development'
            tracesSampleRate: 0,
            replaysSessionSampleRate: 0,
            replaysOnErrorSampleRate: 0,
            beforeSend: privateErrorEvent,
            beforeBreadcrumb: () => null,
            beforeSendLog: () => null,
            beforeSendMetric: () => null,
        })
    }).catch(() => { /* Sentry init is optional — never block the app */ })
}

const container = document.getElementById('root')!
container.removeAttribute('data-prerendered')
delete document.documentElement.dataset.prerender

ReactDOM.createRoot(container).render(
    <AppProviders>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </AppProviders>
)
