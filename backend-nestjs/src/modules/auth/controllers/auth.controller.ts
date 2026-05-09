import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthSwagger } from '../docs/auth.swagger';
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

@AuthSwagger.Controller()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @AuthSwagger.DangNhap()
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @AuthSwagger.LamMoiToken()
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
