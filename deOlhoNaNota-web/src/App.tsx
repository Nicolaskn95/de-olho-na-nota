import { EscanearCupom } from './nota-fiscal'
import './App.css'

console.log('[App.tsx] Módulo carregado')

function App() {
  console.log('[App.tsx] Componente App renderizando...')
  return (
    <main className="app">
      <EscanearCupom />
    </main>
  )
}

export default App
