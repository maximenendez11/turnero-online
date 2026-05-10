import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

type JwtPayload = { sub: string; email: string };

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
      req.user = (await this.jwt.verifyAsync(token)) as JwtPayload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
