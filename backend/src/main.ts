import { NestFactory }        from '@nestjs/core';
import { ValidationPipe }    from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService }     from '@nestjs/config';
import { AppModule }         from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log','warn','error'] });

  const config  = app.get(ConfigService);
  const env      = config.get('APP_ENV');
  const frontend = config.get('FRONTEND_URL') || 'http://localhost:5173';

  // ── CORS ──────────────────────────────────────────────────────
  // Em dev aceita qualquer porta do localhost (5173, 5174, 5175...)
  // pois o Vite escolhe a próxima disponível automaticamente
  const allowedOrigins = env === 'production'
    ? [frontend]
    : [frontend, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

  app.enableCors({
    origin:      allowedOrigins,
    credentials: true,
    methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  });

  // ── Prefixo global ────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validação automática dos DTOs ────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      transformOptions:     { enableImplicitConversion: true },
    }),
  );

  // ── Swagger (apenas em dev) ───────────────────────────────────
  if (env !== 'production') {
    const swagger = new DocumentBuilder()
      .setTitle('Vending Manager API')
      .setDescription('Sistema SaaS de Gestão de Máquinas de Café — BelCafé')
      .setVersion('2.1')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .addTag('Auth',      'Autenticação e 2FA')
      .addTag('Usuários',  'Gestão de usuários por tenant')
      .addTag('Máquinas',  'Frota e movimentações')
      .addTag('Contratos', 'Clientes, contratos e cobranças')
      .addTag('Estoque',   'Insumos e movimentações de estoque')
      .addTag('Dashboard', 'KPIs e alertas')
      .build();
    const document = SwaggerModule.createDocument(app, swagger);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('APP_PORT') || 3000;
  await app.listen(port);

  console.log('\n┌─────────────────────────────────────────────┐');
  console.log(`│  🚀 API:    http://localhost:${port}/api/v1        │`);
  console.log(`│  📄 Docs:   http://localhost:${port}/docs          │`);
  console.log(`│  🌍 Env:    ${env}                    │`);
  console.log('└─────────────────────────────────────────────┘\n');
}

bootstrap();
