import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionUser } from './auth.types';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser =>
  ctx.switchToHttp().getRequest().user);
