"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteParticipanteRepository = void 0;
const AppError_1 = require("../../core/errors/AppError");
const sqlite_1 = require("../database/sqlite");
const SELECT_COLUMNS = `
  id, tipo_documento, numero_documento, nombres, apellidos,
  fecha_nacimiento, celular, correo, direccion_domiciliaria, direccion,
  departamento, provincia, distrito, ubigeo,
  categoria_laboral, categoria, especialidad_laboral, especialidad,
  trabaja_en_obra, ruc_empleador, ruc_empresa, no_conoce_ruc,
  nombre_proyecto, hijos_menores, hijos_json,
  consentimiento_datos_personales, estado_sorteo, fecha_registro,
  activo, fecha_eliminacion
`;
/**
 * Adaptador de Persistencia SQLite implementando IParticipanteRepository sobre `cona_campana.db`.
 * Utiliza Sentencias Preparadas (`?`) para prevenir Inyección SQL (SQLi), garantiza unicidad de documento
 * y soporta borrado lógico (Soft Delete) y restauración.
 */
class SqliteParticipanteRepository {
    db;
    constructor(dbConnection) {
        this.db = dbConnection || (0, sqlite_1.getSqliteConnection)();
    }
    mapRowToEntity(row) {
        let parsedHijos = [];
        try {
            parsedHijos = JSON.parse(row.hijos_json || '[]');
        }
        catch {
            parsedHijos = [];
        }
        const rawTipo = row.tipo_documento || 'DNI';
        let tipoDoc = 'DNI';
        if (rawTipo === 'Carné de extranjería' ||
            rawTipo === 'Carnet de Extranjería' ||
            rawTipo === 'Carnet de Extranjeria') {
            tipoDoc = 'Carné de extranjería';
        }
        else if (rawTipo === 'Pasaporte') {
            tipoDoc = 'Pasaporte';
        }
        else if (rawTipo === 'Permiso temporal de permanencia' ||
            rawTipo === 'PTP') {
            tipoDoc = 'Permiso temporal de permanencia';
        }
        else if (rawTipo === 'Otro documento') {
            tipoDoc = 'Otro documento';
        }
        else {
            tipoDoc = 'DNI';
        }
        const apellidos = row.apellidos || '';
        const nombres = row.nombres || '';
        const nombresApellidos = `${nombres} ${apellidos}`.trim();
        const direccionDom = row.direccion_domiciliaria || row.direccion || '';
        const catLaboral = row.categoria_laboral || row.categoria || 'Operario';
        const espLaboral = row.especialidad_laboral || row.especialidad || '';
        const rucEmp = row.ruc_empleador || row.ruc_empresa || '';
        const trabajaEnObra = row.trabaja_en_obra === undefined ? true : Number(row.trabaja_en_obra) === 1;
        const noConoceRuc = row.no_conoce_ruc === undefined ? false : Number(row.no_conoce_ruc) === 1;
        return {
            id: Number(row.id),
            tipo_documento: tipoDoc,
            numero_documento: row.numero_documento,
            nombres,
            apellidos,
            fecha_nacimiento: row.fecha_nacimiento || '',
            celular: row.celular,
            correo: row.correo || '',
            direccion_domiciliaria: direccionDom,
            direccion: direccionDom,
            departamento: row.departamento,
            provincia: row.provincia,
            distrito: row.distrito,
            ubigeo: row.ubigeo || '',
            categoria_laboral: catLaboral,
            categoria: catLaboral,
            especialidad_laboral: espLaboral,
            especialidad: espLaboral,
            trabaja_en_obra: trabajaEnObra,
            ruc_empleador: rucEmp,
            ruc_empresa: rucEmp,
            no_conoce_ruc: noConoceRuc,
            nombre_proyecto: row.nombre_proyecto || '',
            hijos_menores: Number(row.hijos_menores ?? parsedHijos.length),
            hijos_json: row.hijos_json || '[]',
            hijos_detalle: parsedHijos,
            consentimiento_datos_personales: Boolean(row.consentimiento_datos_personales),
            estado_sorteo: row.estado_sorteo || 'Participando',
            fecha_registro: row.fecha_registro,
            activo: row.activo === undefined ? true : Number(row.activo) === 1,
            fecha_eliminacion: row.fecha_eliminacion ?? null,
            dni: row.numero_documento,
            nombres_apellidos: nombresApellidos
        };
    }
    async buscarPorDni(numeroDocumento) {
        const stmt = this.db.prepare(`
      SELECT ${SELECT_COLUMNS}
      FROM participantes
      WHERE numero_documento = ?
      LIMIT 1
    `);
        const row = stmt.get(numeroDocumento);
        if (!row) {
            return null;
        }
        return this.mapRowToEntity(row);
    }
    async buscarPorDocumento(tipoDoc, numDoc) {
        const normalizedTipo = tipoDoc === 'Carnet de Extranjeria' || tipoDoc === 'Carnet de Extranjería'
            ? 'Carnet de Extranjería'
            : 'DNI';
        const stmt = this.db.prepare(`
      SELECT ${SELECT_COLUMNS}
      FROM participantes
      WHERE numero_documento = ? OR (tipo_documento = ? AND numero_documento = ?)
      LIMIT 1
    `);
        const row = stmt.get(numDoc, normalizedTipo, numDoc);
        if (!row) {
            return null;
        }
        return this.mapRowToEntity(row);
    }
    async crear(data) {
        const existente = await this.buscarPorDocumento(data.tipo_documento, data.numero_documento);
        const fechaRegistroIso = new Date().toISOString();
        const hijosJson = data.hijos_json || JSON.stringify(data.hijos_detalle ?? []);
        if (existente) {
            if (existente.activo) {
                throw new AppError_1.DuplicateDocumentError(data.numero_documento, data.tipo_documento);
            }
            // Si el registro estaba en la papelera (activo = 0), permitir reactivación actualizando sus datos
            const direccionFinal = data.direccion_domiciliaria || data.direccion;
            const catFinal = data.categoria_laboral || data.categoria;
            const espFinal = data.especialidad_laboral || data.especialidad || '';
            const rucFinal = data.ruc_empleador || data.ruc_empresa || '';
            const reactivateStmt = this.db.prepare(`
        UPDATE participantes
        SET
          tipo_documento = ?,
          numero_documento = ?,
          nombres = ?,
          apellidos = ?,
          fecha_nacimiento = ?,
          celular = ?,
          correo = ?,
          direccion_domiciliaria = ?,
          direccion = ?,
          departamento = ?,
          provincia = ?,
          distrito = ?,
          ubigeo = ?,
          categoria_laboral = ?,
          categoria = ?,
          especialidad_laboral = ?,
          especialidad = ?,
          trabaja_en_obra = ?,
          ruc_empleador = ?,
          ruc_empresa = ?,
          no_conoce_ruc = ?,
          nombre_proyecto = ?,
          hijos_menores = ?,
          hijos_json = ?,
          consentimiento_datos_personales = ?,
          estado_sorteo = 'Participando',
          fecha_registro = ?,
          activo = 1,
          fecha_eliminacion = NULL
        WHERE id = ?
      `);
            reactivateStmt.run(data.tipo_documento || 'DNI', data.numero_documento, data.nombres, data.apellidos, data.fecha_nacimiento || '', data.celular, data.correo || '', direccionFinal, direccionFinal, data.departamento, data.provincia, data.distrito, data.ubigeo || '', catFinal, catFinal, espFinal, espFinal, data.trabaja_en_obra ? 1 : 0, rucFinal, rucFinal, data.no_conoce_ruc ? 1 : 0, data.nombre_proyecto || '', data.hijos_menores ?? 0, hijosJson, data.consentimiento_datos_personales ? 1 : 0, fechaRegistroIso, existente.id);
            const selectReactivatedStmt = this.db.prepare(`
        SELECT ${SELECT_COLUMNS}
        FROM participantes
        WHERE id = ?
      `);
            const reactivatedRow = selectReactivatedStmt.get(existente.id);
            return this.mapRowToEntity(reactivatedRow);
        }
        const direccionFinal = data.direccion_domiciliaria || data.direccion;
        const catFinal = data.categoria_laboral || data.categoria;
        const espFinal = data.especialidad_laboral || data.especialidad || '';
        const rucFinal = data.ruc_empleador || data.ruc_empresa || '';
        const insertStmt = this.db.prepare(`
      INSERT INTO participantes (
        tipo_documento,
        numero_documento,
        nombres,
        apellidos,
        fecha_nacimiento,
        celular,
        correo,
        direccion_domiciliaria,
        direccion,
        departamento,
        provincia,
        distrito,
        ubigeo,
        categoria_laboral,
        categoria,
        especialidad_laboral,
        especialidad,
        trabaja_en_obra,
        ruc_empleador,
        ruc_empresa,
        no_conoce_ruc,
        nombre_proyecto,
        hijos_menores,
        hijos_json,
        consentimiento_datos_personales,
        estado_sorteo,
        fecha_registro,
        activo,
        fecha_eliminacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Participando', ?, 1, NULL)
    `);
        try {
            const result = insertStmt.run(data.tipo_documento || 'DNI', data.numero_documento, data.nombres, data.apellidos, data.fecha_nacimiento || '', data.celular, data.correo || '', direccionFinal, direccionFinal, data.departamento, data.provincia, data.distrito, data.ubigeo || '', catFinal, catFinal, espFinal, espFinal, data.trabaja_en_obra ? 1 : 0, rucFinal, rucFinal, data.no_conoce_ruc ? 1 : 0, data.nombre_proyecto || '', data.hijos_menores ?? 0, hijosJson, data.consentimiento_datos_personales ? 1 : 0, fechaRegistroIso);
            const newId = Number(result.lastInsertRowid);
            const selectByIdStmt = this.db.prepare(`
        SELECT ${SELECT_COLUMNS}
        FROM participantes
        WHERE id = ?
      `);
            const createdRow = selectByIdStmt.get(newId);
            return this.mapRowToEntity(createdRow);
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            if (errMsg.includes('UNIQUE constraint failed')) {
                throw new AppError_1.DuplicateDocumentError(data.numero_documento, data.tipo_documento);
            }
            throw error;
        }
    }
    /**
     * Obtiene todos los registros activos (`WHERE activo = 1`).
     */
    async obtenerTodos() {
        const stmt = this.db.prepare(`
      SELECT ${SELECT_COLUMNS}
      FROM participantes
      WHERE activo = 1
      ORDER BY datetime(fecha_registro) DESC, id DESC
    `);
        const rows = stmt.all();
        return rows.map((row) => this.mapRowToEntity(row));
    }
    /**
     * Obtiene todos los registros en la papelera (`WHERE activo = 0`).
     */
    async obtenerEliminados() {
        const stmt = this.db.prepare(`
      SELECT ${SELECT_COLUMNS}
      FROM participantes
      WHERE activo = 0
      ORDER BY datetime(fecha_eliminacion) DESC, id DESC
    `);
        const rows = stmt.all();
        return rows.map((row) => this.mapRowToEntity(row));
    }
    /**
     * Borrado lógico (Soft Delete): envía el registro a la papelera.
     */
    async eliminar(id) {
        const stmt = this.db.prepare(`
      UPDATE participantes
      SET activo = 0, fecha_eliminacion = datetime('now')
      WHERE id = ?
    `);
        const result = stmt.run(id);
        return Number(result.changes) > 0;
    }
    /**
     * Restaura un registro eliminado de vuelta al padrón activo.
     */
    async restaurar(id) {
        const stmt = this.db.prepare(`
      UPDATE participantes
      SET activo = 1, fecha_eliminacion = NULL
      WHERE id = ?
    `);
        const result = stmt.run(id);
        return Number(result.changes) > 0;
    }
}
exports.SqliteParticipanteRepository = SqliteParticipanteRepository;
//# sourceMappingURL=SqliteParticipanteRepository.js.map