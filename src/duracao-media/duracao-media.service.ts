import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { NotaFiscal } from '../nota-fiscal/schemas/nota-fiscal.schema'
import { Produto } from '../nota-fiscal/schemas/produto.schema'
import { Prefixo } from '../categoria/schemas/prefixo-categoria.schema'
import { Categoria } from '../categoria/schemas/categoria.schema'
import { FiltrarDuracaoDto } from './dto/filtrar-duracao.dto'
import { CalcularDuracaoDto } from './dto/calcular-duracao.dto'

@Injectable()
export class DuracaoMediaService {
  constructor(
    @InjectModel(NotaFiscal.name)
    private notaFiscalModel: Model<NotaFiscal>,
    @InjectModel(Produto.name)
    private produtoModel: Model<Produto>,
    @InjectModel(Prefixo.name)
    private prefixoModel: Model<Prefixo>,
    @InjectModel(Categoria.name)
    private categoriaModel: Model<Categoria>,
  ) {}

  private toUserId(userId: string): Types.ObjectId {
    return new Types.ObjectId(userId)
  }

  async filtrar(userId: string, dto: FiltrarDuracaoDto) {
    const [ano, mes] = dto.mesInicial.split('-').map(Number)
    const startDate = new Date(ano, mes - 1, 1)

    const endMonth = mes - 1 + dto.qtdMeses
    const endDate = new Date(ano, endMonth, 0, 23, 59, 59, 999)

    const categoria = await this.categoriaModel.findById(dto.categoriaId).exec()
    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada')
    }

    const prefixos = await this.prefixoModel
      .find({
        userId: this.toUserId(userId),
        categoria: new Types.ObjectId(dto.categoriaId),
      })
      .exec()

    const prefixStrings = prefixos.map((p) => p.prefixo)

    if (prefixStrings.length === 0) {
      return {
        notasFiscais: [],
        categoria,
        periodoInicio: startDate,
        periodoFim: endDate,
      }
    }

    const notas = await this.notaFiscalModel
      .find({
        userId: this.toUserId(userId),
        dataEmissao: { $gte: startDate, $lte: endDate },
      })
      .populate('produtos')
      .exec()

    const notasFiltradas = notas
      .map((nf) => {
        const produtosFiltrados = (nf.produtos as unknown as Produto[]).filter(
          (prod) => {
            const nomeUpper = prod.nome.toUpperCase()
            return prefixStrings.some((prefix) => nomeUpper.startsWith(prefix))
          },
        )

        if (produtosFiltrados.length === 0) return null

        return {
          _id: nf._id,
          chaveAcesso: nf.chaveAcesso,
          numero: nf.numero,
          serie: nf.serie,
          dataEmissao: nf.dataEmissao,
          estabelecimento: nf.estabelecimento,
          cnpj: nf.cnpj,
          valorTotal: nf.valorTotal,
          valorPago: nf.valorPago,
          produtos: produtosFiltrados,
        }
      })
      .filter(Boolean)

    return {
      notasFiscais: notasFiltradas,
      categoria,
      periodoInicio: startDate,
      periodoFim: endDate,
    }
  }

  async calcular(userId: string, dto: CalcularDuracaoDto) {
    const produtoObjectIds = dto.produtoIds.map((id) => new Types.ObjectId(id))

    const produtos = await this.produtoModel
      .find({ _id: { $in: produtoObjectIds } })
      .exec()

    if (produtos.length === 0) {
      throw new NotFoundException('Nenhum produto encontrado')
    }

    const produtosComData: { nome: string; dataEmissao: Date }[] = []

    for (const produto of produtos) {
      const nf = await this.notaFiscalModel
        .findById(produto.notaFiscal)
        .exec()

      if (nf) {
        produtosComData.push({
          nome: produto.nome.toUpperCase(),
          dataEmissao: nf.dataEmissao,
        })
      }
    }

    const grupos = new Map<string, Date[]>()
    for (const item of produtosComData) {
      const datas = grupos.get(item.nome) || []
      datas.push(item.dataEmissao)
      grupos.set(item.nome, datas)
    }

    let totalDiffDays = 0
    const detalhes: {
      nome: string
      ocorrencias: number
      diferencasDias: number[]
      totalDias: number
    }[] = []

    for (const [nome, datas] of grupos) {
      datas.sort((a, b) => a.getTime() - b.getTime())

      const diferencasDias: number[] = []
      let totalDiasGrupo = 0

      for (let i = 1; i < datas.length; i++) {
        const diffMs = datas[i].getTime() - datas[i - 1].getTime()
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
        diferencasDias.push(diffDays)
        totalDiasGrupo += diffDays
      }

      totalDiffDays += totalDiasGrupo

      detalhes.push({
        nome,
        ocorrencias: datas.length,
        diferencasDias,
        totalDias: totalDiasGrupo,
      })
    }

    const duracaoMediaDias =
      dto.qtdMeses > 0 ? Math.round(totalDiffDays / dto.qtdMeses) : 0

    return {
      duracaoMediaDias,
      detalhes,
      qtdMeses: dto.qtdMeses,
    }
  }
}
