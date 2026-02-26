import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IProduto extends Document {
  nome: string;
  codigo: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  notaFiscal: Types.ObjectId;
}

const ProdutoSchema = new Schema<IProduto>(
  {
    nome: { type: String, required: true },
    codigo: { type: String, required: true },
    quantidade: { type: Number, required: true },
    unidade: { type: String, required: true },
    valorUnitario: { type: Number, required: true },
    valorTotal: { type: Number, required: true },
    notaFiscal: { type: Schema.Types.ObjectId, ref: "NotaFiscal" },
  },
  { timestamps: true }
);

export const Produto =
  mongoose.models.Produto ||
  mongoose.model<IProduto>("Produto", ProdutoSchema);
