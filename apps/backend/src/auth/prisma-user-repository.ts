import { Injectable } from '@nestjs/common'
import { UserRepository, UserQueryRepository, User, UserDTO, toUserRole } from '@auth/adapters'
import { PrismaService } from '../db/prisma.service'

// The columns the read side projects — the password is never among them.
const USER_DTO_SELECT = {
  id: true,
  email: true,
  name: true,
  active: true,
  role: true,
  createdAt: true,
  lastLoginAt: true,
} as const

@Injectable()
export class PrismaUserRepository implements UserRepository, UserQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Reconstitutes the rich entity from a row (via its constructor).
  private reconstitute(row: {
    id: string
    email: string
    password: string
    name: string | null
    active: boolean
    role: string
  }): User {
    return new User({
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      active: row.active,
      role: row.role,
    })
  }

  async register(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id.value,
        email: user.email.value,
        password: user.password!.value,
        name: user.name,
        active: user.active,
        // `role` is NOT written here: registration is open, everyone starts as
        // an ordinary user, and the column's default says so. Promoting is an
        // UPDATE run by hand — the app has no path to it on purpose.
        // createdAt/lastLoginAt are infra: the DB handles them (default/update).
      },
    })
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } })
    return user ? this.reconstitute(user) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    return user ? this.reconstitute(user) : null
  }

  async changePassword(id: string, password: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { password } })
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } })
  }

  async updateProfile(id: string, fields: { name?: string | null }): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: fields })
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { active: false } })
  }

  // Read side (CQRS): plain query projection, never the password.
  async findByIdQuery(id: string): Promise<UserDTO | null> {
    const row = await this.prisma.user.findUnique({ where: { id }, select: USER_DTO_SELECT })
    // `toUserRole` and not a cast: the column is a plain string, so a hand-run
    // UPDATE with a typo must read as an ordinary user, not as an unknown role
    // travelling through the app inside a UserDTO.
    return row ? { ...row, role: toUserRole(row.role) } : null
  }
}
