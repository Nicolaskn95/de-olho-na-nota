import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

export interface DadosItemConsumo {
  nome: string
  unidade: string
  quantidadeTotal: number
  comprasCount: number
  datas: Date[]
  diferencasDias: number[]
  valorMedio?: number
}

export interface DetalheProdutoIa {
  nomeProduto: string
  duracaoEstimadaDias: number
  consumoDiarioEstimado: string
  previsaoEsgotamento: string
  confiancaProduto: 'Alta' | 'Média' | 'Baixa'
  explicacaoIa: string
}

export interface ResultadoIaQwen {
  duracaoMediaDias: number
  confianca: 'Alta' | 'Média' | 'Baixa'
  resumoIa: string
  insights: string[]
  previsaoProximaCompra: string
  detalhesProdutos: DetalheProdutoIa[]
  usouIa: boolean
  modeloUsado: string
}

@Injectable()
export class QwenAiService {
  private readonly logger = new Logger(QwenAiService.name)

  constructor(private configService: ConfigService) {}

  async analisarConsumo(
    itens: DadosItemConsumo[],
    qtdMeses: number,
  ): Promise<ResultadoIaQwen> {
    const apiUrl =
      this.configService.get<string>('QWEN_API_URL') ||
      process.env.QWEN_API_URL ||
      'https://openrouter.ai/api/v1/chat/completions'

    const apiKey =
      this.configService.get<string>('QWEN_API_KEY') ||
      process.env.QWEN_API_KEY ||
      ''

    const model =
      this.configService.get<string>('QWEN_MODEL') ||
      process.env.QWEN_MODEL ||
      'qwen/qwen-2.5-72b-instruct:free'

    if (!apiKey) {
      this.logger.warn('QWEN_API_KEY não configurada. Usando estimativa local.')
      return this.calcularFallbackLocal(itens, qtdMeses, 'Chave de API não configurada')
    }

    try {
      const historicoFormatado = itens.map((item) => ({
        nome: item.nome,
        unidade: item.unidade,
        quantidadeTotal: item.quantidadeTotal,
        totalCompras: item.comprasCount,
        datasCompras: item.datas.map((d) => d.toISOString().split('T')[0]),
        diferencasEmDias: item.diferencasDias,
      }))

      const prompt = `Você é uma IA especialista em análise de consumo doméstico e gestão de estoque residencial.
Analise os seguintes dados de compras de notas fiscais efetuadas nos últimos ${qtdMeses} meses:

Histórico de Compras:
${JSON.stringify(historicoFormatado, null, 2)}

Instruções:
1. Para cada produto, determine a duração média estimada em dias na casa com base no volume comprado e no intervalo entre compras.
2. Calcule a taxa de consumo diário estimada (ex: "0.15 kg/dia" ou "0.5 unidade/dia").
3. Estime a data provável de esgotamento/próxima compra a partir da última data de compra no formato YYYY-MM-DD.
4. Classifique o nível de confiança ("Alta", "Média", "Baixa").
5. Elabore um resumo conciso e 2 a 4 insights práticos de economia/reposição para o usuário.
6. Retorne EXCLUSIVAMENTE um objeto JSON válido no seguinte formato sem nenhum texto extra ou marcações markdown fora do JSON:

{
  "duracaoMediaDias": number,
  "confianca": "Alta" | "Média" | "Baixa",
  "resumoIa": "string com resumo amigável",
  "insights": ["insight 1", "insight 2"],
  "previsaoProximaCompra": "YYYY-MM-DD",
  "detalhesProdutos": [
    {
      "nomeProduto": "string",
      "duracaoEstimadaDias": number,
      "consumoDiarioEstimado": "string",
      "previsaoEsgotamento": "YYYY-MM-DD",
      "confiancaProduto": "Alta" | "Média" | "Baixa",
      "explicacaoIa": "string"
    }
  ]
}`

      const response = await axios.post(
        apiUrl,
        {
          model: model,
          messages: [
            {
              role: 'system',
              content:
                'Você é um assistente de IA especialista em finanças domésticas e consumo residencial. Responda estritamente em JSON válido.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 1500,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://de-olho-na-nota.local',
            'X-Title': 'De Olho na Nota - Duracao Media',
          },
          timeout: 25000,
        },
      )

      const rawContent = response.data?.choices?.[0]?.message?.content
      if (!rawContent) {
        throw new Error('Resposta vazia da API do Qwen')
      }

      const jsonStr = rawContent
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim()

      const parsed = JSON.parse(jsonStr)

      return {
        duracaoMediaDias: Number(parsed.duracaoMediaDias) || 0,
        confianca: parsed.confianca || 'Média',
        resumoIa: parsed.resumoIa || 'Análise concluída com base no seu histórico.',
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        previsaoProximaCompra: parsed.previsaoProximaCompra || '',
        detalhesProdutos: Array.isArray(parsed.detalhesProdutos)
          ? parsed.detalhesProdutos
          : [],
        usouIa: true,
        modeloUsado: `Qwen 2.5 (${model})`,
      }
    } catch (error: any) {
      this.logger.error(
        `Erro ao consultar Qwen 2.5 API (${error?.message}). Ativando fallback local.`,
      )
      return this.calcularFallbackLocal(itens, qtdMeses, error?.message)
    }
  }

  private calcularFallbackLocal(
    itens: DadosItemConsumo[],
    qtdMeses: number,
    motivoFallback?: string,
  ): ResultadoIaQwen {
    let somaTotalDias = 0
    let totalComparesCount = 0

    const detalhesProdutos: DetalheProdutoIa[] = itens.map((item) => {
      const somaDiasItem = item.diferencasDias.reduce((a, b) => a + b, 0)
      const mediaDiasItem =
        item.diferencasDias.length > 0
          ? Math.round(somaDiasItem / item.diferencasDias.length)
          : Math.round(30 / Math.max(1, item.comprasCount))

      somaTotalDias += somaDiasItem > 0 ? somaDiasItem : mediaDiasItem
      totalComparesCount += item.comprasCount

      const ultimaData =
        item.datas.length > 0
          ? new Date(Math.max(...item.datas.map((d) => d.getTime())))
          : new Date()

      const previsaoDate = new Date(ultimaData)
      previsaoDate.setDate(previsaoDate.getDate() + (mediaDiasItem || 30))

      const confianca: 'Alta' | 'Média' | 'Baixa' =
        item.comprasCount >= 3 ? 'Alta' : item.comprasCount === 2 ? 'Média' : 'Baixa'

      const qtdTotal = item.quantidadeTotal || 1
      const consumoDiario = (qtdTotal / Math.max(1, mediaDiasItem)).toFixed(2)

      return {
        nomeProduto: item.nome,
        duracaoEstimadaDias: mediaDiasItem,
        consumoDiarioEstimado: `${consumoDiario} ${item.unidade || 'un'}/dia`,
        previsaoEsgotamento: previsaoDate.toISOString().split('T')[0],
        confiancaProduto: confianca,
        explicacaoIa: `Estimado com base em ${item.comprasCount} compra(s) e intervalo médio de ${mediaDiasItem} dias.`,
      }
    })

    const duracaoMediaDias =
      detalhesProdutos.length > 0
        ? Math.round(
            detalhesProdutos.reduce((a, b) => a + b.duracaoEstimadaDias, 0) /
              detalhesProdutos.length,
          )
        : 0

    const ultimaDataGeral = new Date()
    const previsaoGeral = new Date(ultimaDataGeral)
    previsaoGeral.setDate(previsaoGeral.getDate() + duracaoMediaDias)

    return {
      duracaoMediaDias,
      confianca: totalComparesCount >= 4 ? 'Alta' : 'Média',
      resumoIa:
        'Cálculo estimado com base nos intervalos de compra cadastrados no banco de dados.',
      insights: [
        'Adicione mais notas fiscais para aumentar a precisão do modelo de inteligência artificial.',
        `Frequência média de compra estimada em cerca de ${duracaoMediaDias} dias.`,
      ],
      previsaoProximaCompra: previsaoGeral.toISOString().split('T')[0],
      detalhesProdutos,
      usouIa: false,
      modeloUsado: 'Fallback Algorítmico Local',
    }
  }
}
