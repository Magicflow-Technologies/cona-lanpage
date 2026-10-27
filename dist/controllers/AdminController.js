"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const auth_1 = require("../infrastructure/security/auth");
const ExcelExporter_1 = require("../infrastructure/excel/ExcelExporter");
class AdminController {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    /**
     * POST /api/admin/login
     */
    login = async (req, res) => {
        try {
            const username = String(req.body?.username || '').trim();
            const password = String(req.body?.password || '');
            if (!username || !password) {
                res.status(400).json({
                    ok: false,
                    code: 'MISSING_CREDENTIALS',
                    message: 'Ingresa usuario y contraseña.'
                });
                return;
            }
            const isValid = await auth_1.authService.verifyCredentials(username, password);
            if (!isValid) {
                res.status(401).json({
                    ok: false,
                    code: 'INVALID_CREDENTIALS',
                    message: 'Credenciales administrativas incorrectas.'
                });
                return;
            }
            const token = auth_1.authService.generateToken(username);
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // false en desarrollo HTTP local
                sameSite: 'lax',
                path: '/',
                maxAge: 24 * 60 * 60 * 1000 // 24 horas
            });
            res.status(200).json({
                ok: true,
                message: 'Sesión administrativa iniciada correctamente.',
                user: { username, role: 'admin' }
            });
        }
        catch (error) {
            console.error('[AdminController.login] Error:', error);
            res.status(500).json({
                ok: false,
                code: 'INTERNAL_ERROR',
                message: 'Error interno al procesar el inicio de sesión.'
            });
        }
    };
    /**
     * POST /api/admin/logout
     */
    logout = (_req, res) => {
        res.clearCookie(auth_1.AUTH_COOKIE_NAME, { path: '/' });
        res.clearCookie(auth_1.LEGACY_AUTH_COOKIE_NAME, { path: '/' });
        res.status(200).json({
            ok: true,
            message: 'Sesión cerrada correctamente.'
        });
    };
    /**
     * GET /api/admin/session
     */
    session = (req, res) => {
        const token = (0, auth_1.extractAdminToken)(req);
        if (!token) {
            res.status(200).json({ ok: true, authenticated: false });
            return;
        }
        const payload = auth_1.authService.verifyToken(token);
        if (!payload) {
            res.clearCookie(auth_1.AUTH_COOKIE_NAME, { path: '/' });
            res.clearCookie(auth_1.LEGACY_AUTH_COOKIE_NAME, { path: '/' });
            res.status(200).json({ ok: true, authenticated: false });
            return;
        }
        res.status(200).json({
            ok: true,
            authenticated: true,
            user: { username: payload.username, role: payload.role }
        });
    };
    filterRecords(todos, search, fechaDesde, fechaHasta) {
        return todos.filter((p) => {
            if (search) {
                const haystack = [
                    p.numero_documento,
                    p.tipo_documento,
                    p.apellidos,
                    p.nombres,
                    p.nombres_apellidos || '',
                    p.correo,
                    p.celular,
                    p.direccion,
                    p.ruc_empresa,
                    p.nombre_proyecto,
                    p.categoria,
                    p.especialidad,
                    p.departamento,
                    p.provincia,
                    p.distrito
                ]
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(search)) {
                    return false;
                }
            }
            if (fechaDesde) {
                const regDate = (p.fecha_registro || '').slice(0, 10);
                if (regDate < fechaDesde)
                    return false;
            }
            if (fechaHasta) {
                const regDate = (p.fecha_registro || '').slice(0, 10);
                if (regDate > fechaHasta)
                    return false;
            }
            return true;
        });
    }
    /**
     * GET /api/admin/participantes
     */
    listarParticipantes = async (req, res) => {
        try {
            const todos = await this.repository.obtenerTodos();
            const search = String(req.query.q || '')
                .trim()
                .toLowerCase();
            const fechaDesde = String(req.query.desde || '').trim();
            const fechaHasta = String(req.query.hasta || '').trim();
            const filtrados = this.filterRecords(todos, search, fechaDesde, fechaHasta);
            res.status(200).json({
                ok: true,
                total: todos.length,
                filtrados: filtrados.length,
                data: filtrados
            });
        }
        catch (error) {
            console.error('[AdminController.listarParticipantes] Error:', error);
            res.status(500).json({
                ok: false,
                code: 'INTERNAL_ERROR',
                message: 'No se pudo obtener el listado de participantes.'
            });
        }
    };
    /**
     * GET /api/admin/exportar-excel (y alias /api/admin/export-excel)
     */
    exportarExcel = async (req, res) => {
        try {
            const todos = await this.repository.obtenerTodos();
            const search = String(req.query.q || '')
                .trim()
                .toLowerCase();
            const fechaDesde = String(req.query.desde || '').trim();
            const fechaHasta = String(req.query.hasta || '').trim();
            const registrosExportar = this.filterRecords(todos, search, fechaDesde, fechaHasta);
            const buffer = await ExcelExporter_1.ExcelExporter.buildParticipantesWorkbook(registrosExportar);
            const stamp = new Date().toISOString().slice(0, 10);
            const filename = `CONA_Participantes_Sorteo_${stamp}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.status(200).send(Buffer.from(buffer));
        }
        catch (error) {
            console.error('[AdminController.exportarExcel] Error:', error);
            res.status(500).json({
                ok: false,
                code: 'EXCEL_EXPORT_ERROR',
                message: 'Error al generar el archivo Excel.'
            });
        }
    };
}
exports.AdminController = AdminController;
//# sourceMappingURL=AdminController.js.map