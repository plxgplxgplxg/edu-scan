import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiModuleTag } from '../../../common/swagger/decorators/api-module-tag.decorator';
import { ApiPublicOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { SWAGGER_MODULES_METADATA } from '../../../common/swagger/swagger.metadata';
import { LoginDto } from '../dto/request/login.dto';
import { RefreshTokenDto } from '../dto/request/refresh-token.dto';
import { AuthTokensResponseDto } from '../dto/response/auth-response.dto';

export const AuthSwagger = {
  Controller() {
    return ApiModuleTag(SWAGGER_MODULES_METADATA.auth);
  },
  DangNhap() {
    return applyDecorators(
      ApiPublicOperation({
        summary: 'Đăng nhập bằng email và mật khẩu',
        notes:
          'Endpoint công khai. Trả về Bearer access token JWT và refresh token để gọi các endpoint cần xác thực.',
      }),
      ApiBody({ type: LoginDto }),
      ApiWrappedOkResponse({
        type: AuthTokensResponseDto,
        description: 'Đăng nhập thành công và trả về bộ token xác thực.',
      }),
      ApiStandardErrorResponses(400, 401, 500),
    );
  },
  LamMoiToken() {
    return applyDecorators(
      ApiPublicOperation({
        summary: 'Làm mới access token bằng refresh token',
        notes:
          'Endpoint này xác thực bằng refresh token trong body request, không dùng Bearer access token ở header Authorization.',
      }),
      ApiBody({ type: RefreshTokenDto }),
      ApiWrappedOkResponse({
        type: AuthTokensResponseDto,
        description: 'Làm mới token thành công và trả về bộ token mới.',
      }),
      ApiUnauthorizedResponse({
        description:
          'Refresh token không hợp lệ, không khớp người dùng hoặc đã hết hạn.',
      }),
      ApiStandardErrorResponses(400, 500),
    );
  },
};
