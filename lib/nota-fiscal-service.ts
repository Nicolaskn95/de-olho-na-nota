import * as cheerio from "cheerio";
import { connectToDatabase } from "./mongodb";
import { NotaFiscal, type INotaFiscal } from "./models/nota-fiscal";
import { Produto } from "./models/produto";

interface ProdutoExtraido {
  nome: string;
  codigo: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
}

interface DadosNotaFiscal {
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: Date;
  estabelecimento: string;
  cnpj: string;
  endereco: string;
  valorTotal: number;
  descontos: number;
  valorPago: number;
  formaPagamento: string;
  produtos: ProdutoExtraido[];
}

function isUrlNotaFiscalValida(url: string): boolean {
  const dominiosValidos = [
    "nfce.fazenda.sp.gov.br",
    "sefaz.rs.gov.br",
    "sat.sef.sc.gov.br",
    "nfce.sefaz",
  ];
  return dominiosValidos.some((d) => url.includes(d));
}

async function buscarPagina(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    throw new Error(
      `Nao foi possivel acessar a pagina da nota fiscal: ${error instanceof Error ? error.message : "erro desconhecido"}`
    );
  }
}

function extrairProdutos($: cheerio.CheerioAPI): ProdutoExtraido[] {
  const produtos: ProdutoExtraido[] = [];
  const texto = $("body").text();

  const linhasProduto = texto.match(
    /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s\d/]+)\s*\(Código[:\s]*(\d+)\s*\)\s*Qtde\.?[:\s]*([\d.,]+)\s*UN[:\s]*(\w+)\s*Vl\.?\s*Unit\.?[:\s]*([\d.,]+)\s*Vl\.?\s*Total\s*([\d.,]+)/gi
  );

  if (linhasProduto) {
    for (const linha of linhasProduto) {
      const match = linha.match(
        /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s\d/]+)\s*\(Código[:\s]*(\d+)\s*\)\s*Qtde\.?[:\s]*([\d.,]+)\s*UN[:\s]*(\w+)\s*Vl\.?\s*Unit\.?[:\s]*([\d.,]+)\s*Vl\.?\s*Total\s*([\d.,]+)/i
      );

      if (match) {
        produtos.push({
          nome: match[1].trim(),
          codigo: match[2],
          quantidade: parseFloat(match[3].replace(",", ".")),
          unidade: match[4],
          valorUnitario: parseFloat(match[5].replace(",", ".")),
          valorTotal: parseFloat(match[6].replace(",", ".")),
        });
      }
    }
  }

  return produtos;
}

function extrairDados(html: string): DadosNotaFiscal {
  const $ = cheerio.load(html);

  const estabelecimento =
    $("body")
      .text()
      .match(
        /(?:CNPJ[:\s]*[\d./-]+[\s\S]*?)([\w\s]+(?:LTDA|S\/A|SA|ME|EPP|EIRELI))/i
      )?.[1]
      ?.trim() ||
    $("div")
      .first()
      .text()
      .split("\n")
      .find((l) => l.trim().length > 5)
      ?.trim() ||
    "Estabelecimento nao identificado";

  const cnpjMatch = $("body")
    .text()
    .match(/CNPJ[:\s]*([\d./-]+)/i);
  const cnpj = cnpjMatch ? cnpjMatch[1].trim() : "";

  const enderecoMatch = $("body")
    .text()
    .match(
      /(?:CNPJ[:\s]*[\d./-]+[\s\S]*?)(R\s+[\w\s,]+,\s*\d+[^]*?(?:SP|RJ|MG|RS|SC|PR|BA|PE|CE|GO|DF))/i
    );
  const endereco = enderecoMatch
    ? enderecoMatch[1].replace(/\s+/g, " ").trim()
    : "";

  const chaveMatch = $("body")
    .text()
    .match(/(?:Chave de acesso|Chave)[:\s]*([\d\s]{44,60})/i);
  const chaveAcesso = chaveMatch ? chaveMatch[1].replace(/\s/g, "") : "";

  const numeroMatch = $("body")
    .text()
    .match(/N[úu]mero[:\s]*(\d+)/i);
  const numero = numeroMatch ? numeroMatch[1] : "";

  const serieMatch = $("body")
    .text()
    .match(/S[ée]rie[:\s]*(\d+)/i);
  const serie = serieMatch ? serieMatch[1] : "";

  const dataMatch = $("body")
    .text()
    .match(/Emiss[ãa]o[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
  let dataEmissao = new Date();
  if (dataMatch) {
    const [dia, mes, ano] = dataMatch[1].split("/").map(Number);
    dataEmissao = new Date(ano, mes - 1, dia);
  }

  const valorTotalMatch = $("body")
    .text()
    .match(/Valor total R\$[:\s]*([\d.,]+)/i);
  const valorTotal = valorTotalMatch
    ? parseFloat(valorTotalMatch[1].replace(".", "").replace(",", "."))
    : 0;

  const descontosMatch = $("body")
    .text()
    .match(/Descontos R\$[:\s]*([\d.,]+)/i);
  const descontos = descontosMatch
    ? parseFloat(descontosMatch[1].replace(".", "").replace(",", "."))
    : 0;

  const valorPagoMatch = $("body")
    .text()
    .match(/Valor a pagar R\$[:\s]*([\d.,]+)/i);
  const valorPago = valorPagoMatch
    ? parseFloat(valorPagoMatch[1].replace(".", "").replace(",", "."))
    : valorTotal - descontos;

  const formaPagamentoMatch = $("body")
    .text()
    .match(/Forma de pagamento[:\s]*([\w\s]+?)(?:Valor|R\$|\d)/i);
  const formaPagamento = formaPagamentoMatch
    ? formaPagamentoMatch[1].trim()
    : "";

  const produtos = extrairProdutos($);

  return {
    chaveAcesso,
    numero,
    serie,
    dataEmissao,
    estabelecimento,
    cnpj,
    endereco,
    valorTotal,
    descontos,
    valorPago,
    formaPagamento,
    produtos,
  };
}

export async function processarUrl(url: string): Promise<INotaFiscal> {
  if (!isUrlNotaFiscalValida(url)) {
    throw new Error("URL de nota fiscal invalida");
  }

  await connectToDatabase();

  const html = await buscarPagina(url);
  const dados = extrairDados(html);

  const notaExistente = await NotaFiscal.findOne({
    chaveAcesso: dados.chaveAcesso,
  });

  if (notaExistente) {
    return notaExistente.populate("produtos");
  }

  const nota = new NotaFiscal({
    ...dados,
    urlOriginal: url,
    produtos: [],
  });
  await nota.save();

  const produtos = await Produto.insertMany(
    dados.produtos.map((p) => ({
      ...p,
      notaFiscal: nota._id,
    }))
  );

  nota.produtos = produtos.map((p) => p._id);
  await nota.save();

  return NotaFiscal.findById(nota._id).populate("produtos") as Promise<INotaFiscal>;
}

export async function listarNotas(): Promise<INotaFiscal[]> {
  await connectToDatabase();
  return NotaFiscal.find().populate("produtos").exec();
}

export async function buscarPorId(id: string): Promise<INotaFiscal | null> {
  await connectToDatabase();
  return NotaFiscal.findById(id).populate("produtos").exec();
}
