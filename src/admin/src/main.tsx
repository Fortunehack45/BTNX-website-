import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || String(event.reason || '');
  if (
    reason.toLowerCase().includes('metamask') ||
    reason.toLowerCase().includes('ethereum') ||
    reason.toLowerCase().includes('wallet') ||
    reason.toLowerCase().includes('provider')
  ) {
    event.preventDefault();
    console.warn('Suppressed third-party wallet/extension rejection in admin:', reason);
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
    console.warn('Suppressed third-party wallet/extension error in admin:', msg);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

