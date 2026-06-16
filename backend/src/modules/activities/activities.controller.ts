import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ActivitiesService }           from './activities.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../../common/guards/auth.guards';
import {
  CriarAtividadeModeloDto,
  AtualizarAtividadeModeloDto,
  GerarExecucoesDto,
  BaixarAtividadeDto,
} from './dto/activities.dto';

@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivitiesController {

  constructor(private readonly svc: ActivitiesService) {}

  // ── Modelos ───────────────────────────────────────────────────

  @Get('modelos')
  @Roles('admin', 'financeiro', 'operacional', 'consulta', 'super_admin')
  listarModelos(@Request() req: any) {
    return this.svc.listarModelos(req.user.tenantId);
  }

  @Get('modelos/todos')
  @Roles('admin', 'super_admin')
  listarTodos(@Request() req: any) {
    return this.svc.listarTodosModelos(req.user.tenantId);
  }

  @Post('modelos')
  @Roles('admin', 'super_admin')
  criar(@Request() req: any, @Body() dto: CriarAtividadeModeloDto) {
    return this.svc.criarModelo(req.user.tenantId, dto);
  }

  @Patch('modelos/:id')
  @Roles('admin', 'super_admin')
  atualizar(@Request() req: any, @Param('id') id: string, @Body() dto: AtualizarAtividadeModeloDto) {
    return this.svc.atualizarModelo(req.user.tenantId, id, dto);
  }

  @Delete('modelos/:id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  excluir(@Request() req: any, @Param('id') id: string) {
    return this.svc.excluirModelo(req.user.tenantId, id);
  }

  // ── Execuções (checklist mensal) ──────────────────────────────

  @Get()
  @Roles('admin', 'financeiro', 'operacional', 'consulta', 'super_admin')
  listar(@Request() req: any, @Query('competencia') competencia?: string) {
    return this.svc.listarExecucoes(req.user.tenantId, competencia);
  }

  @Get('resumo')
  @Roles('admin', 'financeiro', 'operacional', 'consulta', 'super_admin')
  resumo(@Request() req: any, @Query('competencia') competencia?: string) {
    return this.svc.resumoExecucoes(req.user.tenantId, competencia);
  }

  @Post('gerar')
  @Roles('admin', 'financeiro', 'super_admin')
  gerar(@Request() req: any, @Body() dto: GerarExecucoesDto) {
    return this.svc.gerarExecucoes(req.user.tenantId, dto);
  }

  @Post(':id/baixar')
  @Roles('admin', 'financeiro', 'operacional', 'super_admin')
  baixar(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: BaixarAtividadeDto,
  ) {
    return this.svc.baixarAtividade(req.user.tenantId, id, dto, req.user.userId);
  }

  @Post(':id/nao-aplicavel')
  @Roles('admin', 'financeiro', 'super_admin')
  naoAplicavel(@Request() req: any, @Param('id') id: string) {
    return this.svc.marcarNaoAplicavel(req.user.tenantId, id, req.user.userId);
  }

  @Post(':id/reabrir')
  @Roles('admin', 'financeiro', 'super_admin')
  reabrir(@Request() req: any, @Param('id') id: string) {
    return this.svc.reabrirAtividade(req.user.tenantId, id);
  }
}
