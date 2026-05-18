import {
  IsString, IsNotEmpty, IsIn,
  IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// ── Tipos suportados ────────────────────────────────────────────
export const TIPOS_IMPORTACAO = ['clientes', 'maquinas', 'estoque'] as const;
export type TipoImportacao = typeof TIPOS_IMPORTACAO[number];

// ── Linhas já validadas — enviadas na confirmação ───────────────
export class ConfirmarImportacaoDto {
  @ApiProperty({ enum: TIPOS_IMPORTACAO })
  @IsIn(TIPOS_IMPORTACAO)
  tipo: TipoImportacao;

  @ApiProperty({ description: 'Array de objetos já validados pelo endpoint /validate' })
  @IsArray()
  rows: Record<string, any>[];
}

// ── Tipagem das linhas por tipo (uso interno do service) ─────────
export interface LinhaCliente {
  razao_social:      string;
  cnpj:              string;
  endereco?:         string;
  segmento?:         string;
  contato_nome?:     string;
  contato_email?:    string;
  contato_telefone?: string;
}

export interface LinhaMaquina {
  patrimonio:       string;
  numero_serie?:    string;
  fornecedor?:      string;
  valor_aquisicao?: number;
  data_registro?:   string;
  nota_fiscal?:     string;
}

export interface LinhaEstoque {
  codigo:            string;
  descricao:         string;
  marca?:            string;
  categoria:         string;  // cappuccino | chocolate | cafe_graos | cafe_leite | descartavel | outros
  unidade:           string;
  valor_unitario:    number;
  quantidade_inicial?: number;
  estoque_minimo?:   number;
}
