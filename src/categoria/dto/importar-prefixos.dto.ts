import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator'

export class ImportarPrefixoItemDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  prefixo: string

  @IsString()
  @IsNotEmpty()
  codigoCategoria: string
}

export class ImportarPrefixosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportarPrefixoItemDto)
  prefixos: ImportarPrefixoItemDto[]
}
