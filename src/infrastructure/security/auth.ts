import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Intentar usar bcrypt nativo; si el binario C++ no está compilado en el SO, usar bcryptjs compatible
let bcryptImpl: typeof bcryptjs = bcryptjs;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nativeBcrypt = require('bcrypt');
  if (nativeBcrypt && typeof nativeBcrypt.hash === 'function') {
    bcryptImpl = nativeBcrypt;
  }
} catch {
  bcryptImpl = bcryptjs;
}

const SALT_ROUNDS = 12;
export const AUTH_COOKIE_NAME = 'token';
export const LEGACY_AUTH_COOKIE_NAME = 'cona_admin_token';

export interface AdminJwtPayload {
  username: string;
  role: 'admin';
  iat?: number;
  exp?: number;
}

class AuthService {
  private readonly adminUser: string;
  private readonly jwtSecret: string;
  private adminPasswordHash: string;

  constructor() {
    this.adminUser = (process.env.ADMIN_USER || 'admin').trim();
    this.jwtSecret =
      (process.env.JWT_SECRET || '').trim() ||
      'cona_institucional_jwt_secret_key_2026_seguridad_web';

    const envHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
    const rawPassword = process.env.ADMIN_PASSWORD || 'ConaAdmin2026!';

    if (envHash && envHash.startsWith('$2')) {
      this.adminPasswordHash = envHash;
    } else {
      // Generar hash seguro con bcrypt (cost 12) a partir de la contraseña en .env
      this.adminPasswordHash = bcryptImpl.hashSync(rawPassword, SALT_ROUNDS);
    }
  }

  public getAdminUsername(): string {
    return this.adminUser;
  }

  public async verifyCredentials(username: string, plainPassword: string): Promise<boolean> {
    const cleanUser = username.trim();
    if (cleanUser !== this.adminUser) {
      // Ejecutar comparación ficticia para mitigar ataques de temporización (Timing Attacks)
      await bcryptImpl.compare(plainPassword, this.adminPasswordHash);
      return false;
    }
    return bcryptImpl.compare(plainPassword, this.adminPasswordHash);
  }

  public generateToken(username: string): string {
    const payload: AdminJwtPayload = {
      username,
      role: 'admin'
    };
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '24h',
      algorithm: 'HS256'
    });
  }

  public verifyToken(token: string): AdminJwtPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as AdminJwtPayload;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();

/**
 * Extrae el token JWT desde la cookie `token` (o el nombre legado `cona_admin_token`).
 */
export function extractAdminToken(req: Request): string | undefined {
  return req.cookies?.[AUTH_COOKIE_NAME] || req.cookies?.[LEGACY_AUTH_COOKIE_NAME];
}

/**
 * Middleware que protege rutas administrativas verificando el JWT en Cookie HttpOnly.
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractAdminToken(req);
  if (!token) {
    res.status(401).json({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'Sesión no iniciada o expirada. Por favor, inicia sesión como administrador.'
    });
    return;
  }

  const decoded = authService.verifyToken(token);
  if (!decoded || decoded.role !== 'admin') {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    res.clearCookie(LEGACY_AUTH_COOKIE_NAME, { path: '/' });
    res.status(401).json({
      ok: false,
      code: 'INVALID_TOKEN',
      message: 'Token de sesión inválido o expirado.'
    });
    return;
  }

  (req as Request & { admin?: AdminJwtPayload }).admin = decoded;
  next();
}
