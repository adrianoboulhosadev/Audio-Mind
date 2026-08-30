import { Module } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { PrismaShareLinkRepository } from './prisma-share-link-repository'

/**
 * The share_links TABLE on its own, apart from the module that owns the routes.
 *
 * Same split as the notification and task stores: deleting a recording has to
 * kill the links that open it, so the recording module needs this repository —
 * and the routes module needs the recording module back.
 */
@Module({
  imports: [DbModule],
  providers: [PrismaShareLinkRepository],
  exports: [PrismaShareLinkRepository],
})
export class ShareStoreModule {}
