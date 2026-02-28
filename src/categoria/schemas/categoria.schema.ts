import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Categoria extends Document {
  @Prop({ required: true, unique: true })
  codigo: string;

  @Prop({ required: true })
  nome: string;

  @Prop()
  descricao: string;

  @Prop()
  icone: string;

  @Prop()
  cor: string;
}

export const CategoriaSchema = SchemaFactory.createForClass(Categoria);
