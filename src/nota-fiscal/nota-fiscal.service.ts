import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { NotaFiscal } from './schemas/nota-fiscal.schema';
import { Produto } from './schemas/produto.schema';

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

/** Remove quebras de linha e múltiplos espaços */
function normalizarTexto(val: string): string {
  if (typeof val !== 'string') return '';
  return val.replace(/\s+/g, ' ').trim();
}

/** Siglas de estado que às vezes aparecem no início (layout da página) */
const SIGLAS_ESTADO =
  /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PR|PE|PI|RJ|RN|RO|RS|SC|SP|SE|TO)\s+/i;
/** Unidades que às vezes vêm coladas no final do nome no HTML */
const UNIDADES_SUFIXO =
  /\s+(UN|CX|BJ|KG|G|PCT|PC|LT|ML|GR|PÇ|PAR|KIT|FD|SC|DG|TB|AM|FR|PT|TR|VD|EMB|LATA|BARRA)\s*$/i;

function normalizarNomeProduto(val: string): string {
  let limpo = normalizarTexto(val);
  limpo = limpo.replace(SIGLAS_ESTADO, '').trim() || limpo;
  limpo = limpo.replace(UNIDADES_SUFIXO, '').trim() || limpo;
  return limpo;
}

@Injectable()
export class NotaFiscalService {
  constructor(
    @InjectModel(NotaFiscal.name) private notaFiscalModel: Model<NotaFiscal>,
    @InjectModel(Produto.name) private produtoModel: Model<Produto>,
  ) {}

  async processarUrl(url: string): Promise<NotaFiscal> {
    if (!this.isUrlNotaFiscalValida(url)) {
      throw new BadRequestException('URL de nota fiscal inválida');
    }

    const html = await this.buscarPagina(url);
    const dados = this.extrairDados(html);

    const notaExistente = await this.notaFiscalModel.findOne({
      chaveAcesso: dados.chaveAcesso,
    });

    if (notaExistente) {
      throw new ConflictException('Esta nota fiscal já foi cadastrada anteriormente');
    }

    const nota = new this.notaFiscalModel({
      ...dados,
      urlOriginal: url,
      produtos: [],
    });
    await nota.save();

    const produtos = await this.produtoModel.insertMany(
      dados.produtos.map((p) => ({
        ...p,
        notaFiscal: nota._id,
      })),
    );

    nota.produtos = produtos.map((p) => p._id);
    await nota.save();

    return this.notaFiscalModel
      .findById(nota._id)
      .populate('produtos')
      .exec() as Promise<NotaFiscal>;
  }

  private isUrlNotaFiscalValida(url: string): boolean {
    const dominiosValidos = [
      'nfce.fazenda.sp.gov.br',
      'sefaz.rs.gov.br',
      'sat.sef.sc.gov.br',
      'nfce.sefaz',
    ];
    return dominiosValidos.some((d) => url.includes(d));
  }

  private async buscarPagina(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 15000,
      });
      console.log(response);
      return response.data;
    } catch (error) {
      throw new BadRequestException(
        `Não foi possível acessar a página da nota fiscal: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
    }
  }

  private extrairDados(html: string): DadosNotaFiscal {
    const $ = cheerio.load(html);

    const textoBody = $('body').text();

    let estabelecimento = '';

    // Tenta pegar a linha imediatamente antes do CNPJ (geralmente o nome da loja)
    const estCnpjMatch = textoBody.match(/([^\n]*?)\s*CNPJ[:\s]*[\d./-]+/i);
    if (estCnpjMatch) {
      estabelecimento = normalizarTexto(estCnpjMatch[1]);
    }

    // Fallback: primeira linha de texto "boa" que não pareça produto nem metadado
    if (!estabelecimento) {
      const linhas = textoBody
        .split('\n')
        .map((l) => normalizarTexto(l))
        .filter((l) => l.length > 3);

      const linhaCandidata = linhas.find((l) => {
        if (/^\d+\s/.test(l)) return false; // evita linhas tipo "99 CREME"
        if (l.toUpperCase().includes('CNPJ')) return false;
        if (/EMISS[ÃA]O|CHAVE|NFC-E|CONSUMIDOR|ENDEREÇO|CPF/i.test(l)) {
          return false;
        }
        return true;
      });

      if (linhaCandidata) {
        estabelecimento = linhaCandidata;
      }
    }

    const cnpjMatch = $('body').text().match(/CNPJ[:\s]*([\d./-]+)/i);
    const cnpj = cnpjMatch ? cnpjMatch[1].trim() : '';

    const enderecoMatch = $('body')
      .text()
      .match(/(?:CNPJ[:\s]*[\d./-]+[\s\S]*?)(R\s+[\w\s,]+,\s*\d+[^]*?(?:SP|RJ|MG|RS|SC|PR|BA|PE|CE|GO|DF))/i);
    const endereco = enderecoMatch ? enderecoMatch[1].replace(/\s+/g, ' ').trim() : '';

    const chaveMatch = $('body')
      .text()
      .match(/(?:Chave de acesso|Chave)[:\s]*([\d\s]{44,60})/i);
    const chaveAcesso = chaveMatch ? chaveMatch[1].replace(/\s/g, '') : '';

    const numeroMatch = $('body').text().match(/N[úu]mero[:\s]*(\d+)/i);
    const numero = numeroMatch ? numeroMatch[1] : '';

    const serieMatch = $('body').text().match(/S[ée]rie[:\s]*(\d+)/i);
    const serie = serieMatch ? serieMatch[1] : '';

    const dataMatch = $('body')
      .text()
      .match(/Emiss[ãa]o[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
    let dataEmissao = new Date();
    if (dataMatch) {
      const [dia, mes, ano] = dataMatch[1].split('/').map(Number);
      dataEmissao = new Date(ano, mes - 1, dia);
    }

    const valorTotalMatch = $('body')
      .text()
      .match(/Valor total R\$[:\s]*([\d.,]+)/i);
    const valorTotal = valorTotalMatch
      ? parseFloat(valorTotalMatch[1].replace('.', '').replace(',', '.'))
      : 0;

    const descontosMatch = $('body')
      .text()
      .match(/Descontos R\$[:\s]*([\d.,]+)/i);
    const descontos = descontosMatch
      ? parseFloat(descontosMatch[1].replace('.', '').replace(',', '.'))
      : 0;

    const valorPagoMatch = $('body')
      .text()
      .match(/Valor a pagar R\$[:\s]*([\d.,]+)/i);
    const valorPago = valorPagoMatch
      ? parseFloat(valorPagoMatch[1].replace('.', '').replace(',', '.'))
      : valorTotal - descontos;

    const formaPagamentoMatch = $('body')
      .text()
      .match(/Forma de pagamento[:\s]*([\w\s]+?)(?:Valor|R\$|\d)/i);
    const formaPagamento = formaPagamentoMatch
      ? formaPagamentoMatch[1].trim()
      : '';

    const produtos = this.extrairProdutos($);

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

  private extrairProdutos($: cheerio.Root): ProdutoExtraido[] {
    const produtos: ProdutoExtraido[] = [];
    const texto = $('body').text();

    const linhasProduto = texto.match(
      /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s\d/]+)\s*\(Código[:\s]*(\d+)\s*\)\s*Qtde\.?[:\s]*([\d.,]+)\s*UN[:\s]*(\w+)\s*Vl\.?\s*Unit\.?[:\s]*([\d.,]+)\s*Vl\.?\s*Total\s*([\d.,]+)/gi,
    );

    if (linhasProduto) {
      const codigosIncluidos = new Set<string>();
      for (const linha of linhasProduto) {
        const match = linha.match(
          /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s\d/]+)\s*\(Código[:\s]*(\d+)\s*\)\s*Qtde\.?[:\s]*([\d.,]+)\s*UN[:\s]*(\w+)\s*Vl\.?\s*Unit\.?[:\s]*([\d.,]+)\s*Vl\.?\s*Total\s*([\d.,]+)/i,
        );

        if (match) {
          const codigo = match[2];
          if (codigosIncluidos.has(codigo)) continue;
          codigosIncluidos.add(codigo);

          produtos.push({
            nome: normalizarNomeProduto(match[1]),
            codigo,
            quantidade: parseFloat(match[3].replace(',', '.')),
            unidade: match[4],
            valorUnitario: parseFloat(match[5].replace(',', '.')),
            valorTotal: parseFloat(match[6].replace(',', '.')),
          });
        }
      }
    }

    return produtos;
  }

  async listarNotas(): Promise<NotaFiscal[]> {
    return this.notaFiscalModel.find().populate('produtos').exec();
  }

  async buscarPorId(id: string): Promise<NotaFiscal | null> {
    return this.notaFiscalModel.findById(id).populate('produtos').exec();
  }
}
