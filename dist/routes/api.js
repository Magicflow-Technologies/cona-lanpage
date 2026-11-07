"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const container_1 = require("../container");
const auth_1 = require("../infrastructure/security/auth");
const securityMiddleware_1 = require("../infrastructure/security/securityMiddleware");
const router = (0, express_1.Router)();
// Blindaje global contra manipulación de payloads (Prototype Pollution / Inyección)
router.use(securityMiddleware_1.securityPayloadGuard);
// Limitadores de tasa por IP contra bots y fuerza bruta
const registrationRateLimiter = (0, securityMiddleware_1.createRateLimiter)({
    windowMs: 10 * 60 * 1000, // 10 minutos
    maxRequests: 40,
    message: 'Se detectaron demasiados intentos seguidos desde tu conexión. Espera unos minutos e inténtalo de nuevo.'
});
const adminLoginRateLimiter = (0, securityMiddleware_1.createRateLimiter)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 25,
    message: 'Demasiados intentos de inicio de sesión. Por seguridad, espera unos minutos antes de reintentar.'
});
// Rutas públicas para campaña de actualización de datos, Captcha y Analytics
router.get('/captcha', container_1.container.participanteController.obtenerCaptcha);
router.get('/config/public', container_1.container.participanteController.obtenerConfigPublica);
router.post('/participantes', registrationRateLimiter, container_1.container.participanteController.registrar);
router.get('/participantes/verificar', container_1.container.participanteController.verificarDocumento);
// Rutas de autenticación del Portal Administrativo
router.post('/admin/login', adminLoginRateLimiter, container_1.container.adminController.login);
router.post('/admin/logout', container_1.container.adminController.logout);
router.get('/admin/session', container_1.container.adminController.session);
// Rutas administrativas protegidas por JWT en Cookie HttpOnly
router.get('/admin/participantes', auth_1.requireAdminAuth, container_1.container.adminController.listarParticipantes);
router.get('/admin/participantes/eliminados', auth_1.requireAdminAuth, container_1.container.adminController.listarEliminados);
router.delete('/admin/participantes/:id', auth_1.requireAdminAuth, container_1.container.adminController.eliminarParticipante);
router.post('/admin/participantes/:id/restaurar', auth_1.requireAdminAuth, container_1.container.adminController.restaurarParticipante);
router.get('/admin/exportar-excel', auth_1.requireAdminAuth, container_1.container.adminController.exportarExcel);
router.get('/admin/export-excel', auth_1.requireAdminAuth, container_1.container.adminController.exportarExcel);
router.get('/admin/auditoria', auth_1.requireAdminAuth, container_1.container.adminController.obtenerAuditoria);
exports.default = router;
//# sourceMappingURL=api.js.map