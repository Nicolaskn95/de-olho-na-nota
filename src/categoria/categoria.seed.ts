import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Categoria } from './schemas/categoria.schema'

interface CategoriaSeedData {
  codigo: string
  nome: string
  descricao: string
  icone: string
  cor: string
}

const CATEGORIAS_PADRAO: CategoriaSeedData[] = [
  {
    codigo: 'ACOUGUE_E_PEIXARIA',
    nome: 'Açougue e Peixaria',
    descricao: 'Carnes bovinas, suínas, aves, peixes e frutos do mar',
    icone: 'Beef',
    cor: '#dc2626',
  },
  {
    codigo: 'HORTIFRUTI_FRUTAS',
    nome: 'Frutas',
    descricao: 'Frutas frescas e in natura',
    icone: 'Apple',
    cor: '#eab308',
  },
  {
    codigo: 'HORTIFRUTI_VERDURAS_E_LEGUMES',
    nome: 'Verduras e Legumes',
    descricao: 'Hortaliças, folhas e legumes frescos',
    icone: 'leafy-green',
    cor: '#22c55e',
  },
  {
    codigo: 'LATICINIOS_E_OVOS',
    nome: 'Laticínios e Ovos',
    descricao: 'Leite, queijos, iogurtes e ovos',
    icone: 'Milk',
    cor: '#cbd5e1',
  },
  {
    codigo: 'PADARIA_E_CONFEITARIA',
    nome: 'Padaria e Confeitaria',
    descricao: 'Pães, bolos, tortas e salgados',
    icone: 'Croissant',
    cor: '#92400e',
  },
  {
    codigo: 'MERCEARIA_SECA',
    nome: 'Mercearia Seca',
    descricao: 'Arroz, feijão, massas, óleos e grãos',
    icone: 'Package',
    cor: '#6d28d9',
  },
  {
    codigo: 'CONGELADOS',
    nome: 'Congelados',
    descricao: 'Pratos prontos, sorvetes e vegetais congelados',
    icone: 'Snowflake',
    cor: '#3b82f6',
  },
  {
    codigo: 'BEBIDAS',
    nome: 'Bebidas',
    descricao: 'Sucos, refrigerantes, águas e bebidas alcoólicas',
    icone: 'Wine',
    cor: '#db2777',
  },
  {
    codigo: 'LIMPEZA',
    nome: 'Limpeza',
    descricao: 'Detergentes, desinfetantes e sabão em pó',
    icone: 'SprayCan',
    cor: '#06b6d4',
  },
  {
    codigo: 'HIGIENE_E_BELEZA',
    nome: 'Higiene e Beleza',
    descricao: 'Shampoo, sabonete, creme dental e cosméticos',
    icone: 'Sparkles',
    cor: '#f472b6',
  },
  {
    codigo: 'PET_SHOP',
    nome: 'Pet Shop',
    descricao: 'Rações e itens para animais de estimação',
    icone: 'PawPrint',
    cor: '#f97316',
  },
  {
    codigo: 'UTILIDADES_DOMESTICAS',
    nome: 'Utilidades Domésticas',
    descricao: 'Utensílios de cozinha, lâmpadas e bazar',
    icone: 'Lamp',
    cor: '#475569',
  },
]

@Injectable()
export class CategoriaSeed implements OnModuleInit {
  private readonly logger = new Logger(CategoriaSeed.name)

  constructor(
    @InjectModel(Categoria.name)
    private categoriaModel: Model<Categoria>,
  ) {}

  async onModuleInit() {
    await this.seed()
  }

  async seed() {
    this.logger.log('Iniciando seed de categorias...')

    let categoriasAdicionadas = 0
    for (const cat of CATEGORIAS_PADRAO) {
      const existe = await this.categoriaModel.findOneAndUpdate({
        codigo: cat.codigo,
      })
      if (!existe) {
        await this.categoriaModel.create(cat)
        categoriasAdicionadas++
      }
    }

    this.logger.log(
      `Seed concluído: ${categoriasAdicionadas} categorias adicionadas`,
    )
  }
}
