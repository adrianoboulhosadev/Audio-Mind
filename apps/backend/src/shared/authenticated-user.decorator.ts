import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { RequestWithUser } from '../auth/auth.middleware'

export const authenticatedUser = createParamDecorator((_, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest<RequestWithUser>().user
})
