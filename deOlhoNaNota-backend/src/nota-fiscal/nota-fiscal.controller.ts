import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { NotaFiscalService } from './nota-fiscal.service';
import { ProcessarNotaDto } from './dto/processar-nota.dto';

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

  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.notaFiscalService.buscarPorId(id);
  }
}
