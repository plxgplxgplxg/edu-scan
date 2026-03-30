import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { PrismaService } from "../../../database/prisma.service";
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'secret',
    });
  }

  async validate(payload: {
    sub: string;
    email: string
  }) {
    const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
        throw new UnauthorizedException('Unauthorized');
    }
    const { passwordHash, ...result} = user;
    return result;
  }
}
