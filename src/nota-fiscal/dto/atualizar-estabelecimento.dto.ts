import { IsNotEmpty, IsString } from 'class-validator'

export class AtualizarEstabelecimentoDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome de exibição (de-para) é obrigatório' })
  nomeDepara: string
}
