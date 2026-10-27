"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.LEGACY_AUTH_COOKIE_NAME = exports.AUTH_COOKIE_NAME = void 0;
exports.extractAdminToken = extractAdminToken;
exports.requireAdminAuth = requireAdminAuth;
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
    rawPassword;
    jwtSecret;
    adminPasswordHash;
    constructor() {
        this.adminUser = (process.env.ADMIN_USER || 'admin').trim();
        this.rawPassword = process.env.ADMIN_PASSWORD || 'ConaAdmin2026!';
        this.jwtSecret =
            (process.env.JWT_SECRET || '').trim() ||
                'cona_institucional_jwt_secret_key_2026_seguridad_web';
        const envHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
        if (envHash && envHash.startsWith('$2')) {
            this.adminPasswordHash = envHash;
        }
        else {
            // Generar hash seguro con bcrypt (cost 12) a partir de la contraseña en .env
            this.adminPasswordHash = bcryptImpl.hashSync(this.rawPassword, SALT_ROUNDS);
        }
    }
    getAdminUsername() {
        return this.adminUser;
    }
    async verifyCredentials(username, plainPassword) {
        const cleanUser = username.trim();
        if (cleanUser !== this.adminUser) {
            // Ejecutar comparación ficticia para mitigar ataques de temporización (Timing Attacks)
            await bcryptImpl.compare(plainPassword, this.adminPasswordHash);
            return false;
        }
        return this.verifyAdminPassword(plainPassword);
    }
    async verifyAdminPassword(plainPassword) {
        if (!plainPassword) {
            return false;
        }
        const currentEnvPassword = process.env.ADMIN_PASSWORD || this.rawPassword;
        if (plainPassword === currentEnvPassword) {
            return true;
        }
        return bcryptImpl.compare(plainPassword, this.adminPasswordHash);
    }
    generateToken(username) {
        const payload = {
            username,
            role: 'admin'
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
 */
function requireAdminAuth(req, res, next) {
    const token = extractAdminToken(req);
    if (!token) {
        res.status(401).json({
            ok: false,
            code: 'UNAUTHORIZED',
            message: 'Sesión no iniciada o expirada. Por favor, inicia sesión como administrador.'
        });
        return;
    }
    const decoded = exports.authService.verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
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
//# sourceMappingURL=auth.js.map