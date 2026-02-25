import { useState } from 'react'
import { Scanner, useDevices, type IDetectedBarcode } from '@yudiel/react-qr-scanner'
import { Html5Qrcode } from 'html5-qrcode'
import './EscanearCupom.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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
  const [isPaused, setIsPaused] = useState(false)
  const [urlManual, setUrlManual] = useState('')
  const [modoManual, setModoManual] = useState(false)
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined)
  const [carregandoImagem, setCarregandoImagem] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [notaProcessada, setNotaProcessada] = useState<NotaFiscalResponse | null>(null)
  
  const devices = useDevices()

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length > 0) {
      const code = detectedCodes[0]
      console.log('QR Code detectado:', code.rawValue)
      setConteudoLido(code.rawValue)
      setIsPaused(true)
      setErro(null)
    }
  }

  const handleError = (error: unknown) => {
    console.error('Erro no scanner:', error)
    if (error instanceof Error) {
      if (error.message.includes('Permission') || error.message.includes('NotAllowed')) {
        setErro('Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.')
      } else if (error.message.includes('NotFound')) {
        setErro('Câmera não encontrada. Verifique se o dispositivo possui câmera.')
      } else if (error.message.includes('NotReadable')) {
        setErro('Câmera em uso por outra aplicação. Feche outras abas ou apps.')
      } else {
        setErro(`Erro: ${error.message}`)
      }
    }
  }

  const escanearNovamente = () => {
    setConteudoLido(null)
    setIsPaused(false)
    setErro(null)
    setNotaProcessada(null)
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
      const result = await lerQRCodeDeImagem(file)
      if (result) {
        console.log('QR Code lido da imagem:', result)
        setConteudoLido(result)
        setIsPaused(true)
      } else {
        setErro('Não foi possível ler o QR code da imagem. Tente uma foto com melhor qualidade ou use a opção manual.')
      }
    } catch (e) {
      console.error('Erro ao processar imagem:', e)
      setErro('Erro ao processar a imagem. Tente novamente.')
    } finally {
      setCarregandoImagem(false)
      event.target.value = ''
    }
  }

  const lerQRCodeDeImagem = async (file: File): Promise<string | null> => {
    const html5QrCode = new Html5Qrcode('qr-reader-hidden')
    try {
      const result = await html5QrCode.scanFileV2(file, true)
      return result.decodedText
    } catch {
      return null
    }
  }

  return (
    <div className="escanear-cupom">
      <div id="qr-reader-hidden" style={{ display: 'none' }} />
      <header className="escanear-cupom__header">
        <h1>Escanear cupom fiscal</h1>
        <p>Posicione o QR code do cupom dentro da área de leitura</p>
      </header>

      {devices.length > 1 && !conteudoLido && (
        <div className="escanear-cupom__devices">
          <label htmlFor="camera-select">Câmera:</label>
          <select
            id="camera-select"
            value={deviceId || ''}
            onChange={(e) => setDeviceId(e.target.value || undefined)}
            className="escanear-cupom__select"
          >
            <option value="">Automático (traseira)</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Câmera ${device.deviceId.slice(0, 8)}...`}
              </option>
            ))}
          </select>
        </div>
      )}

      {erro && (
        <div className="escanear-cupom__erro" role="alert">
          <p>{erro}</p>
          <button
            type="button"
            className="escanear-cupom__btn"
            onClick={() => {
              setErro(null)
              setIsPaused(false)
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!conteudoLido && !erro && !modoManual && (
        <div className="escanear-cupom__scanner-container">
          <Scanner
            onScan={handleScan}
            onError={handleError}
            paused={isPaused}
            constraints={{
              deviceId: deviceId,
              facingMode: deviceId ? undefined : 'environment',
            }}
            formats={['qr_code', 'data_matrix', 'aztec']}
            components={{
              torch: true,
              finder: true,
            }}
            sound={true}
            styles={{
              container: {
                width: '100%',
                maxWidth: '400px',
                borderRadius: '12px',
                overflow: 'hidden',
              },
            }}
          />
        </div>
      )}

      {!conteudoLido && !modoManual && (
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
              onClick={() => setModoManual(true)}
            >
              Inserir URL manualmente
            </button>
          </div>
        </div>
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
              onClick={() => {
                setModoManual(false)
                setUrlManual('')
              }}
            >
              Cancelar
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
