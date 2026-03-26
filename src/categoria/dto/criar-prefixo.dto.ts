import { IsNotEmpty, IsString, MinLength, IsMongoId } from 'class-validator'

export class CriarPrefixoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  prefixo: string

  @IsMongoId()
  @IsNotEmpty()
  categoriaId: string
}
