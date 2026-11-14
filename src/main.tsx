import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);

