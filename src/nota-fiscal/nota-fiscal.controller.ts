import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotaFiscalService } from './nota-fiscal.service';
import { ProcessarNotaDto } from './dto/processar-nota.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../auth/decorators/user.decorator';

@Controller('notas-fiscais')
export class NotaFiscalController {
  constructor(private readonly notaFiscalService: NotaFiscalService) {}

  @Post('processar')
  @UseGuards(JwtAuthGuard)
  async processar(@Body() dto: ProcessarNotaDto, @UserId() userId: string) {
    return this.notaFiscalService.processarUrl(dto.url, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listar(@UserId() userId: string) {
    // #region agent log
    fetch('http://127.0.0.1:7461/ingest/67ad9434-be4c-4cd5-8952-2c823b0fe782',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f2e24'},body:JSON.stringify({sessionId:'7f2e24',runId:'pre',hypothesisId:'H4',location:'nota-fiscal.controller.ts:listar',message:'List notas called',data:{userIdPresent:!!userId,userIdLength:userId?.length||0},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const notas = await this.notaFiscalService.listarNotasPorUsuario(userId);
    // #region agent log
    fetch('http://127.0.0.1:7461/ingest/67ad9434-be4c-4cd5-8952-2c823b0fe782',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7f2e24'},body:JSON.stringify({sessionId:'7f2e24',runId:'pre',hypothesisId:'H3',location:'nota-fiscal.controller.ts:listar:result',message:'Returning notas',data:{count:Array.isArray(notas)?notas.length:-1},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return notas;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async buscarPorId(@Param('id') id: string, @UserId() userId: string) {
    return this.notaFiscalService.buscarPorId(id, userId);
  }
}
