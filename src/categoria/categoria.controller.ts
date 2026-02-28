import { Controller, Post, Get, Delete, Put, Param, Body } from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { CriarPrefixoDto } from './dto/criar-prefixo.dto';

@Controller('categorias')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  // ========== CATEGORIAS ==========

  @Get()
  listarCategorias() {
    return this.categoriaService.listarCategorias();
  }

  @Get(':id')
  buscarCategoria(@Param('id') id: string) {
    return this.categoriaService.buscarCategoriaPorId(id);
  }

  // ========== PREFIXOS ==========

  @Get('prefixos/listar')
  listarPrefixos() {
    return this.categoriaService.listarPrefixos();
  }

  @Post('prefixos')
  criarPrefixo(@Body() dto: CriarPrefixoDto) {
    return this.categoriaService.criarPrefixo(dto);
  }

  @Put('prefixos/:id')
  atualizarPrefixo(@Param('id') id: string, @Body() dto: CriarPrefixoDto) {
    return this.categoriaService.atualizarPrefixo(id, dto);
  }

  @Delete('prefixos/:id')
  removerPrefixo(@Param('id') id: string) {
    return this.categoriaService.removerPrefixo(id);
  }
}
