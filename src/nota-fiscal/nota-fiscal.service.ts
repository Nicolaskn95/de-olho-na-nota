import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

@Injectable()
export class NotaFiscalService {
  constructor(
    @InjectModel(NotaFiscal.name) private notaFiscalModel: Model<NotaFiscal>,
    @InjectModel(Produto.name) private produtoModel: Model<Produto>,
  ) {}

  async processarUrl(url: string, userId: string): Promise<NotaFiscal> {
    if (!this.isUrlNotaFiscalValida(url)) {
      throw new BadRequestException('URL de nota fiscal inválida');
    }

    const html = await this.buscarPagina(url);
    const dados = this.extrairDados(html);

    const userObjectId = new Types.ObjectId(userId);
    const notaExistente = await this.notaFiscalModel.findOne({
      chaveAcesso: dados.chaveAcesso,
      // Compat: notas antigas podem ter userId como string.
      $or: [{ userId: userObjectId }, { userId }],
    });

    if (notaExistente) {
      throw new ConflictException('Esta nota fiscal já foi cadastrada anteriormente');
    }

    const nota = new this.notaFiscalModel({
      ...dados,
      urlOriginal: url,
      produtos: [],
      userId: userObjectId,
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

    const estabelecimento = $('body')
      .text()
      .match(/(?:CNPJ[:\s]*[\d./-]+[\s\S]*?)([\w\s]+(?:LTDA|S\/A|SA|ME|EPP|EIRELI))/i)?.[1]?.trim() ||
      $('div').first().text().split('\n').find((l) => l.trim().length > 5)?.trim() ||
      'Estabelecimento não identificado';

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
      for (const linha of linhasProduto) {
        const match = linha.match(
          /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s\d/]+)\s*\(Código[:\s]*(\d+)\s*\)\s*Qtde\.?[:\s]*([\d.,]+)\s*UN[:\s]*(\w+)\s*Vl\.?\s*Unit\.?[:\s]*([\d.,]+)\s*Vl\.?\s*Total\s*([\d.,]+)/i,
        );

        if (match) {
          produtos.push({
            nome: match[1].trim(),
            codigo: match[2],
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
    // Deprecated - mantém compatibilidade interna caso exista algum chamador antigo.
    // O fluxo correto deve ser listarNotas(userId).
    return this.notaFiscalModel.find().populate('produtos').exec();
  }

  async listarNotasPorUsuario(userId: string): Promise<NotaFiscal[]> {
    const userObjectId = new Types.ObjectId(userId);
    // #region agent log
    fetch('http://127.0.0.1:7461/ingest/67ad9434-be4c-4cd5-8952-2c823b0fe782',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f2e24'},body:JSON.stringify({sessionId:'7f2e24',runId:'pre',hypothesisId:'H3',location:'nota-fiscal.service.ts:listarNotasPorUsuario',message:'Query notas by user',data:{userIdStrLen:userId?.length||0,userObjectIdHex:userObjectId.toHexString()},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const [
      totalCount,
      withUserIdCount,
      withoutUserIdCount,
      matchObjectIdCount,
      matchStringCount,
    ] = await Promise.all([
      this.notaFiscalModel.countDocuments({}).catch(() => -1),
      this.notaFiscalModel
        .countDocuments({ userId: { $exists: true } })
        .catch(() => -1),
      this.notaFiscalModel
        .countDocuments({ userId: { $exists: false } })
        .catch(() => -1),
      this.notaFiscalModel
        .countDocuments({ userId: userObjectId })
        .catch(() => -1),
      this.notaFiscalModel
        .countDocuments({ userId })
        .catch(() => -1),
    ]);

    // #region agent log
    fetch('http://127.0.0.1:7461/ingest/67ad9434-be4c-4cd5-8952-2c823b0fe782',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f2e24'},body:JSON.stringify({sessionId:'7f2e24',runId:'pre',hypothesisId:'H3',location:'nota-fiscal.service.ts:listarNotasPorUsuario:counts',message:'DB counts for user matching',data:{totalCount,withUserIdCount,withoutUserIdCount,matchObjectIdCount,matchStringCount,userIdEnds:userId?.slice(-6)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const notas = await this.notaFiscalModel
      // Compat: notas antigas podem ter userId como string.
      .find({ $or: [{ userId: userObjectId }, { userId }] })
      .populate('produtos')
      .exec();
    // #region agent log
    fetch('http://127.0.0.1:7461/ingest/67ad9434-be4c-4cd5-8952-2c823b0fe782',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f2e24'},body:JSON.stringify({sessionId:'7f2e24',runId:'pre',hypothesisId:'H3',location:'nota-fiscal.service.ts:listarNotasPorUsuario:result',message:'Notas query result',data:{count:Array.isArray(notas)?notas.length:-1},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return notas;
  }

  async buscarPorId(id: string, userId: string): Promise<NotaFiscal | null> {
    return this.notaFiscalModel
      .findOne({
        _id: id,
        $or: [{ userId: new Types.ObjectId(userId) }, { userId }],
      })
      .populate('produtos')
      .exec();
  }
}
