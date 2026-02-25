import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import './EscanearCupom.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const SCANNER_ID = 'qr-reader'

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
  const [conteudoLido, setConteudoLido] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [urlManual, setUrlManual] = useState('')
  const [modoManual, setModoManual] = useState(false)
  const [carregandoImagem, setCarregandoImagem] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [notaProcessada, setNotaProcessada] = useState<NotaFiscalResponse | null>(null)
  
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const inicializandoRef = useRef(false)

  useEffect(() => {
    if (conteudoLido || modoManual || erro) return
    if (inicializandoRef.current || scannerRef.current) return

    const iniciarScanner = async () => {
      inicializandoRef.current = true
      setCarregando(true)

      try {
        const scanner = new Html5Qrcode(SCANNER_ID)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            console.log('QR Code detectado:', decodedText)
            setConteudoLido(decodedText)
            pararScanner()
          },
          () => {}
        )
        setCarregando(false)
      } catch (err) {
        console.error('Erro ao iniciar scanner:', err)
        if (err instanceof Error) {
          if (err.message.includes('Permission') || err.message.includes('NotAllowed')) {
            setErro('Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.')
          } else if (err.message.includes('NotFound')) {
            setErro('Câmera não encontrada. Verifique se o dispositivo possui câmera.')
          } else if (err.message.includes('NotReadable')) {
            setErro('Câmera em uso por outra aplicação. Feche outras abas ou apps.')
          } else {
            setErro(`Erro ao acessar câmera: ${err.message}`)
          }
        } else {
          setErro('Erro desconhecido ao acessar câmera')
        }
        setCarregando(false)
      } finally {
        inicializandoRef.current = false
      }
    }

    iniciarScanner()

    return () => {
      pararScanner()
    }
  }, [conteudoLido, modoManual, erro])

  const pararScanner = async () => {
    const scanner = scannerRef.current
    if (scanner) {
      try {
        const state = scanner.getState()
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scanner.stop()
        }
      } catch (e) {
        console.warn('Erro ao parar scanner:', e)
      }
      scannerRef.current = null
    }
  }

  const escanearNovamente = async () => {
    await pararScanner()
    inicializandoRef.current = false
    setConteudoLido(null)
    setErro(null)
    setNotaProcessada(null)
    setModoManual(false)
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
      await pararScanner()
    } catch (e) {
      console.error('Erro ao ler imagem:', e)
      setErro('Não foi possível ler o QR code da imagem. Tente uma foto com melhor qualidade ou use a opção manual.')
    } finally {
      setCarregandoImagem(false)
      event.target.value = ''
    }
  }

  const entrarModoManual = async () => {
    await pararScanner()
    setModoManual(true)
  }

  return (
    <div className="escanear-cupom">
      <div id="qr-reader-hidden" style={{ display: 'none' }} />
      
      <header className="escanear-cupom__header">
        <h1>Escanear cupom fiscal</h1>
        <p>Posicione o QR code do cupom dentro da área de leitura</p>
      </header>

      {erro && !conteudoLido && (
        <div className="escanear-cupom__erro" role="alert">
          <p>{erro}</p>
          <button
            type="button"
            className="escanear-cupom__btn"
            onClick={escanearNovamente}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!conteudoLido && !modoManual && (
        <>
          <div className="escanear-cupom__scanner-container">
            {carregando && (
              <div className="escanear-cupom__loading">
                <p>Iniciando câmera...</p>
              </div>
            )}
            <div id={SCANNER_ID} className="escanear-cupom__reader" />
          </div>

          <div className="escanear-cupom__alternativa">
            <p className="escanear-cupom__alternativa-titulo">Não está funcionando?</p>
            <div className="escanear-cupom__alternativa-botoes">
              <label className="escanear-cupom__btn escanear-cupom__btn--upload">
                {carregandoImagem ? 'Processando...' : 'Enviar foto do QR code'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={carregandoImagem}
                  style={{ display: 'none' }}
                />
              </label>
              <button 
                type="button" 
                className="escanear-cupom__btn escanear-cupom__btn--link"
                onClick={entrarModoManual}
              >
                Inserir URL manualmente
              </button>
            </div>
          </div>
        </>
      )}

      {modoManual && !conteudoLido && (
        <div className="escanear-cupom__manual">
          <h3>Inserir URL do cupom manualmente</h3>
          <p>Cole a URL que está no QR code do cupom fiscal:</p>
          <input
            type="url"
            className="escanear-cupom__input"
            placeholder="https://www.sefaz.rs.gov.br/..."
            value={urlManual}
            onChange={(e) => setUrlManual(e.target.value)}
          />
          <div className="escanear-cupom__acoes">
            <button 
              type="button" 
              className="escanear-cupom__btn"
              onClick={escanearNovamente}
            >
              Voltar ao scanner
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
            <button type="button" onClick={escanearNovamente} className="escanear-cupom__btn">
              Escanear novamente
            </button>
            <button
              type="button"
              className="escanear-cupom__btn escanear-cupom__btn--primario"
              onClick={enviarParaProcessar}
              disabled={processando}
            >
              {processando ? 'Processando...' : 'Enviar para processar'}
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
            <button type="button" onClick={escanearNovamente} className="escanear-cupom__btn escanear-cupom__btn--primario">
              Escanear outro cupom
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
