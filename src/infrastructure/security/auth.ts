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

export type UserRole = 'admin' | 'viewer';

export interface AdminJwtPayload {
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthVerifyResult {
  isValid: boolean;
  username?: string;
  role?: UserRole;
}

class AuthService {
  private readonly adminUser: string;
  private readonly rawAdminPassword: string;
  private readonly viewerUser: string;
  private readonly rawViewerPassword: string;
  private readonly jwtSecret: string;
  private adminPasswordHash: string;
  private viewerPasswordHash: string;

  constructor() {
    this.adminUser = (process.env.ADMIN_USER || 'admin').trim();
    this.rawAdminPassword = process.env.ADMIN_PASSWORD || 'ConaAdmin2026*Secure!';
    this.viewerUser = (process.env.VIEWER_USER || 'lector').trim();
    this.rawViewerPassword = process.env.VIEWER_PASSWORD || 'ConaLector2026*';
    this.jwtSecret =
      (process.env.JWT_SECRET || '').trim() ||
      'cona_institucional_jwt_secret_key_2026_seguridad_web';

    const envHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
    if (envHash && envHash.startsWith('$2')) {
      this.adminPasswordHash = envHash;
    } else {
      this.adminPasswordHash = bcryptImpl.hashSync(this.rawAdminPassword, SALT_ROUNDS);
    }

    this.viewerPasswordHash = bcryptImpl.hashSync(this.rawViewerPassword, SALT_ROUNDS);
  }

  public getAdminUsername(): string {
    return this.adminUser;
  }

  public getViewerUsername(): string {
    return this.viewerUser;
  }

  public async verifyCredentials(username: string, plainPassword: string): Promise<AuthVerifyResult> {
    const cleanUser = username.trim();

    // 1. Verificar Admin
    if (cleanUser === this.adminUser) {
      const ok = await this.verifyAdminPassword(plainPassword);
      if (ok) {
        return { isValid: true, username: this.adminUser, role: 'admin' };
      }
    }

    // 2. Verificar Viewer (Solo Lectura)
    if (cleanUser === this.viewerUser) {
      const currentEnvViewerPass = process.env.VIEWER_PASSWORD || this.rawViewerPassword;
      let ok = plainPassword === currentEnvViewerPass;
      if (!ok) {
        ok = await bcryptImpl.compare(plainPassword, this.viewerPasswordHash);
      }
      if (ok) {
        return { isValid: true, username: this.viewerUser, role: 'viewer' };
      }
    }

    // Comparación ficticia para mitigar Timing Attacks
    await bcryptImpl.compare(plainPassword, this.adminPasswordHash);
    return { isValid: false };
  }

  public async verifyAdminPassword(plainPassword: string): Promise<boolean> {
    if (!plainPassword) {
      return false;
    }
    const currentEnvPassword = process.env.ADMIN_PASSWORD || this.rawAdminPassword;
    if (plainPassword === currentEnvPassword) {
      return true;
    }
    return bcryptImpl.compare(plainPassword, this.adminPasswordHash);
  }

  public generateToken(username: string, role: UserRole = 'admin'): string {
    const payload: AdminJwtPayload = {
      username,
      role
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
 * Permite acceso tanto a 'admin' como a 'viewer'.
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractAdminToken(req);
  if (!token) {
    res.status(401).json({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'Sesión no iniciada o expirada. Por favor, inicia sesión.'
    });
    return;
  }

  const decoded = authService.verifyToken(token);
  if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'viewer')) {
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

/**
 * Middleware que restringe una acción exclusivamente a usuarios con rol 'admin'.
 * Si el usuario es de solo lectura ('viewer'), devuelve 403 Forbidden.
 */
export function requireAdminRoleOnly(req: Request, res: Response, next: NextFunction): void {
  const adminPayload = (req as Request & { admin?: AdminJwtPayload }).admin;
  if (!adminPayload || adminPayload.role !== 'admin') {
    res.status(403).json({
      ok: false,
      code: 'FORBIDDEN_READ_ONLY',
      message: 'Acceso denegado: Tu usuario tiene permisos de solo lectura (vista) y no puede modificar ni eliminar registros.'
    });
    return;
  }
  next();
}
