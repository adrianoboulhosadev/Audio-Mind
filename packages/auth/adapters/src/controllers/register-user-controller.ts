import { RegisterUser, UserRepository, HashProvider } from '@auth/core'
import { EventPublisher } from 'shared'
import { RegisterUserInput } from '../@types'

export default class RegisterUserController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashProvider: HashProvider,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(input: RegisterUserInput): Promise<void> {
    await new RegisterUser(this.userRepository, this.hashProvider, this.eventPublisher).execute(input)
  }
}
