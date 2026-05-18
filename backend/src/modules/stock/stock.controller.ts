import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard }  from '@nestjs/passport';
import { Roles, RolesGuard, PERFIS } from '../../common/guards/auth.guards';
import { StockService } from './stock.service';
import {
  CriarProdutoDto, AtualizarProdutoDto,
  EntradaEstoqueDto, SaidaEstoqueDto,
  FiltrosProdutoDto, FiltrosMovimentacaoDto,
} from './dto/stock.dto';

@ApiTags('Estoque')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('stock')
export class StockController {

  constructor(private stockService: StockService) {}

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
