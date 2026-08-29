import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../db/prisma.service'

/**
 * Is this process actually able to do its job?
 *
 * A container that is UP is not the same as an API that works: a backend that
 * lost Postgres answers every request with a 500 while docker keeps reporting it
 * as running. So the check touches the database — the one dependency without
 * which nothing here means anything — and lets the failure propagate, because a
 * healthcheck reads the status code, not a body that says "degraded" with a 200.
 *
 * Its own controller, so it is NOT behind the AuthMiddleware (which is applied
 * per class): docker has no token, and there is nothing private in an answer
 * that says the process is alive.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: string; uptimeSeconds: number }> {
    // The cheapest query that proves the connection AND the schema: it touches
    // a real table and reads one column, without counting anything.
    await this.prisma.user.findFirst({ select: { id: true } })

    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) }
  }
}
