import { AggregateRoot, EntityProps } from 'shared'
import { DisplayName } from './display-name'
import { Email } from './email'
import { PasswordHash } from './password-hash'
import { UserRole, toUserRole } from './user-role'

export interface UserProps extends EntityProps {
  email?: string
  // The stored HASH (never plaintext). Optional: a projection without the
  // secret reconstitutes the User without it.
  password?: string
  name?: string | null
  active?: boolean
  /** Read through `toUserRole`, so an unknown value in the column degrades to
   * the ordinary user instead of failing the whole reconstitution. */
  role?: string | null
}

/**
 * Rich identity entity. Aggregates the value objects (Email, PasswordHash,
 * DisplayName); the constructor builds/validates them, so an invalid User
 * cannot exist. `active` defaults to true.
 *
 * The constructor is used both to CREATE and to RECONSTITUTE a database row,
 * which is why it never records a domain event — the creation fact
 * (`UserRegistered`) is assembled by the use case instead.
 */
export class User extends AggregateRoot<User, UserProps> {
  readonly email: Email
  readonly password?: PasswordHash
  name: string | null
  active: boolean
  role: UserRole

  constructor(props: UserProps) {
    super(props)
    this.email = new Email(props.email)
    if (props.password) this.password = new PasswordHash(props.password)
    this.name = new DisplayName(props.name ?? undefined).value || null
    this.active = props.active ?? true
    this.role = toUserRole(props.role)
  }

  get isAdmin(): boolean {
    return this.role === 'admin'
  }

  /**
   * Promotes or demotes. Read through `toUserRole`, so an unknown value coming
   * from anywhere degrades to the ordinary user instead of handing out admin.
   *
   * It used to be a hand-run UPDATE and is now a button, which changes nothing
   * about how rare the act is — what it changes is that the person doing it can
   * see who already has it.
   */
  changeRole(role?: string | null): void {
    this.role = toUserRole(role)
  }

  /** Display-only edit — never touches email/password. */
  editProfile(fields: { name?: string | null }): void {
    if (fields.name !== undefined) this.name = new DisplayName(fields.name ?? undefined).value || null
  }

  /** Projection of the same identity without the secret (for handing outward). */
  withoutPassword(): User {
    return this.clone({ password: undefined })
  }

  /**
   * Closes the door without erasing anything: the identity stays, the audios
   * stay, and the person can no longer authenticate. It is NOT what the profile
   * screen offers — that one ERASES (LGPD). This is what an administrator does
   * to somebody else, and the two must never be the same path.
   */
  deactivate(): void {
    this.active = false
  }

  /** Opens it again. Deactivating is not a punishment that has to be permanent —
   * and an account that cannot be reactivated would push an admin towards
   * deleting instead, which destroys data. */
  reactivate(): void {
    this.active = true
  }
}
