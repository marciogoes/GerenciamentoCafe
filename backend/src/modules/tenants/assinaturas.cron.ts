import { Injectable, Logger } from '@nestjs/common';
import { Cron }               from '@nestjs/schedule';
import { InjectRepository }   from '@nestjs/typeorm';
import { Repository }         from 'typeorm';

import { AssinaturaTenant }   from './entities/assinatura-tenant.entity';
import { AssinaturasService } from './assinaturas.service';

/**
 * ERR-24 — cron da cobranca do SaaS (modelo manual).
 *
 * 1) Todo dia 01, gera a cobranca do mes para cada assinatura ativa.
 * 2) Todo dia, marca como inadimplente quem tem cobranca vencida em aberto.
 *
 * Nao envia e-mail nem cobra automaticamente: o super admin ve a lista de
 * cobrancas em aberto e cobra por fora. Quando entrar um gateway, e aqui que
 * a chamada externa passa a ser feita.
 */
@Injectable()
export class AssinaturasCronService {

  private readonly logger = new Logger(AssinaturasCronService.name);

  constructor(
    @InjectRepository(AssinaturaTenant)
    private assinaturaRepo: Repository<AssinaturaTenant>,
    private assinaturas: AssinaturasService,
  ) {}

  // ── Gera as cobrancas do mes — dia 01, 06h05 ─────────────────
  @Cron('5 6 1 * *', { name: 'gerar-cobrancas-assinatura', timeZone: 'America/Belem' })
  async gerarCobrancasDoMes() {
    this.logger.log('Gerando cobranças de assinatura do mês...');

    const ativas = await this.assinaturaRepo.find({ where: { status: 'ativo' } });
    let geradas = 0;

    for (const a of ativas) {
      try {
        await this.assinaturas.gerarCobranca(a.tenant_id);
        geradas++;
      } catch (e: any) {
        this.logger.error(`Falha ao gerar cobrança do tenant ${a.tenant_id}: ${e.message}`);
      }
    }

    this.logger.log(`${geradas} cobrança(s) gerada(s) de ${ativas.length} assinatura(s) ativa(s).`);
  }

  // ── Reavalia inadimplencia — todo dia as 07h00 ───────────────
  @Cron('0 7 * * *', { name: 'inadimplencia-assinatura', timeZone: 'America/Belem' })
  async marcarInadimplentes() {
    try {
      const { marcados } = await this.assinaturas.atualizarInadimplencia();
      if (marcados > 0) {
        this.logger.warn(`${marcados} tenant(s) marcado(s) como inadimplente.`);
      }
    } catch (e: any) {
      this.logger.error(`Falha ao reavaliar inadimplência: ${e.message}`);
    }
  }
}
