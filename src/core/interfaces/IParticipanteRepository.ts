import { Participante } from '../entities/Participante';
import { ParticipanteDTO } from '../dtos/ParticipanteDTO';

/**
 * Contrato de Repositorio Desacoplado (Clean Architecture).
 * Cualquier motor de persistencia (SQLite, PostgreSQL, MySQL, Supabase)
 * debe implementar esta interfaz sin afectar la capa de controladores.
 */
export interface IParticipanteRepository {
  crear(data: ParticipanteDTO): Promise<Participante>;
  buscarPorDni(dni: string): Promise<Participante | null>;
  buscarPorDocumento(tipoDoc: string, numDoc: string): Promise<Participante | null>;
  obtenerTodos(): Promise<Participante[]>;
  obtenerEliminados(): Promise<Participante[]>;
  eliminar(id: number): Promise<boolean>;
  restaurar(id: number): Promise<boolean>;
}
