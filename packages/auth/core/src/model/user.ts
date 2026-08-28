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
  readonly role: UserRole
  name: string | null
  active: boolean

  constructor(props: UserProps) {
    super(props)
    this.email = new Email(props.email)
    if (props.password) this.password = new PasswordHash(props.password)
    this.name = new DisplayName(props.name ?? undefined).value || null
    this.active = props.active ?? true
    this.role = toUserRole(props.role)
  }

  /** The only thing the role decides today: how big an audio this identity may
   * upload. See AudioFile.allowanceFor. */
  get isAdmin(): boolean {
    return this.role === 'admin'
  }

  /** Display-only edit — never touches email/password. */
  editProfile(fields: { name?: string | null }): void {
    if (fields.name !== undefined) this.name = new DisplayName(fields.name ?? undefined).value || null
  }

  /** Projection of the same identity without the secret (for handing outward). */
  withoutPassword(): User {
    return this.clone({ password: undefined })
  }

  /** Soft-delete transition: the identity stays but can no longer authenticate. */
  deactivate(): void {
    this.active = false
  }
}
