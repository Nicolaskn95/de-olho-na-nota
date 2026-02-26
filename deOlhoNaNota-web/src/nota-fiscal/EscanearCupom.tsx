import { useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import './EscanearCupom.css'

console.log('[EscanearCupom.tsx] Módulo carregado')

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
console.log('[EscanearCupom.tsx] API_URL:', API_URL)

interface NotaFiscalResponse {
  _id: string
  chaveAcesso: string
  numero: string
  estabelecimento: string
  valorTotal: number
  valorPago: number
  produtos: Array<{
    nome: string
    quantidade: number
    unidade: string
    valorUnitario: number
    valorTotal: number
  }>
}

export function EscanearCupom() {
  console.log('[EscanearCupom] Componente renderizando...')
  const [conteudoLido, setConteudoLido] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [urlManual, setUrlManual] = useState('')
  const [modoManual, setModoManual] = useState(false)
  const [carregandoImagem, setCarregandoImagem] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [notaProcessada, setNotaProcessada] = useState<NotaFiscalResponse | null>(null)

  const recomecar = () => {
    setConteudoLido(null)
    setErro(null)
    setNotaProcessada(null)
    setModoManual(false)
    setUrlManual('')
  }

  const enviarParaProcessar = async () => {
    if (!conteudoLido) return

    setProcessando(true)
    setErro(null)

    try {
      const response = await fetch(`${API_URL}/notas-fiscais/processar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: conteudoLido }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Erro ${response.status}`)
      }

      const nota: NotaFiscalResponse = await response.json()
      setNotaProcessada(nota)
    } catch (e) {
      console.error('Erro ao processar nota:', e)
      setErro(e instanceof Error ? e.message : 'Erro ao processar nota fiscal')
    } finally {
      setProcessando(false)
    }
  }

  const enviarUrlManual = () => {
    const url = urlManual.trim()
    if (url) {
      setConteudoLido(url)
      setModoManual(false)
      setErro(null)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCarregandoImagem(true)
    setErro(null)

    try {
      const scanner = new Html5Qrcode('qr-reader-hidden')
      const result = await scanner.scanFileV2(file, true)
      console.log('QR Code lido da imagem:', result.decodedText)
      setConteudoLido(result.decodedText)
    } catch (e) {
      console.error('Erro ao ler imagem:', e)
      setErro('Não foi possível ler o QR code da imagem. Tente uma foto com melhor qualidade ou use a opção manual.')
    } finally {
      setCarregandoImagem(false)
      event.target.value = ''
    }
  }

  return (
    <div className="escanear-cupom">
      <div id="qr-reader-hidden" style={{ display: 'none' }} />
      
      <header className="escanear-cupom__header">
        <h1>De Olho na Nota</h1>
        <p>Envie uma foto do QR code do cupom fiscal para extrair os produtos</p>
      </header>

      {erro && !conteudoLido && (
        <div className="escanear-cupom__erro" role="alert">
          <p>{erro}</p>
          <button
            type="button"
            className="escanear-cupom__btn"
            onClick={recomecar}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!conteudoLido && !modoManual && !erro && (
        <div className="escanear-cupom__upload-area">
          <div className="escanear-cupom__upload-box">
            <label className="escanear-cupom__upload-label">
              <div className="escanear-cupom__upload-icon">📷</div>
              <span className="escanear-cupom__upload-text">
                {carregandoImagem ? 'Processando...' : 'Clique para enviar foto do QR code'}
              </span>
              <span className="escanear-cupom__upload-hint">ou arraste a imagem aqui</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={carregandoImagem}
                className="escanear-cupom__upload-input"
              />
            </label>
          </div>

          <div className="escanear-cupom__divider">
            <span>ou</span>
          </div>

          <button 
            type="button" 
            className="escanear-cupom__btn escanear-cupom__btn--secundario"
            onClick={() => setModoManual(true)}
          >
            Inserir URL manualmente
          </button>
        </div>
      )}

      {modoManual && !conteudoLido && (
        <div className="escanear-cupom__manual">
          <h3>Inserir URL do cupom</h3>
          <p>Cole a URL que está no QR code do cupom fiscal:</p>
          <input
            type="url"
            className="escanear-cupom__input"
            placeholder="https://www.nfce.fazenda.sp.gov.br/..."
            value={urlManual}
            onChange={(e) => setUrlManual(e.target.value)}
          />
          <div className="escanear-cupom__acoes">
            <button 
              type="button" 
              className="escanear-cupom__btn"
              onClick={recomecar}
            >
              Voltar
            </button>
            <button 
              type="button" 
              className="escanear-cupom__btn escanear-cupom__btn--primario"
              onClick={enviarUrlManual}
              disabled={!urlManual.trim()}
            >
              Usar esta URL
            </button>
          </div>
        </div>
      )}

      {conteudoLido && !notaProcessada && (
        <section className="escanear-cupom__resultado">
          <h2>QR code lido com sucesso!</h2>
          <p className="escanear-cupom__url" title={conteudoLido}>
            {conteudoLido}
          </p>
          {erro && (
            <div className="escanear-cupom__erro escanear-cupom__erro--inline" role="alert">
              <p>{erro}</p>
            </div>
          )}
          <div className="escanear-cupom__acoes">
            <button type="button" onClick={recomecar} className="escanear-cupom__btn">
              Voltar
            </button>
            <button
              type="button"
              className="escanear-cupom__btn escanear-cupom__btn--primario"
              onClick={enviarParaProcessar}
              disabled={processando}
            >
              {processando ? 'Processando...' : 'Processar nota'}
            </button>
          </div>
        </section>
      )}

      {notaProcessada && (
        <section className="escanear-cupom__nota">
          <h2>Nota Fiscal Processada</h2>
          <div className="escanear-cupom__nota-info">
            <p><strong>Estabelecimento:</strong> {notaProcessada.estabelecimento}</p>
            <p><strong>Número:</strong> {notaProcessada.numero}</p>
            <p><strong>Valor Total:</strong> R$ {notaProcessada.valorTotal.toFixed(2)}</p>
            <p><strong>Valor Pago:</strong> R$ {notaProcessada.valorPago.toFixed(2)}</p>
          </div>
          
          <h3>Produtos ({notaProcessada.produtos.length})</h3>
          <ul className="escanear-cupom__produtos">
            {notaProcessada.produtos.map((produto, index) => (
              <li key={index} className="escanear-cupom__produto">
                <span className="escanear-cupom__produto-nome">{produto.nome}</span>
                <span className="escanear-cupom__produto-qtd">
                  {produto.quantidade} {produto.unidade}
                </span>
                <span className="escanear-cupom__produto-valor">
                  R$ {produto.valorTotal.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <div className="escanear-cupom__acoes">
            <button type="button" onClick={recomecar} className="escanear-cupom__btn escanear-cupom__btn--primario">
              Processar outro cupom
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
