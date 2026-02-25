import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotaFiscalController } from './nota-fiscal.controller';
import { NotaFiscalService } from './nota-fiscal.service';
import { NotaFiscal, NotaFiscalSchema } from './schemas/nota-fiscal.schema';
import { Produto, ProdutoSchema } from './schemas/produto.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotaFiscal.name, schema: NotaFiscalSchema },
      { name: Produto.name, schema: ProdutoSchema },
    ]),
  ],
  controllers: [NotaFiscalController],
  providers: [NotaFiscalService],
  exports: [NotaFiscalService],
})
export class NotaFiscalModule {}
