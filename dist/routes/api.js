"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const container_1 = require("../container");
const auth_1 = require("../infrastructure/security/auth");
const router = (0, express_1.Router)();
// Rutas públicas para campaña de actualización de datos
router.post('/participantes', container_1.container.participanteController.registrar);
router.get('/participantes/verificar', container_1.container.participanteController.verificarDocumento);
// Rutas de autenticación del Portal Administrativo
router.post('/admin/login', container_1.container.adminController.login);
router.post('/admin/logout', container_1.container.adminController.logout);
router.get('/admin/session', container_1.container.adminController.session);
// Rutas administrativas protegidas por JWT en Cookie HttpOnly
router.get('/admin/participantes', auth_1.requireAdminAuth, container_1.container.adminController.listarParticipantes);
router.get('/admin/exportar-excel', auth_1.requireAdminAuth, container_1.container.adminController.exportarExcel);
router.get('/admin/export-excel', auth_1.requireAdminAuth, container_1.container.adminController.exportarExcel);
exports.default = router;
//# sourceMappingURL=api.js.map