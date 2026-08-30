import { RegisterShareLinkView, ShareLinkRepository } from '@sharing/core'

export default class RegisterShareLinkViewController {
  constructor(private readonly repository: ShareLinkRepository) {}

  async execute(token: string): Promise<void> {
    await new RegisterShareLinkView(this.repository).execute(token)
  }
}
