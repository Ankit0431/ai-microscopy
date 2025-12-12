import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ToastContainer from './components/ToastContainer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastContainer>
      <App />
    </ToastContainer>
  </StrictMode>,
)
