import { IParticipanteRepository } from '../../core/interfaces/IParticipanteRepository';
import { Participante, HijoMenor, TipoDocumento } from '../../core/entities/Participante';
import { ParticipanteDTO } from '../../core/dtos/ParticipanteDTO';
import { DuplicateDocumentError } from '../../core/errors/AppError';
import { getSqliteConnection, SqliteConnection } from '../database/sqlite';

interface ParticipanteRow {
  id: number;
  tipo_documento: string;
  numero_documento: string;
  apellidos: string;
  nombres: string;
  celular: string;
  correo: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  ruc_empresa: string;
  nombre_proyecto: string;
  categoria: string;
  especialidad: string;
  hijos_menores: number;
  hijos_json: string;
  consentimiento_datos_personales: number;
  estado_sorteo: string;
  fecha_registro: string;
}

/**
 * Adaptador de Persistencia SQLite implementando IParticipanteRepository sobre `cona_campana.db`.
 * Utiliza Sentencias Preparadas (`?`) para prevenir Inyección SQL (SQLi) y garantiza unicidad de documento.
 */
export class SqliteParticipanteRepository implements IParticipanteRepository {
  private readonly db: SqliteConnection;

  constructor(dbConnection?: SqliteConnection) {
    this.db = dbConnection || getSqliteConnection();
  }

  private mapRowToEntity(row: ParticipanteRow): Participante {
    let parsedHijos: HijoMenor[] = [];
    try {
      parsedHijos = JSON.parse(row.hijos_json || '[]');
    } catch {
      parsedHijos = [];
    }

    const tipoDoc: TipoDocumento =
      row.tipo_documento === 'Carnet de Extranjería' ||
      row.tipo_documento === 'Carnet de Extranjeria'
        ? 'Carnet de Extranjería'
        : 'DNI';

    const apellidos = row.apellidos || '';
    const nombres = row.nombres || '';
    const nombresApellidos = `${nombres} ${apellidos}`.trim();

    return {
      id: Number(row.id),
      tipo_documento: tipoDoc,
      numero_documento: row.numero_documento,
      apellidos,
      nombres,
      celular: row.celular,
      correo: row.correo || '',
      direccion: row.direccion || '',
      departamento: row.departamento,
      provincia: row.provincia,
      distrito: row.distrito,
      ubigeo: row.ubigeo || '',
      ruc_empresa: row.ruc_empresa || '',
      nombre_proyecto: row.nombre_proyecto || '',
      categoria: row.categoria,
      especialidad: row.especialidad || '',
      hijos_menores: Number(row.hijos_menores ?? parsedHijos.length),
      hijos_json: row.hijos_json || '[]',
      hijos_detalle: parsedHijos,
      consentimiento_datos_personales: Boolean(row.consentimiento_datos_personales),
      estado_sorteo: (row.estado_sorteo as 'Participando' | 'Excluido') || 'Participando',
      fecha_registro: row.fecha_registro,
      dni: row.numero_documento,
      nombres_apellidos: nombresApellidos
    };
  }

  public async buscarPorDni(numeroDocumento: string): Promise<Participante | null> {
    const stmt = this.db.prepare(`
      SELECT
        id, tipo_documento, numero_documento, apellidos, nombres,
        celular, correo, direccion, departamento, provincia, distrito, ubigeo,
        ruc_empresa, nombre_proyecto, categoria, especialidad,
        hijos_menores, hijos_json, consentimiento_datos_personales,
        estado_sorteo, fecha_registro
      FROM participantes
      WHERE numero_documento = ?
      LIMIT 1
    `);

    const row = stmt.get(numeroDocumento) as ParticipanteRow | undefined;
    if (!row) {
      return null;
    }
    return this.mapRowToEntity(row);
  }

  public async buscarPorDocumento(
    tipoDoc: string,
    numDoc: string
  ): Promise<Participante | null> {
    const normalizedTipo =
      tipoDoc === 'Carnet de Extranjeria' || tipoDoc === 'Carnet de Extranjería'
        ? 'Carnet de Extranjería'
        : 'DNI';

    const stmt = this.db.prepare(`
      SELECT
        id, tipo_documento, numero_documento, apellidos, nombres,
        celular, correo, direccion, departamento, provincia, distrito, ubigeo,
        ruc_empresa, nombre_proyecto, categoria, especialidad,
        hijos_menores, hijos_json, consentimiento_datos_personales,
        estado_sorteo, fecha_registro
      FROM participantes
      WHERE numero_documento = ? OR (tipo_documento = ? AND numero_documento = ?)
      LIMIT 1
    `);

    const row = stmt.get(numDoc, normalizedTipo, numDoc) as ParticipanteRow | undefined;
    if (!row) {
      return null;
    }
    return this.mapRowToEntity(row);
  }

  public async crear(data: ParticipanteDTO): Promise<Participante> {
    const existente = await this.buscarPorDocumento(
      data.tipo_documento,
      data.numero_documento
    );
    if (existente) {
      throw new DuplicateDocumentError(data.numero_documento, data.tipo_documento);
    }

    const fechaRegistroIso = new Date().toISOString();
    const hijosJson =
      data.hijos_json || JSON.stringify(data.hijos_detalle ?? []);

    const insertStmt = this.db.prepare(`
      INSERT INTO participantes (
        tipo_documento,
        numero_documento,
        apellidos,
        nombres,
        celular,
        correo,
        direccion,
        departamento,
        provincia,
        distrito,
        ubigeo,
        ruc_empresa,
        nombre_proyecto,
        categoria,
        especialidad,
        hijos_menores,
        hijos_json,
        consentimiento_datos_personales,
        estado_sorteo,
        fecha_registro
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = insertStmt.run(
        data.tipo_documento || 'DNI',
        data.numero_documento,
        data.apellidos,
        data.nombres,
        data.celular,
        data.correo || '',
        data.direccion,
        data.departamento,
        data.provincia,
        data.distrito,
        data.ubigeo || '',
        data.ruc_empresa || '',
        data.nombre_proyecto || '',
        data.categoria,
        data.especialidad || '',
        data.hijos_menores ?? 0,
        hijosJson,
        data.consentimiento_datos_personales ? 1 : 0,
        'Participando',
        fechaRegistroIso
      );

      const newId = Number(result.lastInsertRowid);
      const selectByIdStmt = this.db.prepare(`
        SELECT
          id, tipo_documento, numero_documento, apellidos, nombres,
          celular, correo, direccion, departamento, provincia, distrito, ubigeo,
          ruc_empresa, nombre_proyecto, categoria, especialidad,
          hijos_menores, hijos_json, consentimiento_datos_personales,
          estado_sorteo, fecha_registro
        FROM participantes
        WHERE id = ?
      `);

      const createdRow = selectByIdStmt.get(newId) as ParticipanteRow;
      return this.mapRowToEntity(createdRow);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('UNIQUE constraint failed')) {
        throw new DuplicateDocumentError(data.numero_documento, data.tipo_documento);
      }
      throw error;
    }
  }

  public async obtenerTodos(): Promise<Participante[]> {
    const stmt = this.db.prepare(`
      SELECT
        id, tipo_documento, numero_documento, apellidos, nombres,
        celular, correo, direccion, departamento, provincia, distrito, ubigeo,
        ruc_empresa, nombre_proyecto, categoria, especialidad,
        hijos_menores, hijos_json, consentimiento_datos_personales,
        estado_sorteo, fecha_registro
      FROM participantes
      ORDER BY datetime(fecha_registro) DESC, id DESC
    `);

    const rows = stmt.all() as ParticipanteRow[];
    return rows.map((row) => this.mapRowToEntity(row));
  }
}
