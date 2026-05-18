import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('reajuste_contratual')
export class ReajusteContratual {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({ name: 'contrato_id', type: 'char', length: 36 })
  contrato_id: string;

  /** Ex.: IPCA, IGP-M, fixo */
  @Column({ length: 20 })
  indice: string;

  /** Percentual aplicado: ex. 5.76 = 5,76% */
  @Column({ type: 'decimal', precision: 8, scale: 4 })
  percentual: number;

  @Column({ name: 'valor_anterior', type: 'decimal', precision: 12, scale: 2 })
  valor_anterior: number;

  @Column({ name: 'valor_novo', type: 'decimal', precision: 12, scale: 2 })
  valor_novo: number;

  /** Data a partir da qual o novo valor vale (RN-F13: >= hoje) */
  @Column({ name: 'data_vigencia', type: 'date' })
  data_vigencia: string;

  /** FK para o usuário que aplicou o reajuste */
  @Column({ name: 'usuario_id', type: 'char', length: 36 })
  usuario_id: string;

  /** Registro imutável — sem UpdateDateColumn (RN-F11) */
  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;
}
