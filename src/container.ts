import { IParticipanteRepository } from './core/interfaces/IParticipanteRepository';
import { SqliteParticipanteRepository } from './infrastructure/repositories/SqliteParticipanteRepository';
import { SupabaseParticipanteRepository } from './infrastructure/repositories/SupabaseParticipanteRepository';
import { ParticipanteController } from './controllers/ParticipanteController';
import { AdminController } from './controllers/AdminController';

/**
 * Contenedor de Inyección de Dependencias (IoC / DI Container).
 * Centraliza la creación del repositorio concreto según configuración.
 * Cambiar a MySQL, PostgreSQL o Supabase solo requiere intercambiar la instancia aquí.
 */
class Container {
  private participanteRepository: IParticipanteRepository;
  public participanteController: ParticipanteController;
  public adminController: AdminController;

  constructor() {
    const adapter = (process.env.DB_ADAPTER || 'sqlite').toLowerCase();

    if (adapter === 'supabase') {
      this.participanteRepository = new SupabaseParticipanteRepository();
    } else {
      this.participanteRepository = new SqliteParticipanteRepository();
    }

    this.participanteController = new ParticipanteController(this.participanteRepository);
    this.adminController = new AdminController(this.participanteRepository);
  }

  public getRepository(): IParticipanteRepository {
    return this.participanteRepository;
  }
}

export const container = new Container();
