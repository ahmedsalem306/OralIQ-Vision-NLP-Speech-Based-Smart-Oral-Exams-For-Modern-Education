import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { AppProviders } from './AppProviders'

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
