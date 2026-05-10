import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from './jwt-payload.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: JwtPayload;
    }>();
    const auth = req.headers['authorization'];
    const raw = Array.isArray(auth) ? auth[0] : auth;
    const token = raw?.startsWith('Bearer ') ? raw.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException('Token requerido');
    }
    try {
      const decoded = (await this.jwt.verifyAsync(token)) as Partial<JwtPayload> & { sub: string; email: string };
      req.user = {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role ?? 'USER',
      };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
