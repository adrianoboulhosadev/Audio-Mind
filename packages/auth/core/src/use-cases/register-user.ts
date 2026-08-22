import { UseCase, EventPublisher, ConflictError, Errors } from 'shared'
import { Email, StrongPassword, PasswordHash, User, UserRegistered } from '../model'
import { UserRepository, HashProvider } from '../providers'

interface Input {
  email: string
  password: string
  name?: string | null
}

/**
 * Creates the User (identity). The rules live in the value objects: Email
 * validates/normalizes the address, StrongPassword enforces the policy,
 * DisplayName caps the display name. The use case only orchestrates: build the
 * VOs, dedup, hash and persist.
 *
 * `UserRegistered` is built here directly, not via `AggregateRoot.record` —
 * this is pure CREATION, and `User`'s constructor is also used to RECONSTITUTE
 * existing rows from the database, so it must never raise anything itself.
 */
export default class RegisterUser implements UseCase<Input, void> {
  constructor(
    private readonly repository: UserRepository,
    private readonly hash: HashProvider,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(input: Input): Promise<void> {
    const email = new Email(input.email)
    const password = new StrongPassword(input.password)

    const alreadyExists = await this.repository.findByEmail(email.value)
    if (alreadyExists) ConflictError.throwError(Errors.USER_ALREADY_EXISTS, email.value)

    const passwordHash = new PasswordHash(this.hash.hash(password.value))
    const user = new User({
      email: email.value,
      password: passwordHash.value,
      name: input.name ?? null,
    })

    await this.repository.register(user)
    await this.eventPublisher?.publish([new UserRegistered(user.id.value, email.value)])
  }
}
