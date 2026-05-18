import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantsService }  from '../tenants/tenants.service';
import { Tenant }          from '../tenants/entities/tenant.entity';
import {
  AtualizarConfiguracaoOperacionalDto,
} from './dto/settings.dto';

@Injectable()
export class SettingsService {

  constructor(private tenantsService: TenantsService) {}

  // ══════════════════════════════════════════════════════════════
  //  OBTER CONFIGURAÇÕES (GET /settings)
  // ══════════════════════════════════════════════════════════════

  async obterConfiguracoes(tenantId: string): Promise<{
    operacional: Partial<Tenant>;
    limites:     Record<string, number>;
  }> {
    const tenant = await this.tenantsService.buscarPorId(tenantId);

    return {
      operacional: {
        nome_exibicao:          tenant.nome_exibicao,
        fuso_horario:           tenant.fuso_horario,
        logo_url:               tenant.logo_url,
        dias_alerta_maquina:    tenant.dias_alerta_maquina,
        tempo_inatividade_min:  tenant.tempo_inatividade_min,
      },
      limites: {
        max_usuarios:  tenant.max_usuarios,
        max_maquinas:  tenant.max_maquinas,
        max_contratos: tenant.max_contratos,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════
  //  ATUALIZAR CONFIGURAÇÕES OPERACIONAIS (PATCH /settings/operacional)
  // ══════════════════════════════════════════════════════════════

  async atualizarOperacional(
    tenantId: string,
    dto: AtualizarConfiguracaoOperacionalDto,
  ): Promise<Tenant> {
    return this.tenantsService.atualizarConfiguracoes(tenantId, dto);
  }
}
