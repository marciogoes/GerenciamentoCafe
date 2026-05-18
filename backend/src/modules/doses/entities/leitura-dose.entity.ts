import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * ERR-07 CORRIGIDO: Entidade ausente no modelo de dados.
 * Registra leituras de doses em contratos do tipo comodato (RF-C10).
 * Sem esta entidade, contratos de comodato não tinham suporte funcional.
 */
@Entity('leitura_dose')
export class LeituraDose {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  /** FK para contrato.id — deve ser do tipo comodato */
  @Column({ name: 'contrato_id', type: 'char', length: 36 })
  contrato_id: string;

  /** FK para cliente.id */
  @Column({ name: 'cliente_id', type: 'char', length: 36 })
  cliente_id: string;

  /** FK para maquina.id */
  @Column({ name: 'maquina_id', type: 'char', length: 36 })
  maquina_id: string;

  @Column({ name: 'data_leitura', type: 'date' })
  data_leitura: string;

  /** Contador de doses na leitura anterior (null na primeira leitura) */
  @Column({ name: 'leitura_anterior', type: 'int', nullable: true })
  leitura_anterior: number | null;

  /** Contador de doses atual */
  @Column({ name: 'leitura_atual', type: 'int' })
  leitura_atual: number;

  /** Calculado: leitura_atual - leitura_anterior */
  @Column({ name: 'doses_consumidas', type: 'int' })
  doses_consumidas: number;

  /** Indica se foi enviado ao cliente (RF-C10) */
  @Column({ name: 'enviado_contratante', default: false })
  enviado_contratante: boolean;

  /** FK para usuario.id — usuário que registrou a leitura */
  @Column({ name: 'usuario_id', type: 'char', length: 36 })
  usuario_id: string;

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
