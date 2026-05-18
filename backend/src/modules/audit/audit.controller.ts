import {
  Controller, Get, Query, UseGuards, Req,
} from '@nestjs/common';
import { AuditService }  from './audit.service';
import { JwtAuthGuard }  from '../../common/guards/auth.guards';
import { RolesGuard, Roles } from '../../common/guards/auth.guards';
import { PERFIS }        from '../../common/guards/auth.guards';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PERFIS.ADMIN, PERFIS.SUPER_ADMIN)
export class AuditController {

  constructor(private readonly auditService: AuditService) {}

  @Get()
  listar(
    @Req() req: any,
    @Query('modulo')     modulo?: string,
    @Query('acao')       acao?: string,
    @Query('usuario_id') usuarioId?: string,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim')   dataFim?: string,
    @Query('pagina')     pagina?: string,
    @Query('por_pagina') porPagina?: string,
  ) {
    return this.auditService.listar(req.user.tenantId, {
      modulo,
      acao,
      usuarioId,
      dataInicio,
      dataFim,
      pagina:    pagina    ? parseInt(pagina, 10)    : 1,
      porPagina: porPagina ? parseInt(porPagina, 10) : 50,
    });
  }

  @Get('modulos')
  modulos(@Req() req: any) {
    return this.auditService.listarModulos(req.user.tenantId);
  }
}
