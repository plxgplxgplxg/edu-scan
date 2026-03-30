import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { LoginDto } from "../dto/login.dto";
import { AuthGuard } from "@nestjs/passport";
import { RefreshTokenDto } from "../dto/refresh-token.dto";

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @UseGuards(AuthGuard('jwt-refresh'))
    @Post('refresh')
    async refresh(
        @Body() refreshTokenDto: RefreshTokenDto,
        @Req() req: any) {
        return this.authService.refreshToken(req.user.id, req.user.email, req.user.role);
    }
}
