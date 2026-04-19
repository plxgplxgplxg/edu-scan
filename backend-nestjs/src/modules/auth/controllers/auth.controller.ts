import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApiPublicOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { AuthTokensResponseDto } from '../dto/response/auth-response.dto';
import { LoginDto } from '../dto/request/login.dto';
import { RefreshTokenDto } from '../dto/request/refresh-token.dto';
import { AuthService } from '../services/auth.service';

type RefreshRequest = {
  user: {
    id: string;
    email: string;
    role: string;
  };
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiPublicOperation({
    summary: 'Đăng nhập bằng email và mật khẩu',
    notes:
      'Endpoint công khai. Trả về access token JWT Bearer và refresh token để gọi các endpoint cần xác thực.',
  })
  @ApiBody({ type: LoginDto })
  @ApiWrappedOkResponse({
    type: AuthTokensResponseDto,
    description: 'Đăng nhập thành công và trả về bộ token xác thực.',
  })
  @ApiStandardErrorResponses(400, 401, 500)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @ApiPublicOperation({
    summary: 'Làm mới access token bằng refresh token',
    notes:
      'Endpoint này xác thực bằng refresh token trong body request, không dùng Bearer access token ở header Authorization.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiWrappedOkResponse({
    type: AuthTokensResponseDto,
    description: 'Làm mới token thành công và trả về bộ token mới.',
  })
  @ApiUnauthorizedResponse({
    description:
      'Refresh token không hợp lệ, không khớp người dùng hoặc đã hết hạn.',
  })
  @ApiStandardErrorResponses(400, 401, 500)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: RefreshRequest,
  ) {
    void refreshTokenDto;
    return this.authService.refreshToken(
      req.user.id,
      req.user.email,
      req.user.role,
    );
  }
}
