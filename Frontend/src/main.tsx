import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './responsive.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'

// Reapply saved font scale from localStorage before rendering to prevent UI flash
const savedFontScale = localStorage.getItem("mcl-font-scale");
if (savedFontScale) {
  const scale = Number(savedFontScale);
  if (!Number.isNaN(scale) && scale >= 85 && scale <= 115) {
    document.documentElement.style.fontSize = `${(scale / 100) * 16}px`;
    (document.documentElement.style as unknown as Record<string, string>).zoom = `${scale / 100}`;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

// Register Service Worker for PWA Web Push notifications with proactive update checks
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Force update check so mobile devices immediately receive the latest SW navigation handlers
        void reg.update();
      })
      .catch((err) => {
        console.error('[SW] Service worker registration failed:', err);
      });
  });
}

