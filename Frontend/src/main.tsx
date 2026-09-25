import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'

// Reapply saved font scale from localStorage before rendering to prevent UI flash
const savedFontScale = localStorage.getItem("mcl-font-scale");
if (savedFontScale) {
  const scale = Number(savedFontScale);
  if (!Number.isNaN(scale) && scale >= 85 && scale <= 115) {
    document.documentElement.style.fontSize = `${(scale / 100) * 16}px`;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
