import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type TipoContrato     = 'locacao' | 'comodato' | 'evento';
export type SituacaoContrato = 'ativo' | 'encerrado' | 'suspenso';

@Entity('contrato')
export class Contrato {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({ name: 'cliente_id', type: 'char', length: 36 })
  cliente_id: string;

  // ERR-03 CORRIGIDO: maquina_id (relação 1:1) é DEPRECATED.
  // Use a tabela associativa contrato_maquinas (N:N) para vínculos de máquinas.
  // Mantido como nullable por compatibilidade com registros existentes.
  /** @deprecated Use tabela contrato_maquinas para vínculos N:N */
  @Column({ name: 'maquina_id', type: 'char', length: 36, nullable: true })
  maquina_id: string | null;

  @Column({
    type: 'enum',
    enum: ['locacao', 'comodato', 'evento'],
    default: 'locacao',
  })
  tipo: TipoContrato;

  @Column({ name: 'valor_mensal', type: 'decimal', precision: 12, scale: 2 })
  valor_mensal: number;

  @Column({ name: 'data_assinatura', type: 'date' })
  data_assinatura: string;

  @Column({ name: 'data_inicio', type: 'date' })
  data_inicio: string;

  /** null = vigência indeterminada */
  @Column({ name: 'data_fim', type: 'date', nullable: true })
  data_fim: string | null;

  @Column({
    type: 'enum',
    enum: ['ativo', 'encerrado', 'suspenso'],
    default: 'ativo',
  })
  situacao: SituacaoContrato;

  /** Dia do mês para geração do boleto (1–31) */
  @Column({ name: 'dia_vencimento', type: 'smallint' })
  dia_vencimento: number;

  @Column({ name: 'ultimo_reajuste_em', type: 'date', nullable: true })
  ultimo_reajuste_em: string | null;

  /** Ex.: IPCA, IGP-M, fixo */
  @Column({ name: 'indice_reajuste', length: 20, nullable: true })
  indice_reajuste: string | null;

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
