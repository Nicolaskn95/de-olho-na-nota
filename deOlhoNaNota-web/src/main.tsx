import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('[main.tsx] Iniciando aplicação...')

const rootElement = document.getElementById('root')
console.log('[main.tsx] Root element:', rootElement)

if (rootElement) {
  console.log('[main.tsx] Criando root React...')
  const root = createRoot(rootElement)
  console.log('[main.tsx] Renderizando App...')
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('[main.tsx] App renderizado!')
} else {
  console.error('[main.tsx] ERRO: Elemento root não encontrado!')
}
