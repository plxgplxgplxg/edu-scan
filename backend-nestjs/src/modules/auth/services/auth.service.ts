import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { LoginDto } from '../dto/request/login.dto';
import { RegisterDto } from '../dto/request/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const email = registerDto.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const name = this.buildDefaultName(email);

    try {
      const user = await this.prismaService.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: registerDto.role,
        },
      });

      return this.generateTokens(
        user.id,
        user.email,
        user.role,
        user.name,
        user.studentCode,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email is already registered');
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: loginDto.email },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Can not find user or user is not active!',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect!');
    }
    return this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.name,
      user.studentCode,
    );
  }

  async refreshToken(userId: string, email: string, role: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Can not find user or user is not active!',
      );
    }
    return this.generateTokens(
      userId,
      email,
      role,
      user.name,
      user.studentCode,
    );
  }

  async generateTokens(
    userId: string,
    email: string,
    role: string,
    name: string,
    studentCode: string | null,
  ) {
    const payload = { sub: userId, email, role };
    const accessSecret = this.configService.getOrThrow<string>('jwt.secret');
    const accessExpiresIn =
      this.configService.getOrThrow<JwtSignOptions['expiresIn']>(
        'jwt.expiresIn',
      );
    const refreshSecret =
      this.configService.getOrThrow<string>('jwt.refreshSecret');
    const refreshExpiresIn = this.configService.getOrThrow<
      JwtSignOptions['expiresIn']
    >('jwt.refreshExpiresIn');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);
    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
        role,
        name,
        studentCode,
      },
    };
  }

  private buildDefaultName(email: string) {
    const localPart = email.split('@')[0] || 'Student';
    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
