import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { SetUserAccessInput, UserDTO, UserFacade, UserStatsDTO } from '@auth/adapters'
import { LibraryStatsDTO, RecordingDTO, RecordingFacade } from '@recording/adapters'
import { authenticatedUser } from '../shared/authenticated-user.decorator'
import { PrismaAuthSessionRepository } from '../auth/prisma-auth-session-repository'
import { PrismaUserRepository } from '../auth/prisma-user-repository'
import { PrismaRecordingRepository } from '../recording/prisma-recording-repository'
import { measureUploads, UploadsUsage } from '../upload/uploads-usage'
import { AdminGuard } from './admin.guard'

/** One row of the users table: the account, plus how much of the library it
 * uses. Composed HERE because it spans two contexts — `auth` knows nothing about
 * audio and `recording` knows nothing about accounts. */
export interface AdminUserRow {
  user: UserDTO
  recordings: number
  storageBytes: number
}

export interface AdminOverview {
  users: UserStatsDTO
  library: LibraryStatsDTO
  /** What the ROWS add up to versus what is really on disk — the gap between
   * them is what the janitor sweeps. */
  disk: UploadsUsage
  failed: RecordingDTO[]
}

/**
 * The administrator's screen: who is using this installation, how much disk it
 * is taking, and what has been failing.
 *
 * Everything here reads ACROSS owners, which nothing else in this app does — so
 * it is one controller, behind one guard, calling use cases that say "system" in
 * their names. Keeping those reads separate from the owner-scoped ones is what
 * stops an ordinary route from ever falling into one by omitting an argument.
 *
 * This is where promoting somebody stopped being a hand-run UPDATE. What did NOT
 * change: the FIRST admin is still made by hand in the database, because an app
 * that can create its own first administrator is an app anybody can become
 * administrator of.
 */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly sessionRepository: PrismaAuthSessionRepository,
    private readonly recordingRepository: PrismaRecordingRepository,
  ) {}

  private users(): UserFacade {
    return new UserFacade(
      this.userRepository,
      this.userRepository,
      undefined,
      undefined,
      this.sessionRepository,
    )
  }

  private recordings(): RecordingFacade {
    return new RecordingFacade(undefined, this.recordingRepository)
  }

  @Get('overview')
  async overview(): Promise<AdminOverview> {
    const [users, library, disk, failed] = await Promise.all([
      this.users().getUserStats(),
      this.recordings().getLibraryStats(),
      measureUploads(),
      this.recordings().listFailedRecordings(),
    ])

    return { users, library, disk, failed }
  }

  @Get('users')
  async listUsers(
    @Query('q') term?: string,
    @Query('limit') limit?: string,
  ): Promise<AdminUserRow[]> {
    const users = await this.users().listUsers(term, limit ? Number(limit) : undefined)

    // One query for the whole page, not one per row.
    const usage = await this.recordings().getOwnerUsage(users.map((user) => user.id))
    const byOwner = new Map(usage.map((row) => [row.ownerId, row]))

    return users.map((user) => ({
      user,
      recordings: byOwner.get(user.id)?.recordings ?? 0,
      storageBytes: byOwner.get(user.id)?.storageBytes ?? 0,
    }))
  }

  /**
   * Promotes, demotes, deactivates or reactivates somebody ELSE.
   *
   * Never the caller's own account (the use case refuses it): there is no way to
   * get admin back from inside the app, so one click must not be able to lock
   * the only administrator out. Deactivating also drops that person's sessions —
   * otherwise the account keeps working wherever it is already logged in.
   *
   * Deactivating is NOT deleting: everything the person has stays. Erasure is
   * the LGPD path on the profile screen, and it belongs to its owner alone.
   */
  @Patch('users/:id')
  async setAccess(
    @authenticatedUser() actor: UserDTO,
    @Param('id') id: string,
    @Body() input: SetUserAccessInput,
  ) {
    await this.users().setUserAccess(actor.id, id, {
      role: input?.role,
      active: input?.active,
    })
  }
}
