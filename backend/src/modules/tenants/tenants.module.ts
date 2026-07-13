import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { Tenant }              from './entities/tenant.entity';
import { AssinaturaTenant }    from './entities/assinatura-tenant.entity';
import { PagamentoAssinatura } from './entities/pagamento-assinatura.entity';
import { TenantsService }        from './tenants.service';
import { AssinaturasService }    from './assinaturas.service';
import { AssinaturasCronService } from './assinaturas.cron';
import { TenantsController }     from './tenants.controller';
import { UsersModule }         from '../users/users.module';
import { MailModule }          from '../mail/mail.module';

@Module({
  imports: [
    // ERR-24: AssinaturaTenant existia como entity desde a correcao, mas nunca
    // foi registrada aqui — o TypeORM nao a conhecia e a tabela ficou vazia.
    TypeOrmModule.forFeature([Tenant, AssinaturaTenant, PagamentoAssinatura]),
    forwardRef(() => UsersModule),
    MailModule,
  ],
  controllers: [TenantsController],
  providers:   [TenantsService, AssinaturasService, AssinaturasCronService],
  exports:     [TenantsService, AssinaturasService],
})
export class TenantsModule {}
