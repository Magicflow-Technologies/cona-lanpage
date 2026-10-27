import { IParticipanteRepository } from '../../core/interfaces/IParticipanteRepository';
import { Participante } from '../../core/entities/Participante';
import { ParticipanteDTO } from '../../core/dtos/ParticipanteDTO';
import { AppError } from '../../core/errors/AppError';

/**
 * Adaptador alternativo para Supabase / PostgreSQL.
 * Demuestra el principio de Inversión de Dependencias (DIP).
 */
export class SupabaseParticipanteRepository implements IParticipanteRepository {
  private readonly supabaseUrl: string;
  private readonly supabaseKey: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || '';
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  }

  public async crear(_data: ParticipanteDTO): Promise<Participante> {
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new AppError(
        'Adaptador Supabase seleccionado pero faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env',
        500,
        'SUPABASE_CONFIG_MISSING'
      );
    }
    throw new AppError('Conector remoto Supabase listo para configurar credenciales.', 501);
  }

  public async buscarPorDni(_dni: string): Promise<Participante | null> {
    return null;
  }

  public async buscarPorDocumento(_tipoDoc: string, numDoc: string): Promise<Participante | null> {
    return this.buscarPorDni(numDoc);
  }

  public async obtenerTodos(): Promise<Participante[]> {
    return [];
  }

  public async obtenerEliminados(): Promise<Participante[]> {
    return [];
  }

  public async eliminar(_id: number): Promise<boolean> {
    return false;
  }

  public async restaurar(_id: number): Promise<boolean> {
    return false;
  }
}
