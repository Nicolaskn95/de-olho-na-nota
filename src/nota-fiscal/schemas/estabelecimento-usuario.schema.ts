import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

/** De-para de nome de estabelecimento por usuário e CNPJ (collection: estabelecimentos). */
@Schema({ timestamps: true, collection: 'estabelecimentos' })
export class EstabelecimentoUsuario extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId

  @Prop({ required: true })
  cnpj: string

  /** Nome como veio na nota (referência fixa). */
  @Prop({ required: true })
  nomeOriginal: string

  /** Nome que o usuário prefere ver. */
  @Prop({ required: true })
  nomeDepara: string
}

export const EstabelecimentoUsuarioSchema = SchemaFactory.createForClass(
  EstabelecimentoUsuario,
)

EstabelecimentoUsuarioSchema.index({ userId: 1, cnpj: 1 }, { unique: true })
