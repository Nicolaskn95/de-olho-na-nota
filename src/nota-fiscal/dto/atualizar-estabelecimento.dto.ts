import { IsNotEmpty } from 'class-validator'

export class AtualizarEstabelecimentoDto {
  @IsNotEmpty({ message: 'O nome do estabelecimento é obrigatório' })
  estabelecimento: string
}
