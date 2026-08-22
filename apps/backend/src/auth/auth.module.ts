import { Module } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { NotificationStoreModule } from '../notification/notification-store.module'
import { AuthController } from './auth.controller'
import { AuthMiddleware } from './auth.middleware'
import { BcryptHashProvider } from './bcrypt-hash-provider'
import { JsonWebTokenProvider } from './jsonwebtoken-jwt-provider'
import { PrismaAuthSessionRepository } from './prisma-auth-session-repository'
import { PrismaUserRepository } from './prisma-user-repository'

@Module({
  imports: [DbModule, NotificationStoreModule],
  controllers: [AuthController],
  providers: [
    PrismaUserRepository,
    PrismaAuthSessionRepository,
    BcryptHashProvider,
    JsonWebTokenProvider,
    AuthMiddleware,
  ],
  exports: [
    PrismaUserRepository,
    PrismaAuthSessionRepository,
    BcryptHashProvider,
    JsonWebTokenProvider,
    AuthMiddleware,
  ],
})
export class AuthModule {}
