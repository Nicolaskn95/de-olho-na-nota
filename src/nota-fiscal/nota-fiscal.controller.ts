import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Query,
} from '@nestjs/common'
import { NotaFiscalService } from './nota-fiscal.service'
import { ProcessarNotaDto } from './dto/processar-nota.dto'
import { AtualizarEstabelecimentoDto } from './dto/atualizar-estabelecimento.dto'

@Controller('notas-fiscais')
export class NotaFiscalController {
  constructor(private readonly notaFiscalService: NotaFiscalService) {}

  @Post('processar')
  async processar(@Body() dto: ProcessarNotaDto) {
    return this.notaFiscalService.processarUrl(dto.url)
  }

  @Get()
  async listar() {
    return this.notaFiscalService.listarNotas()
  }

  @Get('estabelecimentos')
  async listarEstabelecimentos() {
    return this.notaFiscalService.listarEstabelecimentos()
  }

  @Get('produtos')
  async listarNomesProdutos(@Query('q') q?: string) {
    return this.notaFiscalService.listarNomesProdutos(q)
  }

  @Get('produtos/sugestoes')
  async sugerirProdutos(@Query('nome') nome: string) {
    return this.notaFiscalService.sugerirProdutosParecidos(nome ?? '')
  }

  @Get('produtos/comparar-duracao')
  async compararDuracao(
    @Query('produto1') produto1: string,
    @Query('produto2') produto2: string,
  ) {
    return this.notaFiscalService.compararDuracaoProdutos(
      produto1 ?? '',
      produto2 ?? '',
    )
  }

  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.notaFiscalService.buscarPorId(id)
  }

  @Patch('estabelecimentos/:cnpj')
  async atualizarEstabelecimento(
    @Param('cnpj') cnpj: string,
    @Body() dto: AtualizarEstabelecimentoDto,
  ) {
    return this.notaFiscalService.atualizarNomeEstabelecimento(
      cnpj,
      dto.estabelecimento,
    )
  }
}
