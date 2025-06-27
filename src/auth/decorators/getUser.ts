import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '../interface/user.interface';

export const GetSessionUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    const user = request.user as User;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (data) {
      return user?.[data];
    }

    return user;
  },
);
