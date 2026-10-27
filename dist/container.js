"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
const SqliteParticipanteRepository_1 = require("./infrastructure/repositories/SqliteParticipanteRepository");
const SupabaseParticipanteRepository_1 = require("./infrastructure/repositories/SupabaseParticipanteRepository");
const ParticipanteController_1 = require("./controllers/ParticipanteController");
const AdminController_1 = require("./controllers/AdminController");
/**
 * Contenedor de Inyección de Dependencias (IoC / DI Container).
 * Centraliza la creación del repositorio concreto según configuración.
 * Cambiar a MySQL, PostgreSQL o Supabase solo requiere intercambiar la instancia aquí.
 */
class Container {
    participanteRepository;
    participanteController;
    adminController;
    constructor() {
        const adapter = (process.env.DB_ADAPTER || 'sqlite').toLowerCase();
        if (adapter === 'supabase') {
            this.participanteRepository = new SupabaseParticipanteRepository_1.SupabaseParticipanteRepository();
        }
        else {
            this.participanteRepository = new SqliteParticipanteRepository_1.SqliteParticipanteRepository();
        }
        this.participanteController = new ParticipanteController_1.ParticipanteController(this.participanteRepository);
        this.adminController = new AdminController_1.AdminController(this.participanteRepository);
    }
    getRepository() {
        return this.participanteRepository;
    }
}
exports.container = new Container();
//# sourceMappingURL=container.js.map