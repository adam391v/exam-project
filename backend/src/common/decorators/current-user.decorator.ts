import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator lấy thông tin admin user hiện tại từ request
 * Sử dụng: @CurrentUser() user: AdminUser
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
