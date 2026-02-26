import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface INotaFiscal extends Document {
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: Date;
  estabelecimento: string;
  cnpj: string;
  endereco: string;
  valorTotal: number;
  descontos: number;
  valorPago: number;
  formaPagamento: string;
  produtos: Types.ObjectId[];
  urlOriginal: string;
}

const NotaFiscalSchema = new Schema<INotaFiscal>(
  {
    chaveAcesso: { type: String, required: true, unique: true },
    numero: { type: String, required: true },
    serie: { type: String, required: true },
    dataEmissao: { type: Date, required: true },
    estabelecimento: { type: String, required: true },
    cnpj: { type: String, required: true },
    endereco: { type: String },
    valorTotal: { type: Number, required: true },
    descontos: { type: Number, default: 0 },
    valorPago: { type: Number, required: true },
    formaPagamento: { type: String },
    produtos: [{ type: Schema.Types.ObjectId, ref: "Produto" }],
    urlOriginal: { type: String, required: true },
  },
  { timestamps: true }
);

export const NotaFiscal =
  mongoose.models.NotaFiscal ||
  mongoose.model<INotaFiscal>("NotaFiscal", NotaFiscalSchema);
