import { Controller, Post, Get, Param, Body, Patch } from '@nestjs/common';
import { NotaFiscalService } from './nota-fiscal.service';
import { ProcessarNotaDto } from './dto/processar-nota.dto';
import { AtualizarEstabelecimentoDto } from './dto/atualizar-estabelecimento.dto';

@Controller('notas-fiscais')
export class NotaFiscalController {
  constructor(private readonly notaFiscalService: NotaFiscalService) {}

  @Post('processar')
  async processar(@Body() dto: ProcessarNotaDto) {
    return this.notaFiscalService.processarUrl(dto.url);
  }

  @Get()
  async listar() {
    return this.notaFiscalService.listarNotas();
  }

  @Get('estabelecimentos')
  async listarEstabelecimentos() {
    return this.notaFiscalService.listarEstabelecimentos();
  }

  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.notaFiscalService.buscarPorId(id);
  }

  @Patch('estabelecimentos/:cnpj')
  async atualizarEstabelecimento(
    @Param('cnpj') cnpj: string,
    @Body() dto: AtualizarEstabelecimentoDto,
  ) {
    return this.notaFiscalService.atualizarNomeEstabelecimento(
      cnpj,
      dto.estabelecimento,
    );
  }
}
