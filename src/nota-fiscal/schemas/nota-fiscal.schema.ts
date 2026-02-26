import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class NotaFiscal extends Document {
  @Prop({ required: true, unique: true })
  chaveAcesso: string;

  @Prop({ required: true })
  numero: string;

  @Prop({ required: true })
  serie: string;

  @Prop({ required: true })
  dataEmissao: Date;

  @Prop({ required: true })
  estabelecimento: string;

  @Prop({ required: true })
  cnpj: string;

  @Prop()
  endereco: string;

  @Prop({ required: true })
  valorTotal: number;

  @Prop({ default: 0 })
  descontos: number;

  @Prop({ required: true })
  valorPago: number;

  @Prop()
  formaPagamento: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Produto' }] })
  produtos: Types.ObjectId[];

  @Prop({ required: true })
  urlOriginal: string;
}

export const NotaFiscalSchema = SchemaFactory.createForClass(NotaFiscal);
