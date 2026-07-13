import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Req, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard }  from '@nestjs/passport';
import { Roles, RolesGuard, PERFIS } from '../../common/guards/auth.guards';
import { StockService }      from './stock.service';
import { CategoriasService } from './categorias.service';
import {
  CriarProdutoDto, AtualizarProdutoDto,
  EntradaEstoqueDto, SaidaEstoqueDto,
  FiltrosProdutoDto, FiltrosMovimentacaoDto,
  CriarCategoriaDto, AtualizarCategoriaDto,
} from './dto/stock.dto';

@ApiTags('Estoque')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('stock')
export class StockController {

  constructor(
    private stockService: StockService,
    private categorias:   CategoriasService,
  ) {}

  // ══════════════════════════════════════════════════════════════
  //  CATEGORIAS DE INSUMO — ERR-14
  // ══════════════════════════════════════════════════════════════

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias de insumo do tenant (RF-E10)' })
  listarCategorias(@Req() req: any, @Query('incluir_inativas') incluirInativas?: string) {
    return this.categorias.listar(req.user.tenantId, incluirInativas === 'true');
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Criar categoria de insumo' })
  criarCategoria(@Req() req: any, @Body() dto: CriarCategoriaDto) {
    return this.categorias.criar(req.user.tenantId, dto);
  }

  @Patch('categories/:id')
  @UseGuards(RolesGuard)
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Atualizar categoria' })
  atualizarCategoria(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AtualizarCategoriaDto,
  ) {
    return this.categorias.atualizar(req.user.tenantId, id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles(PERFIS.ADMIN)
  @ApiOperation({ summary: 'Remover categoria (desativa se houver produtos usando)' })
  removerCategoria(@Req() req: any, @Param('id') id: string) {
    return this.categorias.remover(req.user.tenantId, id);
  }

  @Post('categories/importar-legado')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(PERFIS.ADMIN)
  @ApiOperation({
    summary: 'Cria categorias a partir do ENUM legado e liga os produtos (idempotente)',
  })
  importarCategoriasLegado(@Req() req: any) {
    return this.categorias.importarLegado(req.user.tenantId);
  }

  // ── GET /stock/products ───────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: 'Listar produtos com saldo atual' })
  listarProdutos(@Req() req: any, @Query() filtros: FiltrosProdutoDto) {
    return this.stockService.listarProdutos(req.user.tenantId, filtros);
  }

  // ── GET /stock/products/:id ───────────────────────────────────
  @Get('products/:id')
  @ApiOperation({ summary: 'Detalhe do produto com saldo' })
  buscarProduto(@Req() req: any, @Param('id') id: string) {
    return this.stockService.buscarProduto(req.user.tenantId, id);
  }

  // ── POST /stock/products ──────────────────────────────────────
  @Post('products')
  @UseGuards(RolesGuard)
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Cadastrar novo produto' })
  criarProduto(@Req() req: any, @Body() dto: CriarProdutoDto) {
    return this.stockService.criarProduto(req.user.tenantId, dto, req.user.userId);
  }

  // ── PATCH /stock/products/:id ─────────────────────────────────
  @Patch('products/:id')
  @UseGuards(RolesGuard)
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Atualizar produto' })
  atualizarProduto(@Req() req: any, @Param('id') id: string, @Body() dto: AtualizarProdutoDto) {
    return this.stockService.atualizarProduto(req.user.tenantId, id, dto);
  }

  // ── GET /stock/movements ──────────────────────────────────────
  @Get('movements')
  @ApiOperation({ summary: 'Histórico de movimentações de estoque' })
  listarMovimentacoes(@Req() req: any, @Query() filtros: FiltrosMovimentacaoDto) {
    return this.stockService.listarMovimentacoes(req.user.tenantId, filtros);
  }

  // ── POST /stock/entry ─────────────────────────────────────────
  @Post('entry')
  @UseGuards(RolesGuard)
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Registrar entrada de insumos (UC-06)' })
  registrarEntrada(@Req() req: any, @Body() dto: EntradaEstoqueDto) {
    return this.stockService.registrarEntrada(req.user.tenantId, dto, req.user.userId);
  }

  // ── POST /stock/exit ──────────────────────────────────────────
  @Post('exit')
  @UseGuards(RolesGuard)
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Registrar saída de insumos (UC-07)' })
  registrarSaida(@Req() req: any, @Body() dto: SaidaEstoqueDto) {
    return this.stockService.registrarSaida(req.user.tenantId, dto, req.user.userId);
  }

  // ── GET /stock/report ─────────────────────────────────────────
  @Get('report')
  @ApiOperation({ summary: 'Relatório consolidado de estoque (RF-E06)' })
  relatorioEstoque(
    @Req() req: any,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
  ) {
    return this.stockService.relatorioEstoque(req.user.tenantId, dataInicio, dataFim);
  }

  // ── GET /stock/alerts ─────────────────────────────────────────
  @Get('alerts')
  @ApiOperation({ summary: 'Produtos abaixo ou no estoque mínimo' })
  produtosEmAlerta(@Req() req: any) {
    return this.stockService.produtosEmAlerta(req.user.tenantId);
  }

  // ── GET /stock/dashboard ──────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Resumo do estoque para o dashboard' })
  resumoDashboard(@Req() req: any) {
    return this.stockService.resumoDashboard(req.user.tenantId);
  }
}
