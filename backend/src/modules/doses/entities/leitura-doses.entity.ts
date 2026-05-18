import {
  Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('leitura_doses')
export class LeituraDoses {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ type: 'char', length: 36 })
  tenant_id: string;

  @Column({ type: 'char', length: 36 })
  contrato_id: string;

  @Column({ type: 'char', length: 36, nullable: true })
  maquina_id: string | null;

  @Column({ type: 'char', length: 36 })
  cliente_id: string;

  @Column({ type: 'date' })
  competencia: string;

  @Column({ type: 'int', unsigned: true, default: 0 })
  dose_inicial: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  dose_final: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  total_doses: number;

  @Column({ type: 'tinyint', default: 0 })
  enviado_contratante: boolean;

  @Column({ type: 'date', nullable: true })
  data_envio: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  observacao: string | null;

  @Column({ type: 'char', length: 36, nullable: true })
  usuario_id: string | null;

  @CreateDateColumn()
  criado_em: Date;

  @UpdateDateColumn()
  atualizado_em: Date;
}
