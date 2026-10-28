"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = __importDefault(require("./routes/api"));
const sqlite_1 = require("./infrastructure/database/sqlite");
dotenv_1.default.config();
function createApp() {
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    // Inicializar base de datos y esquema SQLite al arrancar
    (0, sqlite_1.getSqliteConnection)();
    // Cabeceras de Seguridad Web
    app.disable('x-powered-by');
    app.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });
    app.use((0, cors_1.default)({
        origin: true,
        credentials: true
    }));
    app.use(express_1.default.json({ limit: '256kb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '256kb' }));
    app.use((0, cookie_parser_1.default)());
    // API REST Desacoplada
    app.use('/api', api_1.default);
    // Archivos estáticos del Frontend (Landing Page & Admin Portal)
    const frontendDir = path_1.default.resolve(process.cwd(), 'frontend');
    app.use(express_1.default.static(frontendDir, {
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
        }
    }));
    // Ruta del Portal Administrativo (/admin)
    app.get('/admin', (_req, res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.sendFile(path_1.default.join(frontendDir, 'admin.html'));
    });
    // Ruta principal de la Landing Page de CONA (/)
    app.get('/', (_req, res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.sendFile(path_1.default.join(frontendDir, 'index.html'));
    });
    return app;
}
if (require.main === module) {
    const port = Number(process.env.PORT || 3000);
    const app = createApp();
    app.listen(port, () => {
        console.log('====================================================================');
        console.log(`🚀 CONA - Sistema de Actualización de Datos y Sorteo Activo`);
        console.log(`🌐 Landing Page Institucional : http://localhost:${port}/`);
        console.log(`🔐 Portal Administrativo      : http://localhost:${port}/admin`);
        console.log(`📡 API REST Endpoint          : http://localhost:${port}/api/participantes`);
        console.log('====================================================================');
    });
}
//# sourceMappingURL=server.js.map