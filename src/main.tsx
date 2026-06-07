import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Preload both models in background after page load so first session starts fast
window.addEventListener('load', () => {
  setTimeout(() => {
    import('./lib/mediapipe').then(({ initPoseLandmarker, initHandLandmarker }) => {
      initPoseLandmarker().catch(() => {/* ignore preload errors */})
      initHandLandmarker().catch(() => {/* ignore preload errors */})
    })
  }, 2000) // delay 2s so it doesn't compete with initial render
})
