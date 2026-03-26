import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { NotaFiscal } from './schemas/nota-fiscal.schema'
import { Produto } from './schemas/produto.schema'
import { DadosNotaFiscal, ProdutoExtraido } from './interface/INotaFiscal'

/** Remove quebras de linha e múltiplos espaços */
function normalizarTexto(val: string): string {
  if (typeof val !== 'string') return ''
  return val.replace(/\s+/g, ' ').trim()
}

/** Siglas de estado que às vezes aparecem no início (layout da página) */
const SIGLAS_ESTADO =
  /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PR|PE|PI|RJ|RN|RO|RS|SC|SP|SE|TO)\s+/i
/** Unidades que às vezes vêm coladas no final do nome no HTML */
const UNIDADES_SUFIXO =
  /\s+(UN|CX|BJ|KG|G|PCT|PC|LT|ML|GR|PÇ|PAR|KIT|FD|SC|DG|TB|AM|FR|PT|TR|VD|EMB|LATA|BARRA)\s*$/i

function normalizarNomeProduto(val: string): string {
  let limpo = normalizarTexto(val)
  limpo = limpo.replace(SIGLAS_ESTADO, '').trim() || limpo
  limpo = limpo.replace(UNIDADES_SUFIXO, '').trim() || limpo
  return limpo
}

@Injectable()
export class NotaFiscalService {
  constructor(
    @InjectModel(NotaFiscal.name) private notaFiscalModel: Model<NotaFiscal>,
    @InjectModel(Produto.name) private produtoModel: Model<Produto>,
  ) {}

  async processarUrl(url: string, userId: string): Promise<NotaFiscal> {
    if (!this.isUrlNotaFiscalValida(url)) {
      throw new BadRequestException('URL de nota fiscal inválida')
    }

    const html = await this.buscarPagina(url)
    const dados = this.extrairDados(html)

    const userObjectId = new Types.ObjectId(userId)
    const notaExistente = await this.notaFiscalModel.findOne({
      chaveAcesso: dados.chaveAcesso,
      // Compat: notas antigas podem ter userId como string.
      $or: [{ userId: userObjectId }, { userId }],
    })

    if (notaExistente) {
      throw new ConflictException(
        'Esta nota fiscal já foi cadastrada anteriormente',
      )
    }

    const nota = new this.notaFiscalModel({
      ...dados,
      urlOriginal: url,
      produtos: [],
      userId: userObjectId,
    })
    await nota.save()

    const produtos = await this.produtoModel.insertMany(
      dados.produtos.map((p) => ({
        ...p,
        notaFiscal: nota._id,
      })),
    )

    nota.produtos = produtos.map((p) => p._id)
    await nota.save()

    return this.notaFiscalModel
      .findById(nota._id)
      .populate('produtos')
      .exec() as Promise<NotaFiscal>
  }

  private isUrlNotaFiscalValida(url: string): boolean {
    const dominiosValidos = [
      'nfce.fazenda.sp.gov.br',
      'sefaz.rs.gov.br',
      'sat.sef.sc.gov.br',
      'nfce.sefaz',
    ]
    return dominiosValidos.some((d) => url.includes(d))
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
      })

      return response.data as string
    } catch (error) {
      throw new BadRequestException(
        `Não foi possível acessar a página da nota fiscal: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      )
    }
  }

  private extrairDados(html: string): DadosNotaFiscal {
    const $ = cheerio.load(html)

    const textoBody = $('body').text()

    let estabelecimento = ''

    // Tenta pegar a linha imediatamente antes do CNPJ (geralmente o nome da loja)
    const estCnpjMatch = textoBody.match(/([^\n]*?)\s*CNPJ[:\s]*[\d./-]+/i)
    if (estCnpjMatch) {
      estabelecimento = normalizarTexto(estCnpjMatch[1])
    }

    // Fallback: primeira linha de texto "boa" que não pareça produto nem metadado
    if (!estabelecimento) {
      const linhas = textoBody
        .split('\n')
        .map((l) => normalizarTexto(l))
        .filter((l) => l.length > 3)

      const linhaCandidata = linhas.find((l) => {
        if (/^\d+\s/.test(l)) return false // evita linhas tipo "99 CREME"
        if (l.toUpperCase().includes('CNPJ')) return false
        if (/EMISS[ÃA]O|CHAVE|NFC-E|CONSUMIDOR|ENDEREÇO|CPF/i.test(l)) {
          return false
        }
        return true
      })

      if (linhaCandidata) {
        estabelecimento = linhaCandidata
      }
    }

    const cnpjMatch = $('body')
      .text()
      .match(/CNPJ[:\s]*([\d./-]+)/i)
    const cnpj = cnpjMatch ? cnpjMatch[1].trim() : ''

    const enderecoMatch = $('body')
      .text()
      .match(
        /(?:CNPJ[:\s]*[\d./-]+[\s\S]*?)(R\s+[\w\s,]+,\s*\d+[^]*?(?:SP|RJ|MG|RS|SC|PR|BA|PE|CE|GO|DF))/i,
      )
    const endereco = enderecoMatch
      ? enderecoMatch[1].replace(/\s+/g, ' ').trim()
      : ''

    const chaveMatch = $('body')
      .text()
      .match(/(?:Chave de acesso|Chave)[:\s]*([\d\s]{44,60})/i)
    const chaveAcesso = chaveMatch ? chaveMatch[1].replace(/\s/g, '') : ''

    const numeroMatch = $('body')
      .text()
      .match(/N[úu]mero[:\s]*(\d+)/i)
    const numero = numeroMatch ? numeroMatch[1] : ''

    const serieMatch = $('body')
      .text()
      .match(/S[ée]rie[:\s]*(\d+)/i)
    const serie = serieMatch ? serieMatch[1] : ''

    const dataMatch = $('body')
      .text()
      .match(/Emiss[ãa]o[:\s]*(\d{2}\/\d{2}\/\d{4})/i)
    let dataEmissao = new Date()
    if (dataMatch) {
      const [dia, mes, ano] = dataMatch[1].split('/').map(Number)
      dataEmissao = new Date(ano, mes - 1, dia)
    }

    const valorTotalMatch = $('body')
      .text()
      .match(/Valor total R\$[:\s]*([\d.,]+)/i)
    const valorTotal = valorTotalMatch
      ? parseFloat(valorTotalMatch[1].replace('.', '').replace(',', '.'))
      : 0

    const descontosMatch = $('body')
      .text()
      .match(/Descontos R\$[:\s]*([\d.,]+)/i)
    const descontos = descontosMatch
      ? parseFloat(descontosMatch[1].replace('.', '').replace(',', '.'))
      : 0

    const valorPagoMatch = $('body')
      .text()
      .match(/Valor a pagar R\$[:\s]*([\d.,]+)/i)
    const valorPago = valorPagoMatch
      ? parseFloat(valorPagoMatch[1].replace('.', '').replace(',', '.'))
      : valorTotal - descontos

    const formaPagamentoMatch = $('body')
      .text()
      .match(/Forma de pagamento[:\s]*([\w\s]+?)(?:Valor|R\$|\d)/i)
    const formaPagamento = formaPagamentoMatch
      ? formaPagamentoMatch[1].trim()
      : ''

    const produtos = this.extrairProdutos($)

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
    }
  }

  private extrairProdutos($: cheerio.Root): ProdutoExtraido[] {
    const produtos: ProdutoExtraido[] = []
    const texto = $('body').text()

    const linhasProduto = texto.match(
      /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s\d/]+)\s*\(Código[:\s]*(\d+)\s*\)\s*Qtde\.?[:\s]*([\d.,]+)\s*UN[:\s]*(\w+)\s*Vl\.?\s*Unit\.?[:\s]*([\d.,]+)\s*Vl\.?\s*Total\s*([\d.,]+)/gi,
    )

    if (linhasProduto) {
      const codigosIncluidos = new Set<string>()
      for (const linha of linhasProduto) {
        const match = linha.match(
          /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s\d/]+)\s*\(Código[:\s]*(\d+)\s*\)\s*Qtde\.?[:\s]*([\d.,]+)\s*UN[:\s]*(\w+)\s*Vl\.?\s*Unit\.?[:\s]*([\d.,]+)\s*Vl\.?\s*Total\s*([\d.,]+)/i,
        )

        if (match) {
          const codigo = match[2]
          if (codigosIncluidos.has(codigo)) continue
          codigosIncluidos.add(codigo)

          produtos.push({
            nome: normalizarNomeProduto(match[1]),
            codigo,
            quantidade: parseFloat(match[3].replace(',', '.')),
            unidade: match[4],
            valorUnitario: parseFloat(match[5].replace(',', '.')),
            valorTotal: parseFloat(match[6].replace(',', '.')),
          })
        }
      }
    }

    return produtos
  }

  async listarNotas(): Promise<NotaFiscal[]> {
    return this.notaFiscalModel.find().populate('produtos').exec()
  }

  private userFilter(userId: string) {
    return { $or: [{ userId: new Types.ObjectId(userId) }, { userId }] }
  }

  async listarNotasPorUsuario(userId: string): Promise<NotaFiscal[]> {
    return this.notaFiscalModel
      .find(this.userFilter(userId))
      .populate('produtos')
      .exec()
  }

  async buscarPorId(id: string, userId: string): Promise<NotaFiscal | null> {
    return this.notaFiscalModel
      .findOne({ _id: id, ...this.userFilter(userId) })
      .populate('produtos')
      .exec()
  }

  async listarEstabelecimentos(userId: string): Promise<
    { cnpj: string; estabelecimento: string; totalNotas: number }[]
  > {
    const resultado = await this.notaFiscalModel
      .aggregate([
        { $match: this.userFilter(userId) },
        {
          $group: {
            _id: '$cnpj',
            cnpj: { $first: '$cnpj' },
            estabelecimento: { $first: '$estabelecimento' },
            totalNotas: { $sum: 1 },
          },
        },
        { $sort: { cnpj: 1 } },
      ])
      .exec()

    return resultado as {
      cnpj: string
      estabelecimento: string
      totalNotas: number
    }[]
  }

  async atualizarNomeEstabelecimento(
    cnpj: string,
    novoNome: string,
    userId: string,
  ) {
    const estabelecimentoNormalizado = normalizarTexto(novoNome)

    const resultado = await this.notaFiscalModel.updateMany(
      { cnpj, ...this.userFilter(userId) },
      { $set: { estabelecimento: estabelecimentoNormalizado } },
    )

    const modificados =
      (resultado as { modifiedCount?: number; nModified?: number })
        .modifiedCount ?? 0

    return {
      cnpj,
      estabelecimento: estabelecimentoNormalizado,
      notasAtualizadas: modificados,
    }
  }

  async listarNomesProdutos(busca?: string, userId?: string): Promise<string[]> {
    let notaIds: Types.ObjectId[] | undefined
    if (userId) {
      notaIds = await this.notaFiscalModel
        .find(this.userFilter(userId))
        .distinct('_id')
        .exec()
    }

    const query = busca?.trim()
      ? { nome: { $regex: busca.trim(), $options: 'i' } }
      : {}
    const finalQuery = {
      ...query,
      ...(notaIds ? { notaFiscal: { $in: notaIds } } : {}),
    }
    const nomes = await this.produtoModel.distinct('nome', finalQuery).exec()
    return (nomes as string[]).filter((n) => n?.trim()).sort((a, b) => a.localeCompare(b))
  }

  async sugerirProdutosParecidos(
    nomeProduto: string,
    userId?: string,
  ): Promise<string[]> {
    const nome = nomeProduto?.trim()
    if (!nome) return []

    const primeiraPalavra = nome.split(/\s+/)[0]
    if (!primeiraPalavra || primeiraPalavra.length < 2) return []

    const regex = new RegExp(
      primeiraPalavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    )
    let notaIds: Types.ObjectId[] | undefined
    if (userId) {
      notaIds = await this.notaFiscalModel
        .find(this.userFilter(userId))
        .distinct('_id')
        .exec()
    }
    const todos = await this.produtoModel
      .distinct('nome', {
        nome: regex,
        ...(notaIds ? { notaFiscal: { $in: notaIds } } : {}),
      })
      .exec()
    const lista = (todos as string[])
      .filter((n) => n?.trim() && n.trim() !== nome)
      .sort((a, b) => a.localeCompare(b))
    return lista.slice(0, 20)
  }

  async compararDuracaoProdutos(
    nome1: string,
    nome2: string,
    userId?: string,
  ): Promise<{
    produto1: { nome: string; totalCompras: number; duracaoMediaDias: number | null; duracaoEntreComprasDias: number[] }
    produto2: { nome: string; totalCompras: number; duracaoMediaDias: number | null; duracaoEntreComprasDias: number[] }
  }> {
    const notas = await this.notaFiscalModel
      .find(userId ? this.userFilter(userId) : {})
      .populate('produtos')
      .exec()

    type Duracao = {
      datasOrdenadas: Date[]
      duracaoEntreComprasDias: number[]
      duracaoMediaDias: number | null
      totalCompras: number
    }

    const mapa = new Map<string, Duracao>()

    const addData = (nome: string, data: Date) => {
      const n = nome?.trim()
      if (!n || (n !== nome1.trim() && n !== nome2.trim())) return
      const existente = mapa.get(n)
      if (existente) {
        existente.datasOrdenadas.push(data)
      } else {
        mapa.set(n, {
          datasOrdenadas: [data],
          duracaoEntreComprasDias: [],
          duracaoMediaDias: null,
          totalCompras: 0,
        })
      }
    }

    for (const nota of notas) {
      const dataNota = nota.dataEmissao instanceof Date ? nota.dataEmissao : new Date(nota.dataEmissao)
      for (const p of (nota.produtos || []) as { nome?: string }[]) {
        const nome = p.nome?.trim()
        if (nome) addData(nome, dataNota)
      }
    }

    mapa.forEach((valor) => {
      const datas = valor.datasOrdenadas
      datas.sort((a, b) => a.getTime() - b.getTime())
      valor.totalCompras = datas.length
      const duracaoEntre: number[] = []
      for (let i = 1; i < datas.length; i++) {
        const dias = Math.round(
          (datas[i].getTime() - datas[i - 1].getTime()) / (1000 * 60 * 60 * 24),
        )
        duracaoEntre.push(dias)
      }
      valor.duracaoEntreComprasDias = duracaoEntre
      valor.duracaoMediaDias =
        duracaoEntre.length > 0
          ? Math.round(duracaoEntre.reduce((a, b) => a + b, 0) / duracaoEntre.length)
          : null
    })

    const d1 = mapa.get(nome1.trim()) ?? {
      datasOrdenadas: [],
      duracaoEntreComprasDias: [],
      duracaoMediaDias: null,
      totalCompras: 0,
    }
    const d2 = mapa.get(nome2.trim()) ?? {
      datasOrdenadas: [],
      duracaoEntreComprasDias: [],
      duracaoMediaDias: null,
      totalCompras: 0,
    }

    return {
      produto1: {
        nome: nome1,
        totalCompras: d1.totalCompras,
        duracaoMediaDias: d1.duracaoMediaDias,
        duracaoEntreComprasDias: d1.duracaoEntreComprasDias,
      },
      produto2: {
        nome: nome2,
        totalCompras: d2.totalCompras,
        duracaoMediaDias: d2.duracaoMediaDias,
        duracaoEntreComprasDias: d2.duracaoEntreComprasDias,
      },
    }
  }
}
