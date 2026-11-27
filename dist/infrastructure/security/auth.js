"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.LEGACY_AUTH_COOKIE_NAME = exports.AUTH_COOKIE_NAME = void 0;
exports.extractAdminToken = extractAdminToken;
exports.requireAdminAuth = requireAdminAuth;
exports.requireAdminRoleOnly = requireAdminRoleOnly;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Intentar usar bcrypt nativo; si el binario C++ no está compilado en el SO, usar bcryptjs compatible
let bcryptImpl = bcryptjs_1.default;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nativeBcrypt = require('bcrypt');
    if (nativeBcrypt && typeof nativeBcrypt.hash === 'function') {
        bcryptImpl = nativeBcrypt;
    }
}
catch {
    bcryptImpl = bcryptjs_1.default;
}
const SALT_ROUNDS = 12;
exports.AUTH_COOKIE_NAME = 'token';
exports.LEGACY_AUTH_COOKIE_NAME = 'cona_admin_token';
class AuthService {
    adminUser;
    rawAdminPassword;
    viewerUser;
    rawViewerPassword;
    jwtSecret;
    adminPasswordHash;
    viewerPasswordHash;
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
        }
        else {
            this.adminPasswordHash = bcryptImpl.hashSync(this.rawAdminPassword, SALT_ROUNDS);
        }
        this.viewerPasswordHash = bcryptImpl.hashSync(this.rawViewerPassword, SALT_ROUNDS);
    }
    getAdminUsername() {
        return this.adminUser;
    }
    getViewerUsername() {
        return this.viewerUser;
    }
    async verifyCredentials(username, plainPassword) {
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
    async verifyAdminPassword(plainPassword) {
        if (!plainPassword) {
            return false;
        }
        const currentEnvPassword = process.env.ADMIN_PASSWORD || this.rawAdminPassword;
        if (plainPassword === currentEnvPassword) {
            return true;
        }
        return bcryptImpl.compare(plainPassword, this.adminPasswordHash);
    }
    generateToken(username, role = 'admin') {
        const payload = {
            username,
            role
        };
        return jsonwebtoken_1.default.sign(payload, this.jwtSecret, {
            expiresIn: '24h',
            algorithm: 'HS256'
        });
    }
    verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.jwtSecret);
        }
        catch {
            return null;
        }
    }
}
exports.authService = new AuthService();
/**
 * Extrae el token JWT desde la cookie `token` (o el nombre legado `cona_admin_token`).
 */
function extractAdminToken(req) {
    return req.cookies?.[exports.AUTH_COOKIE_NAME] || req.cookies?.[exports.LEGACY_AUTH_COOKIE_NAME];
}
/**
 * Middleware que protege rutas administrativas verificando el JWT en Cookie HttpOnly.
 * Permite acceso tanto a 'admin' como a 'viewer'.
 */
function requireAdminAuth(req, res, next) {
    const token = extractAdminToken(req);
    if (!token) {
        res.status(401).json({
            ok: false,
            code: 'UNAUTHORIZED',
            message: 'Sesión no iniciada o expirada. Por favor, inicia sesión.'
        });
        return;
    }
    const decoded = exports.authService.verifyToken(token);
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'viewer')) {
        res.clearCookie(exports.AUTH_COOKIE_NAME, { path: '/' });
        res.clearCookie(exports.LEGACY_AUTH_COOKIE_NAME, { path: '/' });
        res.status(401).json({
            ok: false,
            code: 'INVALID_TOKEN',
            message: 'Token de sesión inválido o expirado.'
        });
        return;
    }
    req.admin = decoded;
    next();
}
/**
 * Middleware que restringe una acción exclusivamente a usuarios con rol 'admin'.
 * Si el usuario es de solo lectura ('viewer'), devuelve 403 Forbidden.
 */
function requireAdminRoleOnly(req, res, next) {
    const adminPayload = req.admin;
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
//# sourceMappingURL=auth.js.map