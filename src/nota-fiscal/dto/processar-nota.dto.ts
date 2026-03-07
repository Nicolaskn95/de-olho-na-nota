import { IsNotEmpty, IsUrl } from 'class-validator'

export class ProcessarNotaDto {
  @IsNotEmpty({ message: 'A URL da nota fiscal é obrigatória' })
  @IsUrl({}, { message: 'URL inválida' })
  url: string
}
