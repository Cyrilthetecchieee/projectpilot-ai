import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './account.css'
import './initialization.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider><App /></AuthProvider>
  </StrictMode>,
)
