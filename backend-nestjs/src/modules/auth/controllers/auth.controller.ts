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
    summary: 'Dang nhap bang email va password',
    notes:
      'Public endpoint. Tra ve access token JWT Bearer va refresh token de su dung cho cac endpoint protected.',
  })
  @ApiBody({ type: LoginDto })
  @ApiWrappedOkResponse({
    type: AuthTokensResponseDto,
    description: 'Dang nhap thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 500)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @ApiPublicOperation({
    summary: 'Lam moi access token bang refresh token',
    notes:
      'Endpoint nay duoc bao ve boi refresh token trong body request, khong su dung Bearer access token.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiWrappedOkResponse({
    type: AuthTokensResponseDto,
    description: 'Lam moi token thanh cong.',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token khong hop le hoac het han.',
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
