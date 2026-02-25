import { Produto } from "../Produto/Produto";
import { Endereco } from "./Endereco";

export type NotaFiscal = {
    id: string;
    qrCode: string;
    produtos: Produto[];
    data: Date;
    valorTotal: number;
    cahveDeAcesso: string;
    tributosTotais: number;
    nomeMercado: string;
    cnpjMercado: string;
    endereçoMercado: Endereco;
}