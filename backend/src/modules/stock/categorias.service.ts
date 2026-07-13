import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 }     from 'uuid';

import { CategoriaInsumo } from './entities/categoria-insumo.entity';
import { Produto }         from './entities/produto.entity';

/**
 * ERR-14 — categorias de insumo por tenant.
 *
 * O ERR-14 trocou o ENUM fixo de cafe (cappuccino, chocolate, cafe_graos...)
 * por uma tabela configuravel, para o SaaS servir qualquer nicho de vending.
 * Mas so o schema mudou: a entity CategoriaInsumo nunca foi registrada em
 * nenhum module, o DTO continuou exigindo o ENUM antigo e o service gravava
 * categoria_id: null em todo produto. Resultado: categoria_insumo vazia,
 * categoria_id NULL em 100% dos produtos, e um SaaS que so sabe vender cafe.
 */
@Injectable()
export class CategoriasService {

  constructor(
    @InjectRepository(CategoriaInsumo)
    private categoriaRepo: Repository<CategoriaInsumo>,

    @InjectRepository(Produto)
    private produtoRepo: Repository<Produto>,

    private ds: DataSource,
  ) {}

  /** Rotulo legivel para os valores do ENUM antigo. */
  private static readonly LABEL_LEGADO: Record<string, string> = {
    cappuccino:  'Cappuccino',
    chocolate:   'Chocolate',
    cafe_graos:  'Café em Grãos',
    cafe_leite:  'Café com Leite',
    descartavel: 'Descartáveis',
    outros:      'Outros',
  };

  async listar(tenantId: string, incluirInativas = false): Promise<any[]> {
    const where: any = { tenant_id: tenantId };
    if (!incluirInativas) where.ativo = true;

    const categorias = await this.categoriaRepo.find({
      where,
      order: { ordem: 'ASC', nome: 'ASC' },
    });

    // Quantos produtos usam cada categoria — evita apagar categoria em uso sem saber
    const contagem = await this.ds.query(
      `SELECT categoria_id, COUNT(*) AS n
         FROM produto
        WHERE tenant_id = ? AND categoria_id IS NOT NULL
        GROUP BY categoria_id`,
      [tenantId],
    );
    const mapa = new Map<string, number>(
      contagem.map((r: any) => [r.categoria_id, Number(r.n)]),
    );

    return categorias.map(c => ({ ...c, produtos: mapa.get(c.id) ?? 0 }));
  }

  async criar(tenantId: string, dto: { nome: string; ordem?: number }): Promise<CategoriaInsumo> {
    const nome = dto.nome.trim();
    if (!nome) throw new BadRequestException('Nome da categoria é obrigatório.');

    const existe = await this.categoriaRepo.findOne({
      where: { tenant_id: tenantId, nome },
    });
    if (existe) throw new ConflictException(`Já existe a categoria "${nome}".`);

    return this.categoriaRepo.save(this.categoriaRepo.create({
      id:        uuidv4(),
      tenant_id: tenantId,
      nome,
      ordem:     dto.ordem ?? 0,
      ativo:     true,
    }));
  }

  async atualizar(
    tenantId: string,
    id: string,
    dto: { nome?: string; ordem?: number; ativo?: boolean },
  ): Promise<CategoriaInsumo> {
    const c = await this.categoriaRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!c) throw new NotFoundException('Categoria não encontrada.');

    if (dto.nome !== undefined)  c.nome  = dto.nome.trim();
    if (dto.ordem !== undefined) c.ordem = dto.ordem;
    if (dto.ativo !== undefined) c.ativo = dto.ativo;

    return this.categoriaRepo.save(c);
  }

  /**
   * Desativa em vez de deletar quando ha produtos usando a categoria — deletar
   * deixaria os produtos apontando para um id que nao existe mais.
   */
  async remover(tenantId: string, id: string): Promise<{ removida: boolean; mensagem: string }> {
    const c = await this.categoriaRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!c) throw new NotFoundException('Categoria não encontrada.');

    const [{ n }] = await this.ds.query(
      'SELECT COUNT(*) AS n FROM produto WHERE tenant_id = ? AND categoria_id = ?',
      [tenantId, id],
    );

    if (Number(n) > 0) {
      c.ativo = false;
      await this.categoriaRepo.save(c);
      return {
        removida:  false,
        mensagem:  `Categoria desativada — ${n} produto(s) ainda a utilizam.`,
      };
    }

    await this.categoriaRepo.remove(c);
    return { removida: true, mensagem: 'Categoria removida.' };
  }

  /**
   * Migra o ENUM antigo para a tabela: cria uma categoria para cada valor
   * distinto de produto.categoria_legado e liga os produtos via categoria_id.
   * Idempotente — rodar duas vezes nao duplica nem re-liga.
   */
  async importarLegado(tenantId: string): Promise<{ criadas: number; produtos_ligados: number }> {
    const legados: { categoria_legado: string }[] = await this.ds.query(
      `SELECT DISTINCT categoria_legado
         FROM produto
        WHERE tenant_id = ?
          AND categoria_legado IS NOT NULL
          AND categoria_legado <> ''`,
      [tenantId],
    );

    let criadas = 0;
    let ligados = 0;

    for (const [i, { categoria_legado }] of legados.entries()) {
      const nome = CategoriasService.LABEL_LEGADO[categoria_legado]
        ?? categoria_legado.charAt(0).toUpperCase() + categoria_legado.slice(1);

      let categoria = await this.categoriaRepo.findOne({
        where: { tenant_id: tenantId, nome },
      });

      if (!categoria) {
        categoria = await this.categoriaRepo.save(this.categoriaRepo.create({
          id:        uuidv4(),
          tenant_id: tenantId,
          nome,
          ordem:     i,
          ativo:     true,
        }));
        criadas++;
      }

      const r = await this.ds.query(
        `UPDATE produto
            SET categoria_id = ?
          WHERE tenant_id = ?
            AND categoria_legado = ?
            AND categoria_id IS NULL`,
        [categoria.id, tenantId, categoria_legado],
      );
      ligados += Number(r.affectedRows ?? 0);
    }

    return { criadas, produtos_ligados: ligados };
  }
}
