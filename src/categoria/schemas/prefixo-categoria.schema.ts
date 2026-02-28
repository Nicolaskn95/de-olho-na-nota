import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Prefixo extends Document {
  @Prop({ required: true, unique: true, uppercase: true })
  prefixo: string;

  @Prop({ type: Types.ObjectId, ref: 'Categoria', required: true })
  categoria: Types.ObjectId;
}

export const PrefixoSchema = SchemaFactory.createForClass(Prefixo);
