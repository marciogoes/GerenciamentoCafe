import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type SituacaoMaquina =
  | 'apta'
  | 'em_locacao'
  | 'manutencao'
  | 'evento'
  | 'nao_localizada'
  | 'desativada';

@Entity('maquina')
export class Maquina {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'char', length: 36 })
  tenant_id: string;

  /** Código patrimonial — ex: BC160 */
  @Column({ length: 20 })
  patrimonio: string;

  /** FK para modelo_catalogo.id */
  @Column({ name: 'modelo_id', type: 'char', length: 36, nullable: true })
  modelo_id: string | null;

  @Column({ name: 'numero_serie', length: 50, nullable: true })
  numero_serie: string | null;

  @Column({ name: 'nota_fiscal', length: 50, nullable: true })
  nota_fiscal: string | null;

  @Column({ length: 200, nullable: true })
  fornecedor: string | null;

  @Column({ name: 'valor_aquisicao', type: 'decimal', precision: 12, scale: 2, nullable: true })
  valor_aquisicao: number | null;

  @Column({ name: 'data_registro', type: 'date', nullable: true })
  data_registro: string | null;

  @Column({
    type: 'enum',
    enum: ['apta', 'em_locacao', 'manutencao', 'evento', 'nao_localizada', 'desativada'],
    default: 'apta',
  })
  situacao: SituacaoMaquina;

  @Column({ name: 'localizacao_atual', length: 500, nullable: true })
  localizacao_atual: string | null;

  // ERR-04 CORRIGIDO: contrato_ativo_id removido — causava referência circular bidirecional
  // com Contrato.maquina_id. O contrato ativo é derivado via query na tabela contrato
  // (situacao='ativo' + tabela contrato_maquinas.maquina_id). Não armazenar como campo.

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
