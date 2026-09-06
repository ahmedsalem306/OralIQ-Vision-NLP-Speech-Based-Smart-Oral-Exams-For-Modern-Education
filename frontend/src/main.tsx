import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { I18nProvider } from './i18n'
import Preloader from './components/Preloader'

function Root() {
    const [loaded, setLoaded] = useState(false);
    const [showApp, setShowApp] = useState(false);

    useEffect(() => {
        // Simulate asset loading
        const timer = setTimeout(() => setLoaded(true), 1200);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            {!showApp && <Preloader isLoaded={loaded} onFinish={() => setShowApp(true)} />}
            <div style={{ visibility: showApp ? 'visible' : 'hidden' }}>
                <App />
            </div>
        </>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <I18nProvider>
            <BrowserRouter>
                <Root />
            </BrowserRouter>
        </I18nProvider>
    </React.StrictMode>,
)
