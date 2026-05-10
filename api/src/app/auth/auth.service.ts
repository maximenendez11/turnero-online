import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { JwtSignOptions } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  email: string;
  role: Role;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Este email ya está registrado');
    }
    const passwordHash = bcrypt.hashSync(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: passwordHash, role: 'USER' },
      select: { id: true, email: true, role: true },
    });
    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const ok = bcrypt.compareSync(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const accessSecret = this.accessSecret();
    const refreshSecret = this.refreshSecret();
    try {
      const payload = this.jwt.verify<{ sub: string; typ?: string }>(refreshToken, {
        secret: refreshSecret,
      });
      if (payload.typ !== 'refresh') {
        throw new UnauthorizedException('Token inválido');
      }
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, email: true, role: true },
      });
      if (!user) {
        throw new UnauthorizedException('Sesión inválida');
      }
      return this.issueTokens(user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  private accessSecret(): string {
    return this.config.get<string>('jwt.secret') ?? 'solo-desarrollo-definir-JWT_SECRET';
  }

  private refreshSecret(): string {
    return (
      this.config.get<string>('jwt.refreshSecret') ?? `${this.accessSecret()}_refresh_dev_only`
    );
  }

  private issueTokens(userId: string, email: string, role: Role): AuthTokens {
    const accessOpts: JwtSignOptions = {
      secret: this.accessSecret(),
      expiresIn: (this.config.get<string>('jwt.expiresIn') ?? '15m') as JwtSignOptions['expiresIn'],
    };
    const refreshOpts: JwtSignOptions = {
      secret: this.refreshSecret(),
      expiresIn: (this.config.get<string>('jwt.refreshExpiresIn') ?? '7d') as JwtSignOptions['expiresIn'],
    };

    const accessToken = this.jwt.sign({ sub: userId, email, role }, accessOpts);
    const refreshToken = this.jwt.sign({ sub: userId, typ: 'refresh' }, refreshOpts);

    return { accessToken, refreshToken, email, role };
  }
}
