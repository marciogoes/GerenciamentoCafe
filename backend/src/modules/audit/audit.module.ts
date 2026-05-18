import { Global, Module }  from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { LogAuditoria }   from './audit-log.entity';
import { AuditService }   from './audit.service';
import { AuditController } from './audit.controller';

/**
 * @Global() — Exporta AuditService globalmente.
 * Qualquer módulo pode injetar AuditService sem importar AuditModule.
 */
@Global()
@Module({
  imports:     [TypeOrmModule.forFeature([LogAuditoria])],
  providers:   [AuditService],
  controllers: [AuditController],
  exports:     [AuditService],
})
export class AuditModule {}
