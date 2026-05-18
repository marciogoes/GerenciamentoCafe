import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource }       from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check — verifica status da API e banco de dados' })
  async check() {
    const dbOk = await this.dataSource
      .query('SELECT 1')
      .then(() => true)
      .catch(() => false);

    const status = dbOk ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      version:   process.env.npm_package_version || '1.0.0',
      env:       process.env.APP_ENV || 'development',
      services: {
        database: dbOk ? 'ok' : 'error',
        api:      'ok',
      },
    };
  }
}
