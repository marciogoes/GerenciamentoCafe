import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('movimentacao_maquina')
export class MovimentacaoMaquina {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  @Column({ name: 'maquina_id', type: 'char', length: 36 })
  maquina_id: string;

  @Column({ name: 'data_saida', type: 'date' })
  data_saida: string;

  @Column({ name: 'hora_saida', type: 'time', nullable: true })
  hora_saida: string | null;

  /** FK para cliente.id (opcional — evento pode não ter cliente cadastrado) */
  @Column({ name: 'cliente_id', type: 'char', length: 36, nullable: true })
  cliente_id: string | null;

  @Column({ length: 500, nullable: true })
  local: string | null;

  // ERR-11 CORRIGIDO: contrato_os (VARCHAR ambiguó) separado em dois campos:
  /** FK para contrato.id — contrato interno associado à movimentação (opcional) */
  @Column({ name: 'contrato_id', type: 'char', length: 36, nullable: true })
  contrato_id: string | null;

  /** Número de OS externa (texto livre, ex.: '2024/0345') — opcional */
  @Column({ name: 'os_referencia', length: 50, nullable: true })
  os_referencia: string | null;

  /** FK para usuario.id (quem registrou a saída) */
  @Column({ name: 'responsavel_id', type: 'char', length: 36, nullable: true })
  responsavel_id: string | null;

  @Column({ type: 'text', nullable: true })
  ocorrencia: string | null;

  @Column({ name: 'data_retorno', type: 'date', nullable: true })
  data_retorno: string | null;

  @Column({ name: 'hora_retorno', type: 'time', nullable: true })
  hora_retorno: string | null;

  /** Calculado: DATE_DIFF(data_retorno, data_saida) — preenchido no retorno */
  @Column({ name: 'periodo_dias', type: 'int', nullable: true })
  periodo_dias: number | null;

  @Column({ type: 'text', nullable: true })
  ocorrencia_retorno: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;
}
