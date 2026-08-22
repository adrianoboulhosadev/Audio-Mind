import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AuthMiddleware } from '../auth/auth.middleware'
import { DbModule } from '../db/db.module'
import { UserController } from './user.controller'

@Module({
  imports: [DbModule, AuthModule],
  controllers: [UserController],
})
export class UserModule implements NestModule {
  // Applied per CLASS, not by path string: adding a route to the controller
  // cannot accidentally leave it unauthenticated.
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(UserController)
  }
}
