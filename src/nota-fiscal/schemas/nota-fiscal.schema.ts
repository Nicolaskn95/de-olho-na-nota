import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class NotaFiscal extends Document {
  // A chave de acesso pode existir para mais de um usuário (por isso não é unique global).
  @Prop({ required: true })
  chaveAcesso: string;

  // ID do usuário logado que escaneou/cadastrou a nota fiscal (vem do JWT "sub").
  @Prop({ required: true, index: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

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

// Unique por (chaveAcesso, userId).
// Evita cadastrar a mesma nota duas vezes pelo mesmo usuário, mas permite usuários diferentes.
NotaFiscalSchema.index(
  { chaveAcesso: 1, userId: 1 },
  // Garante que documentos antigos sem userId não travem a criação do índice.
  { unique: true, sparse: true },
);
