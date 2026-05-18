import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { v4 as uuidv4 }    from 'uuid';
import { LogAuditoria }    from './audit-log.entity';

export interface RegistrarAuditDto {
  tenantId:     string;
  usuarioId?:   string | null;
  usuarioNome?: string | null;
  acao:         string;
  modulo:       string;
  entidadeId?:  string | null;
  descricao?:   string | null;
  ip?:          string | null;
}

export interface FiltrosAuditoria {
  modulo?:     string;
  acao?:       string;
  usuarioId?:  string;
  dataInicio?: string;
  dataFim?:    string;
  pagina?:     number;
  porPagina?:  number;
}

@Injectable()
export class AuditService {

  constructor(
    @InjectRepository(LogAuditoria)
    private repo: Repository<LogAuditoria>,
  ) {}

  /** Registra uma entrada de auditoria. Nunca lança exceção — falha silenciosa. */
  async registrar(dto: RegistrarAuditDto): Promise<void> {
    try {
      const log = this.repo.create({
        id:           uuidv4(),
        tenant_id:    dto.tenantId,
        usuario_id:   dto.usuarioId   ?? null,
        usuario_nome: dto.usuarioNome ?? null,
        acao:         dto.acao,
        modulo:       dto.modulo,
        entidade_id:  dto.entidadeId  ?? null,
        descricao:    dto.descricao   ?? null,
        ip:           dto.ip          ?? null,
      });
      await this.repo.save(log);
    } catch {
      // Log de auditoria nunca deve derrubar a operação principal
    }
  }

  /** Lista logs paginados com filtros (somente para o tenant autenticado). */
  async listar(tenantId: string, filtros: FiltrosAuditoria) {
    const pagina    = Math.max(1, filtros.pagina    ?? 1);
    const porPagina = Math.min(100, filtros.porPagina ?? 50);
    const offset    = (pagina - 1) * porPagina;

    const qb = this.repo
      .createQueryBuilder('la')
      .where('la.tenant_id = :tenantId', { tenantId })
      .orderBy('la.criado_em', 'DESC')
      .skip(offset)
      .take(porPagina);

    if (filtros.modulo)     qb.andWhere('la.modulo = :modulo',           { modulo:     filtros.modulo });
    if (filtros.acao)       qb.andWhere('la.acao LIKE :acao',            { acao:       `%${filtros.acao}%` });
    if (filtros.usuarioId)  qb.andWhere('la.usuario_id = :usuarioId',    { usuarioId:  filtros.usuarioId });
    if (filtros.dataInicio) qb.andWhere('la.criado_em >= :dataInicio',   { dataInicio: filtros.dataInicio });
    if (filtros.dataFim)    qb.andWhere('la.criado_em <= :dataFim',      { dataFim:    `${filtros.dataFim} 23:59:59` });

    const [itens, total] = await qb.getManyAndCount();

    return {
      itens,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
    };
  }

  /** Lista os módulos distintos do tenant (para popular filtro no front). */
  async listarModulos(tenantId: string): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('la')
      .select('DISTINCT la.modulo', 'modulo')
      .where('la.tenant_id = :tenantId', { tenantId })
      .orderBy('la.modulo', 'ASC')
      .getRawMany();
    return rows.map(r => r.modulo);
  }
}
