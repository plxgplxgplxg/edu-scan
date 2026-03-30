import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/prisma.service';
import { LoginDto } from '../dto/login.dto';


@Injectable()
export class AuthService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async login(loginDto: LoginDto) {
        const user = await this.prismaService.user.findUnique({
            where: { email: loginDto.email },
        });
        if (!user || !user.isActive) {
            throw new UnauthorizedException('Can not find user or user is not active!');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Password is incorrect!');
        }
        return this.generateTokens(user.id, user.email, user.role);
        
    }

    async refreshToken(userId: string, email: string, role: string) {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
        });
        if (!user || !user.isActive ) {
            throw new UnauthorizedException('Can not find user or user is not active!');
        }
        return this.generateTokens(userId, email, role);
    }

    async generateTokens(userId: string, email: string, role: string) {
        const payload = { sub: userId, email, role };
        const accessSecret = this.configService.getOrThrow<string>('jwt.secret');
        const accessExpiresIn = this.configService.getOrThrow<JwtSignOptions['expiresIn']>('jwt.expiresIn');
        const refreshSecret = this.configService.getOrThrow<string>('jwt.refreshSecret');
        const refreshExpiresIn = this.configService.getOrThrow<JwtSignOptions['expiresIn']>('jwt.refreshExpiresIn');

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: accessSecret,
                expiresIn: accessExpiresIn,
            }) ,
            this.jwtService.signAsync(payload, {
                secret: refreshSecret,
                expiresIn: refreshExpiresIn,
            }),
        ]);
        return { accessToken, refreshToken, user: {
            id: userId,
            email, 
            role
        }}
    }
}
