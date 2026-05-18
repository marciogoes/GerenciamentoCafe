import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * ERR-19 CORRIGIDO: Entidade ausente no modelo de dados.
 * Suporta os 7 recursos de white-label do plano Enterprise (UC-10).
 * Sem esta entidade, nenhuma personalização de marca podia ser persistida.
 */
@Entity('tenant_whitelabel')
export class TenantWhitelabel {

  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  /** FK para tenant.id — relação 1:1 */
  @Column({ name: 'tenant_id', type: 'char', length: 36, unique: true })
  tenant_id: string;

  /** Substitui 'Vending Manager' em toda a interface */
  @Column({ name: 'nome_sistema', length: 150, nullable: true })
  nome_sistema: string | null;

  /** URL do logotipo (PNG/SVG com fundo transparente) */
  @Column({ name: 'logo_url', length: 500, nullable: true })
  logo_url: string | null;

  /** URL do favicon personalizado */
  @Column({ name: 'favicon_url', length: 500, nullable: true })
  favicon_url: string | null;

  /** Cor principal em HEX, ex.: #2E86AB */
  @Column({ name: 'cor_primaria', type: 'char', length: 7, nullable: true })
  cor_primaria: string | null;

  /** Cor secundária em HEX */
  @Column({ name: 'cor_secundaria', type: 'char', length: 7, nullable: true })
  cor_secundaria: string | null;

  /** Template HTML de e-mail com logo e assinatura da empresa */
  @Column({ name: 'email_template', type: 'text', nullable: true })
  email_template: string | null;

  /** Conteúdo do cabeçalho em relatórios PDF exportados */
  @Column({ name: 'pdf_cabecalho', type: 'text', nullable: true })
  pdf_cabecalho: string | null;

  /** Conteúdo do rodapé em relatórios PDF exportados */
  @Column({ name: 'pdf_rodape', type: 'text', nullable: true })
  pdf_rodape: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
