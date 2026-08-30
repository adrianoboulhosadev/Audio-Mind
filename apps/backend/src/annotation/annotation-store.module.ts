import { Module } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { PrismaAnnotationRepository } from './prisma-annotation-repository'

/**
 * The annotations TABLE on its own, apart from the module that owns the routes —
 * same split as the notification, task and share stores, and for the same
 * reason: the recording module has to erase them, and the routes module needs
 * the recording module back.
 */
@Module({
  imports: [DbModule],
  providers: [PrismaAnnotationRepository],
  exports: [PrismaAnnotationRepository],
})
export class AnnotationStoreModule {}
