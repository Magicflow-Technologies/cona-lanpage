import { Router } from 'express';
import { container } from '../container';
import { requireAdminAuth } from '../infrastructure/security/auth';
import {
  createRateLimiter,
  securityPayloadGuard
} from '../infrastructure/security/securityMiddleware';

const router = Router();

// Blindaje global contra manipulación de payloads (Prototype Pollution / Inyección)
router.use(securityPayloadGuard);

// Limitadores de tasa por IP contra bots y fuerza bruta
const registrationRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutos
  maxRequests: 40,
  message: 'Se detectaron demasiados intentos seguidos desde tu conexión. Espera unos minutos e inténtalo de nuevo.'
});

const adminLoginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 25,
  message: 'Demasiados intentos de inicio de sesión. Por seguridad, espera unos minutos antes de reintentar.'
});

// Rutas públicas para campaña de actualización de datos, Captcha y Analytics
router.get('/captcha', container.participanteController.obtenerCaptcha);
router.get('/config/public', container.participanteController.obtenerConfigPublica);
router.post('/participantes', registrationRateLimiter, container.participanteController.registrar);
router.get('/participantes/verificar', container.participanteController.verificarDocumento);

// Rutas de autenticación del Portal Administrativo
router.post('/admin/login', adminLoginRateLimiter, container.adminController.login);
router.post('/admin/logout', container.adminController.logout);
router.get('/admin/session', container.adminController.session);

// Rutas administrativas protegidas por JWT en Cookie HttpOnly
router.get('/admin/participantes', requireAdminAuth, container.adminController.listarParticipantes);
router.get(
  '/admin/participantes/eliminados',
  requireAdminAuth,
  container.adminController.listarEliminados
);
router.delete(
  '/admin/participantes/:id',
  requireAdminAuth,
  container.adminController.eliminarParticipante
);
router.post(
  '/admin/participantes/:id/restaurar',
  requireAdminAuth,
  container.adminController.restaurarParticipante
);
router.get('/admin/exportar-excel', requireAdminAuth, container.adminController.exportarExcel);
router.get('/admin/export-excel', requireAdminAuth, container.adminController.exportarExcel);
router.get('/admin/backup-db', requireAdminAuth, container.adminController.descargarBackupDb);
router.get('/admin/auditoria', requireAdminAuth, container.adminController.obtenerAuditoria);

export default router;

