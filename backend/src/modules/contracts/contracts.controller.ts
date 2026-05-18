import {
  Controller, Get, Post, Patch,
  Param, Body, Query, UseGuards, Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';

import {
  JwtAuthGuard, RolesGuard, Roles, TenantId, CurrentUser, PERFIS,
} from '../../common/guards/auth.guards';
import { ContractsService } from './contracts.service';
import {
  CriarClienteDto, AtualizarClienteDto, FiltrosClienteDto,
  CriarContratoDto, AtualizarContratoDto, FiltrosContratoDto,
  GerarLancamentosDto, AtualizarLancamentoDto, RegistrarPagamentoDto, FiltrosLancamentoDto,
  AplicarReajusteDto,
} from './dto/contracts.dto';

// ─────────────────────────────────────────────────────────────────────────────
//  CLIENTES  —  /api/v1/clients
// ─────────────────────────────────────────────────────────────────────────────
@ApiTags('Clientes')
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClientesController {
  constructor(private readonly svc: ContractsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes com filtros (RF-C01)' })
  listar(@TenantId() tid: string, @Query() filtros: FiltrosClienteDto) {
    return this.svc.listarClientes(tid, filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ficha completa do cliente com contratos e lançamentos' })
  buscar(@TenantId() tid: string, @Param('id') id: string) {
    return this.svc.buscarClienteCompleto(tid, id);
  }

  @Post()
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO)
  @ApiOperation({ summary: 'Cadastrar cliente (RF-C01)' })
  criar(@TenantId() tid: string, @Body() dto: CriarClienteDto) {
    return this.svc.criarCliente(tid, dto);
  }

  @Patch(':id')
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO)
  @ApiOperation({ summary: 'Atualizar dados do cliente' })
  atualizar(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: AtualizarClienteDto,
  ) {
    return this.svc.atualizarCliente(tid, id, dto);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONTRATOS  —  /api/v1/contracts
// ─────────────────────────────────────────────────────────────────────────────
@ApiTags('Contratos')
@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContratosController {
  constructor(private readonly svc: ContractsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar contratos com filtros (RF-C02)' })
  listar(@TenantId() tid: string, @Query() filtros: FiltrosContratoDto) {
    return this.svc.listarContratos(tid, filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ficha completa do contrato com reajustes e lançamentos' })
  buscar(@TenantId() tid: string, @Param('id') id: string) {
    return this.svc.buscarContratoCompleto(tid, id);
  }

  @Post()
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO)
  @ApiOperation({ summary: 'Criar novo contrato (RF-C02)' })
  criar(@TenantId() tid: string, @Body() dto: CriarContratoDto) {
    return this.svc.criarContrato(tid, dto);
  }

  @Patch(':id')
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO)
  @ApiOperation({ summary: 'Atualizar contrato (valor, datas, situação)' })
  atualizar(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: AtualizarContratoDto,
  ) {
    return this.svc.atualizarContrato(tid, id, dto);
  }

  // ── Reajuste ──────────────────────────────────────────────────
  @Post(':id/reajuste')
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO)
  @ApiOperation({ summary: 'Aplicar reajuste contratual (UC-09)' })
  @ApiParam({ name: 'id', description: 'UUID do contrato' })
  aplicarReajuste(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: AplicarReajusteDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.aplicarReajuste(tid, id, dto, user.userId);
  }

  @Get(':id/reajustes')
  @ApiOperation({ summary: 'Histórico imutável de reajustes do contrato (RF-C08)' })
  reajustes(@TenantId() tid: string, @Param('id') id: string) {
    return this.svc.listarReajustes(tid, id);
  }

  // ── PDF Contrato de Evento (Sprint 15) ───────────────────────
  @Get('evento/:id/dados')
  @ApiOperation({ summary: 'Retorna dados estruturados para gerar PDF do contrato de evento' })
  @ApiParam({ name: 'id', description: 'UUID do contrato de evento' })
  dadosContratoEvento(@TenantId() tid: string, @Param('id') id: string) {
    return this.svc.getDadosContratoEvento(tid, id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  LANÇAMENTOS / COBRANÇAS  —  /api/v1/invoices
// ─────────────────────────────────────────────────────────────────────────────
@ApiTags('Cobranças')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LancamentosController {
  constructor(private readonly svc: ContractsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar lançamentos com filtros (RF-C05/RF-C06)' })
  listar(@TenantId() tid: string, @Query() filtros: FiltrosLancamentoDto) {
    return this.svc.listarLancamentos(tid, filtros);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Boletos em aberto/vencidos — Relatório de inadimplência (RF-C11)' })
  inadimplencia(@TenantId() tid: string) {
    return this.svc.relatorioInadimplencia(tid);
  }

  @Post('generate')
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO)
  @ApiOperation({ summary: 'Gerar lançamentos mensais (UC-04)' })
  gerar(@TenantId() tid: string, @Body() dto: GerarLancamentosDto) {
    return this.svc.gerarLancamentos(tid, dto, 'manual');
  }

  @Patch(':id')
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO)
  @ApiOperation({ summary: 'Atualizar dados do lançamento (NF, boleto, obs)' })
  atualizar(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: AtualizarLancamentoDto,
  ) {
    return this.svc.atualizarLancamento(tid, id, dto);
  }

  @Post(':id/pay')
  @Roles(PERFIS.ADMIN, PERFIS.FINANCEIRO)
  @ApiOperation({ summary: 'Registrar baixa de pagamento (UC-05)' })
  @ApiParam({ name: 'id', description: 'UUID do lançamento' })
  pagar(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: RegistrarPagamentoDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.registrarPagamento(tid, id, dto, user.userId);
  }
}
