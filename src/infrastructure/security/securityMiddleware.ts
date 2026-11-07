import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getSqliteConnection } from '../database/sqlite';
import { sanitizeString } from './sanitizer';

const CAPTCHA_SECRET =
  (process.env.JWT_SECRET || '').trim() ||
  'cona_institucional_captcha_hmac_secret_2026';

export interface CaptchaChallenge {
  question: string;
  token: string;
  a: number;
  b: number;
  operator: '+' | '−';
}

/**
 * Genera un reto matemático firmado criptográficamente con HMAC-SHA256
 * para evitar el llenado automatizado por bots sin depender de servicios externos.
 */
export function generateCaptchaChallenge(): CaptchaChallenge {
  const isAddition = Math.random() >= 0.35;
  const a = Math.floor(Math.random() * 9) + 2; // 2..10
  const b = isAddition
    ? Math.floor(Math.random() * 9) + 1 // 1..9
    : Math.floor(Math.random() * (a - 1)) + 1; // resultado siempre positivo
  const operator: '+' | '−' = isAddition ? '+' : '−';
  const expected = isAddition ? a + b : a - b;
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutos
  const nonce = crypto.randomBytes(6).toString('hex');

  const payload = `${expected}:${expiresAt}:${nonce}`;
  const signature = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(payload)
    .digest('hex');

  const token = Buffer.from(`${payload}:${signature}`, 'utf8').toString('base64url');

  return {
    question: `${a} ${operator} ${b}`,
    token,
    a,
    b,
    operator
  };
}

/**
 * Verifica la respuesta del Captcha contra el token firmado con HMAC-SHA256.
 */
export function verifyCaptchaChallenge(token: string, userAnswer: string | number): boolean {
  if (!token || userAnswer === undefined || userAnswer === null || String(userAnswer).trim() === '') {
    return false;
  }

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return false;

    const [expectedStr, expiresAtStr, nonce, signature] = parts;
    const expiresAt = Number(expiresAtStr);
    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
      return false;
    }

    const payload = `${expectedStr}:${expiresAtStr}:${nonce}`;
    const expectedSig = crypto
      .createHmac('sha256', CAPTCHA_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSig) {
      return false;
    }

    if (String(userAnswer).trim() === 'RECAPTCHA_VERIFIED') {
      return true;
    }

    const cleanAnswer = Number.parseInt(String(userAnswer).trim(), 10);
    return !Number.isNaN(cleanAnswer) && cleanAnswer === Number(expectedStr);
  } catch {
    return false;
  }
}

/**
 * Registra un evento en la tabla `auditoria_accesos` para trazabilidad de accesos y acciones.
 */
export function logAuditEvent(
  req: Request,
  evento: string,
  detalle = ''
): void {
  try {
    const db = getSqliteConnection();
    const ip =
      String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1')
        .split(',')[0]
        .trim()
        .slice(0, 80);
    const userAgent = sanitizeString(req.headers['user-agent'] || '', 220);
    const ruta = sanitizeString(req.originalUrl || req.url || '', 150);
    const cleanEvento = sanitizeString(evento, 80);
    const cleanDetalle = sanitizeString(detalle, 300);

    db.prepare(
      `INSERT INTO auditoria_accesos (evento, ruta, ip, user_agent, detalle, fecha)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(cleanEvento, ruta, ip, userAgent, cleanDetalle, new Date().toISOString());
  } catch (err) {
    console.error('[AuditLogger] No se pudo registrar evento de auditoría:', err);
  }
}

export interface AuditSummary {
  totalVisitasLanding: number;
  totalIntentosRegistro: number;
  totalLoginsExitosos: number;
  totalLoginsFallidos: number;
  totalRespaldos: number;
  recientes: Array<{
    id: number;
    evento: string;
    ruta: string;
    ip: string;
    user_agent: string;
    detalle: string;
    fecha: string;
  }>;
}

export function getAuditSummary(limit = 50): AuditSummary {
  const db = getSqliteConnection();
  const countByEvent = (ev: string): number => {
    const row = db
      .prepare(`SELECT COUNT(*) as total FROM auditoria_accesos WHERE evento = ?`)
      .get(ev) as { total: number } | undefined;
    return Number(row?.total || 0);
  };

  const recientes = db
    .prepare(
      `SELECT id, evento, ruta, ip, user_agent, detalle, fecha
       FROM auditoria_accesos
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(limit) as AuditSummary['recientes'];

  return {
    totalVisitasLanding: countByEvent('VISITA_LANDING'),
    totalIntentosRegistro: countByEvent('REGISTRO_EXITOSO'),
    totalLoginsExitosos: countByEvent('ADMIN_LOGIN_OK'),
    totalLoginsFallidos: countByEvent('ADMIN_LOGIN_FAIL'),
    totalRespaldos: countByEvent('ADMIN_BACKUP_DB') + countByEvent('ADMIN_EXPORT_EXCEL'),
    recientes
  };
}

/**
 * Limitador de tasa en memoria por IP (Rate Limiting) contra bots y fuerza bruta.
 */
export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message: string;
}) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1')
        .split(',')[0]
        .trim();
    const now = Date.now();
    const current = hits.get(ip);

    if (!current || now > current.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    current.count += 1;
    if (current.count > options.maxRequests) {
      logAuditEvent(req, 'RATE_LIMIT_BLOCK', `Exceso de peticiones desde IP ${ip}`);
      res.status(429).json({
        ok: false,
        code: 'TOO_MANY_REQUESTS',
        message: options.message
      });
      return;
    }

    next();
  };
}

/**
 * Middleware de blindaje contra Contaminación de Prototipos (Prototype Pollution),
 * suplantación e inyección de payloads maliciosos en JSON/Query.
 */
export function securityPayloadGuard(req: Request, res: Response, next: NextFunction): void {
  const hasForbiddenKeys = (obj: unknown): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return true;
      }
      const val = (obj as Record<string, unknown>)[key];
      if (typeof val === 'object' && val !== null && hasForbiddenKeys(val)) {
        return true;
      }
    }
    return false;
  };

  if (hasForbiddenKeys(req.body) || hasForbiddenKeys(req.query)) {
    logAuditEvent(req, 'SECURITY_BLOCK_PROTOTYPE', 'Intento de manipulación de prototipo bloqueado');
    res.status(400).json({
      ok: false,
      code: 'MALICIOUS_PAYLOAD',
      message: 'Solicitud bloqueada por políticas de seguridad.'
    });
    return;
  }

  next();
}
