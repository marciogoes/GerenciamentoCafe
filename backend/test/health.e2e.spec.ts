import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication }    from '@nestjs/common';
import * as request            from 'supertest';
import { AppModule }           from '../../src/app.module';

/**
 * Teste E2E do endpoint /api/v1/health
 *
 * Para executar:  npm run test:e2e
 * Requer banco configurado no .env (ou .env.test)
 */
describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health — deve retornar status ok', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(res.body).toMatchObject({
      status:   expect.stringMatching(/^(ok|degraded)$/),
      services: {
        api: 'ok',
      },
    });
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/v1/health — deve incluir campo database', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(res.body.services.database).toBeDefined();
  });
});
