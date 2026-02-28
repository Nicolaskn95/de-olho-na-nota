import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriaController } from './categoria.controller';
import { CategoriaService } from './categoria.service';
import { CategoriaSeed } from './categoria.seed';
import { Categoria, CategoriaSchema } from './schemas/categoria.schema';
import { Prefixo, PrefixoSchema } from './schemas/prefixo-categoria.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Categoria.name, schema: CategoriaSchema },
      { name: Prefixo.name, schema: PrefixoSchema },
    ]),
  ],
  controllers: [CategoriaController],
  providers: [CategoriaService, CategoriaSeed],
  exports: [CategoriaService, MongooseModule],
})
export class CategoriaModule {}
