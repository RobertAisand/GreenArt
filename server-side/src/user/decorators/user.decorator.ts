import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import { User } from '@prisma/client'

type RequestWithUser = Request & {
	user: User
}

export const CurrentUser = createParamDecorator(
	(data: keyof User | undefined, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest<RequestWithUser>()
		const user = request.user

		return data ? user?.[data] : user
	}
)
