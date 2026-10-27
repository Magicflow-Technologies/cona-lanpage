"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseParticipanteRepository = void 0;
const AppError_1 = require("../../core/errors/AppError");
/**
 * Adaptador alternativo para Supabase / PostgreSQL.
 * Demuestra el principio de Inversión de Dependencias (DIP).
 */
class SupabaseParticipanteRepository {
    supabaseUrl;
    supabaseKey;
    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL || '';
        this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    }
    async crear(_data) {
        if (!this.supabaseUrl || !this.supabaseKey) {
            throw new AppError_1.AppError('Adaptador Supabase seleccionado pero faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env', 500, 'SUPABASE_CONFIG_MISSING');
        }
        throw new AppError_1.AppError('Conector remoto Supabase listo para configurar credenciales.', 501);
    }
    async buscarPorDni(_dni) {
        return null;
    }
    async buscarPorDocumento(_tipoDoc, numDoc) {
        return this.buscarPorDni(numDoc);
    }
    async obtenerTodos() {
        return [];
    }
    async obtenerEliminados() {
        return [];
    }
    async eliminar(_id) {
        return false;
    }
    async restaurar(_id) {
        return false;
    }
}
exports.SupabaseParticipanteRepository = SupabaseParticipanteRepository;
//# sourceMappingURL=SupabaseParticipanteRepository.js.map