import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Este email ya está registrado');
    }
    const passwordHash = bcrypt.hashSync(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: passwordHash, role: 'USER' },
      select: { id: true, email: true },
    });
    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
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
    return this.issueTokens(user.id, user.email);
  }

  private issueTokens(userId: string, email: string) {
    const accessToken = this.jwt.sign({ sub: userId, email });
    return { accessToken, email };
  }
}
