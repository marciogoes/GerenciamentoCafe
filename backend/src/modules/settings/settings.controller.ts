import {
  Controller, Get, Patch, Body, UseGuards, HttpCode,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard, RolesGuard, Roles, TenantId, PERFIS } from '../../common/guards/auth.guards';
import { SettingsService }  from './settings.service';
import { AtualizarConfiguracaoOperacionalDto } from './dto/settings.dto';

@ApiTags('Configurações')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SettingsController {

  constructor(private readonly svc: SettingsService) {}

  // ── Obter todas as configurações ─────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Obter configurações e limites do tenant (RF-S01)' })
  @ApiResponse({
    status: 200,
    description: 'Retorna configurações operacionais e limites do plano',
  })
  obter(@TenantId() tenantId: string) {
    return this.svc.obterConfiguracoes(tenantId);
  }

  // ── Atualizar configurações operacionais ──────────────────────

  @Patch('operacional')
  @Roles(PERFIS.ADMIN, PERFIS.SUPER_ADMIN)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Atualizar configurações operacionais (RF-S02)',
    description: 'Permite admin alterar nome, logo, fuso horário, dias de alerta e timeout de sessão.',
  })
  atualizarOperacional(
    @TenantId() tenantId: string,
    @Body() dto: AtualizarConfiguracaoOperacionalDto,
  ) {
    return this.svc.atualizarOperacional(tenantId, dto);
  }
}
