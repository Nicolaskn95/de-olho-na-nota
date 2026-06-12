import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { DuracaoMediaService } from './duracao-media.service'
import { FiltrarDuracaoDto } from './dto/filtrar-duracao.dto'
import { CalcularDuracaoDto } from './dto/calcular-duracao.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserId } from '../auth/decorators/user.decorator'

@Controller('duracao-media')
@UseGuards(JwtAuthGuard)
export class DuracaoMediaController {
  constructor(private readonly duracaoMediaService: DuracaoMediaService) {}

  @Post('filtrar')
  filtrar(@UserId() userId: string, @Body() dto: FiltrarDuracaoDto) {
    return this.duracaoMediaService.filtrar(userId, dto)
  }

  @Post('calcular')
  calcular(@UserId() userId: string, @Body() dto: CalcularDuracaoDto) {
    return this.duracaoMediaService.calcular(userId, dto)
  }
}
