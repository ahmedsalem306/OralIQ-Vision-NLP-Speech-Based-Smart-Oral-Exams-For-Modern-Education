import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { AppProviders } from './AppProviders'

const container = document.getElementById('root')!
const tree = (
    <AppProviders>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </AppProviders>
)

// The home page ships as ready HTML (scripts/prerender.mjs). The head script in index.html decides
// whether this visit renders exactly like the build did ("hydrate": "/", Arabic, light, signed out,
// motion allowed) and can adopt it; otherwise ("skip") the markup was hidden before the first paint
// and the app draws from scratch, as every other route does.
if (container.hasAttribute('data-prerendered') && document.documentElement.dataset.prerender === 'hydrate') {
    ReactDOM.hydrateRoot(container, tree)
} else {
    container.removeAttribute('data-prerendered')
    container.replaceChildren()
    delete document.documentElement.dataset.prerender
    ReactDOM.createRoot(container).render(tree)
}
