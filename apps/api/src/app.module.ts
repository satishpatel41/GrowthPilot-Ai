import { Controller, Get, Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { AuditService } from './common/audit.service';
import { config } from './common/config';
import { Public, SessionGuard } from './common/session.guard';
import { DbService } from './db/db.service';
import { TenantsModule } from './tenants/tenants.module';

@Controller('health')
class HealthController {
  constructor(private db: DbService) {}
  @Public() @Get()
  async health() {
    await this.db.pool.query('SELECT 1');
    return { status: 'ok' };
  }
}

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({ useFactory: () => ({ secret: config.jwtSecret, signOptions: { expiresIn: `${config.sessionHours}h` } }) }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule, TenantsModule, AdminModule,
  ],
  controllers: [HealthController],
  providers: [DbService, AuditService, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: SessionGuard }],
  exports: [DbService, AuditService, JwtModule],
})
export class AppModule {}
