import { Module } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { HealthController } from './health.controller'

/** No AuthMiddleware here on purpose — see the controller. */
@Module({
  imports: [DbModule],
  controllers: [HealthController],
})
export class HealthModule {}
