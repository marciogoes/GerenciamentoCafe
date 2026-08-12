import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiParam, ApiQuery, ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard }     from '@nestjs/passport';

import { JwtAuthGuard, RolesGuard, Roles, TenantId, CurrentUser, PERFIS } from '../../common/guards/auth.guards';
import { MachinesService } from './machines.service';
import {
  CriarModeloDto, AtualizarModeloDto,
  CriarMaquinaDto, AtualizarMaquinaDto,
  RegistrarSaidaDto, RegistrarRetornoDto,
  FiltrosMaquinaDto, FiltrosMovimentacaoDto,
} from './dto/machines.dto';

// ─────────────────────────────────────────────────────────────────────────────
//  CATÁLOGO DE MODELOS  —  /api/v1/catalog
// ─────────────────────────────────────────────────────────────────────────────
@ApiTags('Catálogo')
@Controller('catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CatalogController {

  constructor(private readonly svc: MachinesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar modelos do catálogo (RF-CAT03)' })
  listar(@TenantId() tenantId: string) {
    return this.svc.listarModelos(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um modelo' })
  @ApiParam({ name: 'id', description: 'UUID do modelo' })
  buscar(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.buscarModelo(tenantId, id);
  }

  @Post()
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Cadastrar modelo no catálogo (RF-CAT01)' })
  @ApiResponse({ status: 201, description: 'Modelo criado' })
  criar(@TenantId() tenantId: string, @Body() dto: CriarModeloDto) {
    return this.svc.criarModelo(tenantId, dto);
  }

  @Patch(':id')
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Atualizar modelo do catálogo' })
  atualizar(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AtualizarModeloDto,
  ) {
    return this.svc.atualizarModelo(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(PERFIS.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir (ou desativar) modelo do catálogo' })
  excluir(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.excluirModelo(tenantId, id);
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Exportar catálogo em PDF formatado (RF-CAT04)' })
  async exportarPdf(
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.svc.exportarCatalogoPdf(tenantId);
    // HTML imprimivel — browser converte para PDF via Ctrl+P (sem pdfkit)
    res.set({
      'Content-Type':        'text/html; charset=utf-8',
      'Content-Disposition': 'inline; filename="catalogo-maquinas.html"',
      'Content-Length':      buffer.length,
    });
    res.end(buffer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MÁQUINAS (PATRIMÔNIO)  —  /api/v1/machines
// ─────────────────────────────────────────────────────────────────────────────
@ApiTags('Máquinas')
@Controller('machines')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MachinesController {

  constructor(private readonly svc: MachinesService) {}

  // ── Frota ─────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar frota com filtros (RF-M03)' })
  @ApiQuery({ name: 'situacao',   required: false })
  @ApiQuery({ name: 'patrimonio', required: false })
  @ApiQuery({ name: 'cliente_id', required: false })
  listar(@TenantId() tenantId: string, @Query() filtros: FiltrosMaquinaDto) {
    return this.svc.listarMaquinas(tenantId, filtros);
  }

  @Get('resumo-frota')
  @ApiOperation({ summary: 'Totais por situação (para cards do dashboard)' })
  resumoFrota(@TenantId() tenantId: string) {
    return this.svc.resumoFrota(tenantId);
  }

  @Get('na-base')
  @ApiOperation({ summary: 'Máquinas na base com dias de permanência (RF-M06)' })
  naBase(@TenantId() tenantId: string) {
    return this.svc.maquinasNaBase(tenantId);
  }

  @Get('fora-da-base')
  @ApiOperation({ summary: 'Máquinas fora da base com dias em aberto (RF-M05/RF-M07)' })
  foraDaBase(@TenantId() tenantId: string) {
    return this.svc.maquinasForaDaBase(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ficha completa da máquina com histórico (RF-M09)' })
  @ApiParam({ name: 'id', description: 'UUID da máquina' })
  buscar(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.buscarMaquinaCompleta(tenantId, id);
  }

  @Post()
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Cadastrar nova máquina (RF-M01)' })
  @ApiResponse({ status: 201, description: 'Máquina cadastrada' })
  criar(@TenantId() tenantId: string, @Body() dto: CriarMaquinaDto) {
    return this.svc.criarMaquina(tenantId, dto);
  }

  @Patch(':id')
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Atualizar dados patrimoniais (RF-M01/RF-M02)' })
  atualizar(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AtualizarMaquinaDto,
  ) {
    return this.svc.atualizarMaquina(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(PERFIS.ADMIN)
  @ApiOperation({ summary: 'Excluir máquina (desativa se houver histórico de movimentações)' })
  @ApiParam({ name: 'id', description: 'UUID da máquina' })
  excluir(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.excluirMaquina(tenantId, id);
  }

  // ── Saída ─────────────────────────────────────────────────────

  @Post(':id/departure')
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Registrar saída da base (UC-02)' })
  @ApiParam({ name: 'id', description: 'UUID da máquina' })
  registrarSaida(
    @TenantId() tenantId: string,
    @Param('id') maquinaId: string,
    @Body() dto: RegistrarSaidaDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.registrarSaida(tenantId, maquinaId, dto, user.userId);
  }

  // ── Retorno ───────────────────────────────────────────────────

  @Post('movements/:movId/return')
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Registrar retorno à base (UC-03)' })
  @ApiParam({ name: 'movId', description: 'UUID da movimentação em aberto' })
  registrarRetorno(
    @TenantId() tenantId: string,
    @Param('movId') movId: string,
    @Body() dto: RegistrarRetornoDto,
  ) {
    return this.svc.registrarRetorno(tenantId, movId, dto);
  }

  // ── Histórico de movimentações ────────────────────────────────

  @Get(':id/movements')
  @ApiOperation({ summary: 'Histórico de movimentações da máquina (RF-M09)' })
  @ApiParam({ name: 'id', description: 'UUID da máquina' })
  historico(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() filtros: FiltrosMovimentacaoDto,
  ) {
    return this.svc.listarMovimentacoes(tenantId, { ...filtros, maquina_id: id });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MOVIMENTAÇÕES  —  /api/v1/movements  (listagem geral com filtros)
// ─────────────────────────────────────────────────────────────────────────────
@ApiTags('Máquinas')
@Controller('movements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MovementsController {

  constructor(private readonly svc: MachinesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as movimentações com filtros (RF-M10)' })
  @ApiQuery({ name: 'maquina_id',  required: false })
  @ApiQuery({ name: 'em_aberto',   required: false })
  @ApiQuery({ name: 'data_inicio', required: false })
  @ApiQuery({ name: 'data_fim',    required: false })
  listar(@TenantId() tenantId: string, @Query() filtros: FiltrosMovimentacaoDto) {
    return this.svc.listarMovimentacoes(tenantId, filtros);
  }
}
