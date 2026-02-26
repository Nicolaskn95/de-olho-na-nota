"use client";

import { useState, useCallback } from "react";

interface NotaFiscalResponse {
  _id: string;
  chaveAcesso: string;
  numero: string;
  estabelecimento: string;
  valorTotal: number;
  valorPago: number;
  produtos: Array<{
    nome: string;
    quantidade: number;
    unidade: string;
    valorUnitario: number;
    valorTotal: number;
  }>;
}

export function EscanearCupom() {
  const [conteudoLido, setConteudoLido] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [urlManual, setUrlManual] = useState("");
  const [modoManual, setModoManual] = useState(false);
  const [carregandoImagem, setCarregandoImagem] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [notaProcessada, setNotaProcessada] =
    useState<NotaFiscalResponse | null>(null);

  const recomecar = useCallback(() => {
    setConteudoLido(null);
    setErro(null);
    setNotaProcessada(null);
    setModoManual(false);
    setUrlManual("");
  }, []);

  const enviarParaProcessar = useCallback(async () => {
    if (!conteudoLido) return;

    setProcessando(true);
    setErro(null);

    try {
      const response = await fetch("/api/notas-fiscais/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: conteudoLido }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}`);
      }

      const nota: NotaFiscalResponse = await response.json();
      setNotaProcessada(nota);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Erro ao processar nota fiscal"
      );
    } finally {
      setProcessando(false);
    }
  }, [conteudoLido]);

  const enviarUrlManual = useCallback(() => {
    const url = urlManual.trim();
    if (url) {
      setConteudoLido(url);
      setModoManual(false);
      setErro(null);
    }
  }, [urlManual]);

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setCarregandoImagem(true);
      setErro(null);

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-reader-hidden");
        const result = await scanner.scanFileV2(file, true);
        setConteudoLido(result.decodedText);
      } catch {
        setErro(
          "Nao foi possivel ler o QR code da imagem. Tente uma foto com melhor qualidade ou use a opcao manual."
        );
      } finally {
        setCarregandoImagem(false);
        event.target.value = "";
      }
    },
    []
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div id="qr-reader-hidden" style={{ display: "none" }} />

      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-[var(--primary)]">
          De Olho na Nota
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Envie uma foto do QR code do cupom fiscal para extrair os produtos
        </p>
      </header>

      {/* Erro global */}
      {erro && !conteudoLido && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-[var(--destructive-background)] p-4 text-center text-[var(--destructive)]"
        >
          <p className="mb-3">{erro}</p>
          <button
            type="button"
            onClick={recomecar}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Upload area */}
      {!conteudoLido && !modoManual && !erro && (
        <div className="flex flex-col items-center gap-6">
          <div className="w-full">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--accent)] bg-[var(--secondary)] px-6 py-12 transition-colors hover:bg-[#dcfce7]">
              <CameraIcon />
              <span className="mt-4 text-lg font-medium text-[var(--primary)]">
                {carregandoImagem
                  ? "Processando..."
                  : "Clique para enviar foto do QR code"}
              </span>
              <span className="mt-1 text-sm text-[var(--muted-foreground)]">
                ou arraste a imagem aqui
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={carregandoImagem}
                className="sr-only"
              />
            </label>
          </div>

          <div className="flex w-full items-center gap-4 text-sm text-[var(--muted-foreground)]">
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span>ou</span>
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <button
            type="button"
            onClick={() => setModoManual(true)}
            className="rounded-lg border border-[var(--primary)] bg-transparent px-5 py-2.5 font-medium text-[var(--primary)] transition-colors hover:bg-[var(--secondary)]"
          >
            Inserir URL manualmente
          </button>
        </div>
      )}

      {/* Modo manual */}
      {modoManual && !conteudoLido && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-6">
          <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">
            Inserir URL do cupom
          </h3>
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            Cole a URL que esta no QR code do cupom fiscal:
          </p>
          <input
            type="url"
            placeholder="https://www.nfce.fazenda.sp.gov.br/..."
            value={urlManual}
            onChange={(e) => setUrlManual(e.target.value)}
            className="mb-4 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
          />
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={recomecar}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={enviarUrlManual}
              disabled={!urlManual.trim()}
              className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Usar esta URL
            </button>
          </div>
        </div>
      )}

      {/* Resultado da leitura */}
      {conteudoLido && !notaProcessada && (
        <section className="rounded-xl border border-[#bbf7d0] bg-[var(--secondary)] p-6">
          <h2 className="mb-3 text-xl font-semibold text-[var(--primary)]">
            QR code lido com sucesso!
          </h2>
          <p
            className="mb-4 break-all rounded-md bg-[#dcfce7] p-3 font-mono text-xs text-[var(--primary)]"
            title={conteudoLido}
          >
            {conteudoLido}
          </p>
          {erro && (
            <div
              role="alert"
              className="mt-4 rounded-lg bg-[var(--destructive-background)] p-4 text-center text-[var(--destructive)]"
            >
              <p>{erro}</p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={recomecar}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={enviarParaProcessar}
              disabled={processando}
              className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processando ? "Processando..." : "Processar nota"}
            </button>
          </div>
        </section>
      )}

      {/* Nota processada */}
      {notaProcessada && (
        <section className="rounded-xl bg-[var(--card)] p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-[var(--accent)]">
            Nota Fiscal Processada
          </h2>
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <strong className="text-[var(--foreground)]">
                Estabelecimento:
              </strong>{" "}
              {notaProcessada.estabelecimento}
            </p>
            <p className="text-sm">
              <strong className="text-[var(--foreground)]">Numero:</strong>{" "}
              {notaProcessada.numero}
            </p>
            <p className="text-sm">
              <strong className="text-[var(--foreground)]">Valor Total:</strong>{" "}
              R$ {notaProcessada.valorTotal.toFixed(2)}
            </p>
            <p className="text-sm">
              <strong className="text-[var(--foreground)]">Valor Pago:</strong>{" "}
              R$ {notaProcessada.valorPago.toFixed(2)}
            </p>
          </div>

          <h3 className="mt-6 mb-3 border-b border-[var(--border)] pb-2 text-sm font-semibold text-[var(--foreground)]">
            Produtos ({notaProcessada.produtos.length})
          </h3>
          <ul className="max-h-72 overflow-y-auto">
            {notaProcessada.produtos.map((produto, index) => (
              <li
                key={index}
                className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-[var(--muted)] py-3 text-sm last:border-b-0"
              >
                <span className="font-medium text-[var(--foreground)]">
                  {produto.nome}
                </span>
                <span className="text-right text-[var(--muted-foreground)]">
                  {produto.quantidade} {produto.unidade}
                </span>
                <span className="min-w-20 text-right font-semibold text-[var(--accent)]">
                  R$ {produto.valorTotal.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={recomecar}
              className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
            >
              Processar outro cupom
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--accent)]"
      aria-hidden="true"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
