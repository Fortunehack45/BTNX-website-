import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import SupportPortalApp from '../support/src/App.tsx';
import AdminApp from '../admin/src/App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

// Suppress unhandled rejections/errors caused by browser extensions (e.g. MetaMask, Wallet injected scripts)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || String(event.reason || '');
  if (
    reason.toLowerCase().includes('metamask') ||
    reason.toLowerCase().includes('ethereum') ||
    reason.toLowerCase().includes('wallet') ||
    reason.toLowerCase().includes('provider')
  ) {
    event.preventDefault();
    console.warn('Suppressed third-party wallet/extension rejection:', reason);
  }
});

window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (
    msg.toLowerCase().includes('metamask') ||
    msg.toLowerCase().includes('ethereum') ||
    msg.toLowerCase().includes('wallet')
  ) {
    event.preventDefault();
    console.warn('Suppressed third-party wallet/extension error:', msg);
  }
});

// Restore active route on reload if preview container resets pathname to "/"
try {
  const currentFull = window.location.pathname + window.location.search + window.location.hash;
  if (window.location.pathname === '/' && !window.location.search && !window.location.hash) {
    const savedRoute =
      sessionStorage.getItem('btnx_last_route') ||
      localStorage.getItem('btnx_last_route');
    if (
      savedRoute &&
      savedRoute !== '/' &&
      savedRoute.startsWith('/') &&
      !savedRoute.startsWith('/admin') &&
      !savedRoute.startsWith('/support')
    ) {
      window.history.replaceState(null, '', savedRoute);
    }
  } else if (
    !window.location.pathname.startsWith('/admin') &&
    !window.location.pathname.startsWith('/support')
  ) {
    sessionStorage.setItem('btnx_last_route', currentFull);
    localStorage.setItem('btnx_last_route', currentFull);
  }
} catch {
  // Ignore storage access errors in restricted modes
}

const currentPathname = window.location.pathname;
const isSupportRoot = currentPathname === '/support' || currentPathname.startsWith('/support/');
const isAdminRoot = currentPathname === '/admin' || currentPathname.startsWith('/admin/');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isAdminRoot ? (
        <AdminApp />
      ) : (
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              {isSupportRoot ? <SupportPortalApp /> : <App />}
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      )}
    </ErrorBoundary>
  </StrictMode>,
);

