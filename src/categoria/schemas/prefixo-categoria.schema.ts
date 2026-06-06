import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema({ timestamps: true })
export class Prefixo extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId

  @Prop({ required: true, uppercase: true })
  prefixo: string

  @Prop({ type: Types.ObjectId, ref: 'Categoria', required: true })
  categoria: Types.ObjectId
}

export const PrefixoSchema = SchemaFactory.createForClass(Prefixo)

PrefixoSchema.index({ userId: 1, prefixo: 1 }, { unique: true })
