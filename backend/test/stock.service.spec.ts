import { Test, TestingModule }      from '@nestjs/testing';
import { getRepositoryToken }        from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource }                from 'typeorm';

import { StockService }         from '../../src/modules/stock/stock.service';
import { Produto }              from '../../src/modules/stock/entities/produto.entity';
import { MovimentacaoEstoque }  from '../../src/modules/stock/entities/movimentacao-estoque.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProduto(overrides: Partial<Produto> = {}): Produto {
  return {
    id:             'prod-uuid-001',
    tenant_id:      'tenant-uuid-001',
    codigo:         'CAFE-001',
    descricao:      'Café Grão 1kg',
    marca:          'BelCafé',
    categoria:      'cafe_graos' as any,
    unidade:        'KG',
    valor_unitario: 50,
    validade:       null,
    estoque_minimo: 2,
    ativo:          true,
    criado_em:      new Date(),
    ...overrides,
  } as Produto;
}

// Cria mocks mínimos para os repositórios TypeORM
function makeRepoMock() {
  return {
    findOne:      jest.fn(),
    find:         jest.fn(),
    create:       jest.fn((e: any) => e),
    save:         jest.fn(async (e: any) => e),
    createQueryBuilder: jest.fn(),
  };
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('StockService', () => {
  let service: StockService;
  let produtoRepo: ReturnType<typeof makeRepoMock>;
  let movRepo:     ReturnType<typeof makeRepoMock>;
  let dataSource:  Partial<DataSource>;

  const TENANT = 'tenant-uuid-001';
  const USER   = 'user-uuid-001';

  beforeEach(async () => {
    produtoRepo = makeRepoMock();
    movRepo     = makeRepoMock();

    // Mock do DataSource para testar transação (BUG-10)
    dataSource = {
      transaction: jest.fn(async (fn: (manager: any) => any) => {
        // manager mock — simula EntityManager dentro da transação
        const manager = {
          createQueryBuilder: jest.fn(),
          create: jest.fn((Entity: any, data: any) => data),
          save:   jest.fn(async (data: any) => data),
        };
        return fn(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: getRepositoryToken(Produto),             useValue: produtoRepo },
        { provide: getRepositoryToken(MovimentacaoEstoque), useValue: movRepo },
        { provide: DataSource,                              useValue: dataSource },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  // ── criarProduto ────────────────────────────────────────────────────────────

  describe('criarProduto()', () => {
    it('deve criar produto com sucesso quando código não existe', async () => {
      produtoRepo.findOne.mockResolvedValue(null); // sem duplicata
      const salvo = makeProduto();
      produtoRepo.save.mockResolvedValue(salvo);

      const dto: any = {
        codigo: 'CAFE-001', descricao: 'Café Grão 1kg',
        categoria: 'cafe_graos', unidade: 'KG', valor_unitario: 50,
      };

      const result = await service.criarProduto(TENANT, dto, USER);
      expect(result).toBeDefined();
      expect(produtoRepo.save).toHaveBeenCalledTimes(1);
    });

    it('deve lançar ConflictException quando código já existe no tenant', async () => {
      produtoRepo.findOne.mockResolvedValue(makeProduto()); // simula duplicata

      const dto: any = { codigo: 'CAFE-001', descricao: 'x', categoria: 'cafe_graos', unidade: 'KG', valor_unitario: 10 };
      await expect(service.criarProduto(TENANT, dto, USER)).rejects.toThrow('já cadastrado');
    });
  });

  // ── registrarEntrada ────────────────────────────────────────────────────────

  describe('registrarEntrada()', () => {
    it('deve registrar entrada e retornar saldo atualizado', async () => {
      produtoRepo.findOne.mockResolvedValue(makeProduto());
      movRepo.save.mockResolvedValue({});

      // Mock de calcularSaldo — retorna 5 kg após entrada
      jest.spyOn(service, 'calcularSaldo').mockResolvedValue(5);

      const dto: any = {
        produto_id: 'prod-uuid-001', data: '2026-03-01',
        quantidade: 5, origem: 'Fornecedor A',
      };

      const result = await service.registrarEntrada(TENANT, dto, USER);
      expect(result.saldo_atual).toBe(5);
      expect(movRepo.save).toHaveBeenCalledTimes(1);
    });

    it('deve lançar NotFoundException para produto inexistente', async () => {
      produtoRepo.findOne.mockResolvedValue(null);

      const dto: any = { produto_id: 'nao-existe', data: '2026-03-01', quantidade: 1 };
      await expect(service.registrarEntrada(TENANT, dto, USER)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException para produto inativo', async () => {
      produtoRepo.findOne.mockResolvedValue(makeProduto({ ativo: false }));

      const dto: any = { produto_id: 'prod-uuid-001', data: '2026-03-01', quantidade: 1 };
      await expect(service.registrarEntrada(TENANT, dto, USER)).rejects.toThrow(BadRequestException);
    });
  });

  // ── registrarSaida (BUG-10) ─────────────────────────────────────────────────

  describe('registrarSaida() — BUG-10 transação com lock', () => {
    /**
     * Monta o manager mock com produto e saldo configuráveis,
     * para simular o que acontece DENTRO da transação com SELECT FOR UPDATE.
     */
    function setupTransactionMock(produto: Produto | null, saldo: number) {
      (dataSource.transaction as jest.Mock).mockImplementationOnce(async (fn: any) => {
        const qbProduto = {
          setLock: jest.fn().mockReturnThis(),
          where:   jest.fn().mockReturnThis(),
          getOne:  jest.fn().mockResolvedValue(produto),
        };
        const qbSaldo = {
          select:    jest.fn().mockReturnThis(),
          where:     jest.fn().mockReturnThis(),
          andWhere:  jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ saldo }),
        };
        const manager = {
          createQueryBuilder: jest.fn()
            .mockReturnValueOnce(qbProduto)   // primeira chamada → produto
            .mockReturnValueOnce(qbSaldo),    // segunda chamada → saldo
          create: jest.fn((_E: any, d: any) => d),
          save:   jest.fn(async (d: any) => d),
        };
        return fn(manager);
      });
    }

    it('deve registrar saída com sucesso dentro de uma transação', async () => {
      const produto = makeProduto({ estoque_minimo: 2 });
      setupTransactionMock(produto, 10); // saldo de 10 kg

      const dto: any = {
        produto_id: 'prod-uuid-001', data: '2026-03-01',
        quantidade: 3, origem: 'Cliente ABC',
      };

      const result = await service.registrarSaida(TENANT, dto, USER);
      expect(result.saldo_anterior).toBe(10);
      expect(result.saldo_atual).toBe(7);
      expect(result.alerta_estoque).toBe(false);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('deve emitir alerta quando saldo cai abaixo do mínimo', async () => {
      const produto = makeProduto({ estoque_minimo: 5 });
      setupTransactionMock(produto, 6); // saldo de 6, mínimo 5

      const dto: any = { produto_id: 'prod-uuid-001', data: '2026-03-01', quantidade: 2, origem: 'X' };
      const result = await service.registrarSaida(TENANT, dto, USER);

      // Novo saldo: 6 - 2 = 4 — abaixo do mínimo (5)
      expect(result.alerta_estoque).toBe(true);
    });

    it('deve bloquear saída quando quantidade > saldo (RN-E02)', async () => {
      const produto = makeProduto();
      setupTransactionMock(produto, 1); // saldo 1 kg

      const dto: any = { produto_id: 'prod-uuid-001', data: '2026-03-01', quantidade: 5, origem: 'X' };
      await expect(service.registrarSaida(TENANT, dto, USER))
        .rejects.toThrow('Saldo insuficiente');
    });

    it('deve bloquear saída para produto inexistente', async () => {
      setupTransactionMock(null, 0); // produto = null

      const dto: any = { produto_id: 'nao-existe', data: '2026-03-01', quantidade: 1 };
      await expect(service.registrarSaida(TENANT, dto, USER)).rejects.toThrow(NotFoundException);
    });

    it('deve usar dataSource.transaction — garantindo o lock (anti-race condition)', async () => {
      const produto = makeProduto();
      setupTransactionMock(produto, 10);

      const dto: any = { produto_id: 'prod-uuid-001', data: '2026-03-01', quantidade: 1, origem: 'X' };
      await service.registrarSaida(TENANT, dto, USER);

      // Verifica que a transação foi usada (não acesso direto ao banco sem lock)
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ── calcularSaldo ────────────────────────────────────────────────────────────

  describe('calcularSaldo()', () => {
    it('deve retornar 0 quando não há movimentações', async () => {
      const qb = {
        select:    jest.fn().mockReturnThis(),
        where:     jest.fn().mockReturnThis(),
        andWhere:  jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ saldo: null }),
      };
      movRepo.createQueryBuilder.mockReturnValue(qb);

      const saldo = await service.calcularSaldo(TENANT, 'prod-001');
      expect(saldo).toBe(0);
    });

    it('deve retornar saldo correto como número', async () => {
      const qb = {
        select:    jest.fn().mockReturnThis(),
        where:     jest.fn().mockReturnThis(),
        andWhere:  jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ saldo: '12.500' }),
      };
      movRepo.createQueryBuilder.mockReturnValue(qb);

      const saldo = await service.calcularSaldo(TENANT, 'prod-001');
      expect(saldo).toBe(12.5);
    });
  });
});
