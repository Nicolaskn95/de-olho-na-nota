import { Categoria } from "./Categoria";

export type Produto = {
    id: string;
    nome: string;
    codigo: string;
    valorUnitario: number;
    valorTotal: number;
    quantidade: number;
    categoria: Categoria;
}