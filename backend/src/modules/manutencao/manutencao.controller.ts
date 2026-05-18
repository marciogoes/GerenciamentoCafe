import {
  Controller, Get, Post, Patch,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';

import {
  JwtAuthGuard, RolesGuard, Roles, TenantId, CurrentUser, PERFIS,
} from '../../common/guards/auth.guards';
import { ManutencaoService }     from './manutencao.service';
import {
  CriarManutencaoDto, AtualizarManutencaoDto,
  FiltrosManutencaoDto, ConcluirManutencaoDto,
} from './dto/manutencao.dto';

@ApiTags('Manutenção')
@Controller('manutencao')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ManutencaoController {
  constructor(private readonly svc: ManutencaoService) {}

  // ── GET /manutencao ──────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Listar chamados de manutenção com filtros' })
  listar(@TenantId() tid: string, @Query() filtros: FiltrosManutencaoDto) {
    return this.svc.listar(tid, filtros);
  }

  // ── GET /manutencao/kpis ─────────────────────────────────────
  @Get('kpis')
  @ApiOperation({ summary: 'KPIs do módulo de manutenção' })
  kpis(@TenantId() tid: string) {
    return this.svc.kpis(tid);
  }

  // ── GET /manutencao/:id ──────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um chamado de manutenção' })
  @ApiParam({ name: 'id', description: 'UUID da manutenção' })
  buscar(@TenantId() tid: string, @Param('id') id: string) {
    return this.svc.buscar(tid, id);
  }

  // ── POST /manutencao ─────────────────────────────────────────
  @Post()
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Abrir novo chamado de manutenção' })
  criar(
    @TenantId() tid: string,
    @Body() dto: CriarManutencaoDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.criar(tid, dto, user.userId);
  }

  // ── PATCH /manutencao/:id ────────────────────────────────────
  @Patch(':id')
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Atualizar dados do chamado' })
  @ApiParam({ name: 'id', description: 'UUID da manutenção' })
  atualizar(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: AtualizarManutencaoDto,
  ) {
    return this.svc.atualizar(tid, id, dto);
  }

  // ── POST /manutencao/:id/iniciar ─────────────────────────────
  @Post(':id/iniciar')
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Iniciar execução do chamado (aberta → em_andamento)' })
  @ApiParam({ name: 'id', description: 'UUID da manutenção' })
  iniciar(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body('data_inicio') dataInicio: string,
  ) {
    const hoje = dataInicio || new Date().toISOString().split('T')[0];
    return this.svc.iniciar(tid, id, hoje);
  }

  // ── POST /manutencao/:id/concluir ────────────────────────────
  @Post(':id/concluir')
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Concluir manutenção, registrar custos e devolver máquina à frota' })
  @ApiParam({ name: 'id', description: 'UUID da manutenção' })
  concluir(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: ConcluirManutencaoDto,
  ) {
    return this.svc.concluir(tid, id, dto);
  }

  // ── POST /manutencao/:id/cancelar ────────────────────────────
  @Post(':id/cancelar')
  @Roles(PERFIS.ADMIN, PERFIS.OPERACIONAL)
  @ApiOperation({ summary: 'Cancelar chamado de manutenção' })
  @ApiParam({ name: 'id', description: 'UUID da manutenção' })
  cancelar(@TenantId() tid: string, @Param('id') id: string) {
    return this.svc.cancelar(tid, id);
  }
}
