import { Router } from 'express';
import { container } from '../container';
import { requireAdminAuth } from '../infrastructure/security/auth';

const router = Router();

// Rutas públicas para campaña de actualización de datos
router.post('/participantes', container.participanteController.registrar);
router.get('/participantes/verificar', container.participanteController.verificarDocumento);

// Rutas de autenticación del Portal Administrativo
router.post('/admin/login', container.adminController.login);
router.post('/admin/logout', container.adminController.logout);
router.get('/admin/session', container.adminController.session);

// Rutas administrativas protegidas por JWT en Cookie HttpOnly
router.get('/admin/participantes', requireAdminAuth, container.adminController.listarParticipantes);
router.get('/admin/exportar-excel', requireAdminAuth, container.adminController.exportarExcel);
router.get('/admin/export-excel', requireAdminAuth, container.adminController.exportarExcel);

export default router;
