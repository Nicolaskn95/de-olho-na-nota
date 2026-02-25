import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotaFiscalModule } from './nota-fiscal/nota-fiscal.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/deOlhoNaNota'),
    NotaFiscalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
