import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
} from 'typeorm';

/**
 * ERR-03 CORRIGIDO: Tabela associativa N:N entre Contrato e Máquina.
 * Substitui o campo maquina_id (1:1) do Contrato por uma relação N:N real,
 * permitindo que um contrato tenha múltiplas máquinas (RF-C02).
 */
@Entity('contrato_maquinas')
export class ContratoMaquinas {

  @PrimaryColumn({ name: 'contrato_id', type: 'char', length: 36 })
  contrato_id: string;

  @PrimaryColumn({ name: 'maquina_id', type: 'char', length: 36 })
  maquina_id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  /** Data em que a máquina foi vinculada ao contrato */
  @Column({ name: 'data_inclusao', type: 'date' })
  data_inclusao: string;

  /** false = máquina removida do contrato (histórico preservado) */
  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;
}
