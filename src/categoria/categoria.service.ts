import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Categoria } from './schemas/categoria.schema';
import { Prefixo } from './schemas/prefixo-categoria.schema';
import { CriarPrefixoDto } from './dto/criar-prefixo.dto';

@Injectable()
export class CategoriaService {
  constructor(
    @InjectModel(Categoria.name)
    private categoriaModel: Model<Categoria>,
    @InjectModel(Prefixo.name)
    private prefixoModel: Model<Prefixo>,
  ) {}

  // ========== CATEGORIAS ==========

  async listarCategorias(): Promise<Categoria[]> {
    return this.categoriaModel.find().sort({ nome: 1 }).exec();
  }

  async buscarCategoriaPorId(id: string): Promise<Categoria | null> {
    return this.categoriaModel.findById(id).exec();
  }

  // ========== PREFIXOS ==========

  async criarPrefixo(dto: CriarPrefixoDto): Promise<Prefixo> {
    const prefixoUpperCase = dto.prefixo.toUpperCase().trim();

    const existente = await this.prefixoModel.findOne({
      prefixo: prefixoUpperCase,
    });

    if (existente) {
      throw new ConflictException(
        `O prefixo "${prefixoUpperCase}" já está cadastrado`,
      );
    }

    const categoria = await this.categoriaModel.findById(dto.categoriaId);
    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada');
    }

    const prefixo = new this.prefixoModel({
      prefixo: prefixoUpperCase,
      categoria: dto.categoriaId,
    });

    const salvo = await prefixo.save();
    return this.prefixoModel.findById(salvo._id).populate('categoria').exec() as Promise<Prefixo>;
  }

  async listarPrefixos(): Promise<Prefixo[]> {
    return this.prefixoModel.find().populate('categoria').sort({ prefixo: 1 }).exec();
  }

  async atualizarPrefixo(id: string, dto: CriarPrefixoDto): Promise<Prefixo> {
    const prefixoUpperCase = dto.prefixo.toUpperCase().trim();

    const existente = await this.prefixoModel.findOne({
      prefixo: prefixoUpperCase,
      _id: { $ne: id },
    });

    if (existente) {
      throw new ConflictException(
        `O prefixo "${prefixoUpperCase}" já está cadastrado`,
      );
    }

    const categoria = await this.categoriaModel.findById(dto.categoriaId);
    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada');
    }

    const atualizado = await this.prefixoModel.findByIdAndUpdate(
      id,
      { prefixo: prefixoUpperCase, categoria: dto.categoriaId },
      { new: true },
    ).populate('categoria');

    if (!atualizado) {
      throw new NotFoundException('Prefixo não encontrado');
    }

    return atualizado;
  }

  async removerPrefixo(id: string): Promise<void> {
    const result = await this.prefixoModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Prefixo não encontrado');
    }
  }

  async buscarCategoriaPorNomeProduto(nomeProduto: string): Promise<Categoria | null> {
    const nomeUpperCase = nomeProduto.toUpperCase();
    const prefixos = await this.prefixoModel.find().populate('categoria').exec();

    const prefixosOrdenados = prefixos.sort(
      (a, b) => b.prefixo.length - a.prefixo.length,
    );

    for (const p of prefixosOrdenados) {
      if (nomeUpperCase.startsWith(p.prefixo)) {
        return p.categoria as unknown as Categoria;
      }
    }

    return null;
  }
}
