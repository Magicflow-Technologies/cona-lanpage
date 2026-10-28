import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

export interface PreparedStatementLike {
  run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

export interface SqliteConnection {
  exec(sql: string): void;
  prepare(sql: string): PreparedStatementLike;
  close(): void;
}

let dbInstance: SqliteConnection | null = null;

/**
 * Inicializa y devuelve la conexión singleton a `cona_campana.db` ubicada en la raíz del proyecto (`D:\CONA\Cona`).
 * - Comprueba si el archivo `cona_campana.db` existe; si no existe, lo crea automáticamente.
 * - Ejecuta automáticamente la creación/migración de la tabla `participantes` al arrancar.
 */
export function getSqliteConnection(): SqliteConnection {
  if (dbInstance) {
    return dbInstance;
  }

  const projectRoot = path.resolve(__dirname, '../../../');
  const configuredPath = process.env.DB_PATH || './cona_campana.db';
  const resolvedDbPath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(projectRoot, configuredPath);
  const dbDir = path.dirname(resolvedDbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const fileAlreadyExisted = fs.existsSync(resolvedDbPath);
  if (!fileAlreadyExisted) {
    console.log(
      `[SQLite] El archivo '${path.basename(resolvedDbPath)}' no existe. Creándolo automáticamente en: ${resolvedDbPath}`
    );
    fs.closeSync(fs.openSync(resolvedDbPath, 'w'));
  } else {
    console.log(`[SQLite] Base de datos detectada en: ${resolvedDbPath}`);
  }

  try {
    const db = new Database(resolvedDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    dbInstance = db as unknown as SqliteConnection;
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(resolvedDbPath);
    db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    dbInstance = db as SqliteConnection;
  }

  initializeSchema(dbInstance);
  return dbInstance;
}

/**
 * Ejecuta automáticamente la creación/actualización de la tabla `participantes`
 * con la matriz oficial de datos de la campaña CONA y soporte Soft Delete (`activo`, `fecha_eliminacion`).
 */
export function initializeSchema(db: SqliteConnection): void {
  const tableInfo = db.prepare(`PRAGMA table_info(participantes)`).all() as Array<{ name: string }>;
  const existingCols = new Set(tableInfo.map((c) => c.name));

  const requiredColumns = [
    'tipo_documento',
    'numero_documento',
    'apellidos',
    'nombres',
    'celular',
    'correo',
    'direccion',
    'departamento',
    'provincia',
    'distrito',
    'ruc_empresa',
    'nombre_proyecto',
    'categoria',
    'especialidad',
    'hijos_json',
    'fecha_registro'
  ];

  const needsMigration =
    tableInfo.length > 0 && requiredColumns.some((col) => !existingCols.has(col));

  if (needsMigration) {
    console.log('[SQLite] Migrando tabla `participantes` a la nueva matriz oficial de datos...');
    const numDocExpr = existingCols.has('numero_documento')
      ? 'numero_documento'
      : existingCols.has('dni')
      ? 'dni'
      : "''";
    const tipoDocExpr = existingCols.has('tipo_documento')
      ? "COALESCE(NULLIF(tipo_documento, ''), 'DNI')"
      : "'DNI'";
    const apellidosExpr = existingCols.has('apellidos')
      ? 'apellidos'
      : existingCols.has('nombres_apellidos')
      ? 'nombres_apellidos'
      : "''";
    const nombresExpr = existingCols.has('nombres')
      ? 'nombres'
      : existingCols.has('nombres_apellidos')
      ? 'nombres_apellidos'
      : "''";
    const direccionExpr = existingCols.has('direccion')
      ? "COALESCE(direccion, '')"
      : "''";
    const ubigeoExpr = existingCols.has('ubigeo') ? "COALESCE(ubigeo, '')" : "''";
    const rucExpr = existingCols.has('ruc_empresa') ? "COALESCE(ruc_empresa, '')" : "''";
    const proyectoExpr = existingCols.has('nombre_proyecto')
      ? "COALESCE(nombre_proyecto, '')"
      : "''";
    const especialidadExpr = existingCols.has('especialidad')
      ? "COALESCE(especialidad, '')"
      : "''";
    const hijosMenoresExpr = existingCols.has('hijos_menores')
      ? 'COALESCE(hijos_menores, 0)'
      : '0';
    const hijosJsonExpr = existingCols.has('hijos_json')
      ? "COALESCE(hijos_json, '[]')"
      : existingCols.has('hijos_detalle')
      ? "COALESCE(hijos_detalle, '[]')"
      : "'[]'";
    const consentExpr = existingCols.has('consentimiento_datos_personales')
      ? 'COALESCE(consentimiento_datos_personales, 1)'
      : '1';
    const estadoExpr = existingCols.has('estado_sorteo')
      ? "COALESCE(estado_sorteo, 'Participando')"
      : "'Participando'";
    const activoExpr = existingCols.has('activo') ? 'COALESCE(activo, 1)' : '1';
    const fechaEliminacionExpr = existingCols.has('fecha_eliminacion')
      ? 'fecha_eliminacion'
      : 'NULL';

    db.exec(`
      BEGIN TRANSACTION;
      CREATE TABLE participantes_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_documento TEXT NOT NULL DEFAULT 'DNI',
        numero_documento TEXT NOT NULL UNIQUE,
        apellidos TEXT NOT NULL,
        nombres TEXT NOT NULL,
        celular TEXT NOT NULL,
        correo TEXT NOT NULL DEFAULT '',
        direccion TEXT NOT NULL,
        departamento TEXT NOT NULL,
        provincia TEXT NOT NULL,
        distrito TEXT NOT NULL,
        ubigeo TEXT NOT NULL DEFAULT '',
        ruc_empresa TEXT NOT NULL DEFAULT '',
        nombre_proyecto TEXT NOT NULL DEFAULT '',
        categoria TEXT NOT NULL,
        especialidad TEXT NOT NULL DEFAULT '',
        hijos_menores INTEGER NOT NULL DEFAULT 0,
        hijos_json TEXT NOT NULL DEFAULT '[]',
        consentimiento_datos_personales INTEGER NOT NULL CHECK (consentimiento_datos_personales IN (0, 1)) DEFAULT 1,
        estado_sorteo TEXT NOT NULL DEFAULT 'Participando',
        fecha_registro TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        activo INTEGER NOT NULL DEFAULT 1,
        fecha_eliminacion TEXT NULL
      );
      INSERT OR IGNORE INTO participantes_new (
        id, tipo_documento, numero_documento, apellidos, nombres,
        celular, correo, direccion, departamento, provincia, distrito, ubigeo,
        ruc_empresa, nombre_proyecto, categoria, especialidad,
        hijos_menores, hijos_json, consentimiento_datos_personales, estado_sorteo,
        fecha_registro, activo, fecha_eliminacion
      )
      SELECT
        id,
        ${tipoDocExpr},
        ${numDocExpr},
        ${apellidosExpr},
        ${nombresExpr},
        COALESCE(celular, ''),
        COALESCE(correo, ''),
        ${direccionExpr},
        COALESCE(NULLIF(departamento, ''), 'Lima'),
        COALESCE(NULLIF(provincia, ''), 'Lima'),
        COALESCE(NULLIF(distrito, ''), 'La Victoria'),
        ${ubigeoExpr},
        ${rucExpr},
        ${proyectoExpr},
        COALESCE(NULLIF(categoria, ''), 'Operario'),
        ${especialidadExpr},
        ${hijosMenoresExpr},
        ${hijosJsonExpr},
        ${consentExpr},
        ${estadoExpr},
        COALESCE(fecha_registro, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        ${activoExpr},
        ${fechaEliminacionExpr}
      FROM participantes;
      DROP TABLE participantes;
      ALTER TABLE participantes_new RENAME TO participantes;
      COMMIT;
    `);
  }

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS participantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo_documento TEXT NOT NULL DEFAULT 'DNI',
      numero_documento TEXT NOT NULL UNIQUE,
      nombres TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      fecha_nacimiento TEXT NOT NULL DEFAULT '',
      celular TEXT NOT NULL,
      correo TEXT NOT NULL DEFAULT '',
      direccion_domiciliaria TEXT NOT NULL DEFAULT '',
      direccion TEXT NOT NULL DEFAULT '',
      departamento TEXT NOT NULL,
      provincia TEXT NOT NULL,
      distrito TEXT NOT NULL,
      ubigeo TEXT NOT NULL DEFAULT '',
      categoria_laboral TEXT NOT NULL DEFAULT '',
      categoria TEXT NOT NULL DEFAULT '',
      especialidad_laboral TEXT NOT NULL DEFAULT '',
      especialidad TEXT NOT NULL DEFAULT '',
      trabaja_en_obra INTEGER NOT NULL DEFAULT 1,
      ruc_empleador TEXT NOT NULL DEFAULT '',
      ruc_empresa TEXT NOT NULL DEFAULT '',
      no_conoce_ruc INTEGER NOT NULL DEFAULT 0,
      nombre_proyecto TEXT NOT NULL DEFAULT '',
      hijos_menores INTEGER NOT NULL DEFAULT 0,
      hijos_json TEXT NOT NULL DEFAULT '[]',
      consentimiento_datos_personales INTEGER NOT NULL CHECK (consentimiento_datos_personales IN (0, 1)) DEFAULT 1,
      estado_sorteo TEXT NOT NULL DEFAULT 'Participando',
      fecha_registro TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      activo INTEGER NOT NULL DEFAULT 1,
      fecha_eliminacion TEXT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_participantes_tipo_num_doc_unique
      ON participantes (tipo_documento, numero_documento);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_participantes_numero_documento_unique
      ON participantes (numero_documento);

    CREATE INDEX IF NOT EXISTS idx_participantes_fecha
      ON participantes (fecha_registro DESC);
  `;

  db.exec(createTableSQL);

  // Migración incremental para agregar columnas nuevas si la tabla ya existía sin ellas
  const currentCols = new Set(
    (db.prepare(`PRAGMA table_info(participantes)`).all() as Array<{ name: string }>).map(
      (c) => c.name
    )
  );

  if (!currentCols.has('activo')) {
    db.exec(`ALTER TABLE participantes ADD COLUMN activo INTEGER NOT NULL DEFAULT 1;`);
    console.log('[SQLite] Columna "activo" agregada a la tabla "participantes".');
  }

  if (!currentCols.has('fecha_eliminacion')) {
    db.exec(`ALTER TABLE participantes ADD COLUMN fecha_eliminacion TEXT NULL;`);
    console.log('[SQLite] Columna "fecha_eliminacion" agregada a la tabla "participantes".');
  }

  if (!currentCols.has('fecha_nacimiento')) {
    db.exec(`ALTER TABLE participantes ADD COLUMN fecha_nacimiento TEXT NOT NULL DEFAULT '';`);
    console.log('[SQLite] Columna "fecha_nacimiento" agregada a la tabla "participantes".');
  }

  if (!currentCols.has('direccion_domiciliaria')) {
    db.exec(`ALTER TABLE participantes ADD COLUMN direccion_domiciliaria TEXT NOT NULL DEFAULT '';`);
    db.exec(`UPDATE participantes SET direccion_domiciliaria = direccion WHERE direccion_domiciliaria = '' AND direccion IS NOT NULL;`);
    console.log('[SQLite] Columna "direccion_domiciliaria" agregada a la tabla "participantes".');
  }

  if (!currentCols.has('categoria_laboral')) {
    db.exec(`ALTER TABLE participantes ADD COLUMN categoria_laboral TEXT NOT NULL DEFAULT '';`);
    db.exec(`UPDATE participantes SET categoria_laboral = categoria WHERE categoria_laboral = '' AND categoria IS NOT NULL;`);
    console.log('[SQLite] Columna "categoria_laboral" agregada a la tabla "participantes".');
  }

  if (!currentCols.has('especialidad_laboral')) {
    db.exec(`ALTER TABLE participantes ADD COLUMN especialidad_laboral TEXT NOT NULL DEFAULT '';`);
    db.exec(`UPDATE participantes SET especialidad_laboral = especialidad WHERE especialidad_laboral = '' AND especialidad IS NOT NULL;`);
    console.log('[SQLite] Columna "especialidad_laboral" agregada a la tabla "participantes".');
  }

  if (!currentCols.has('trabaja_en_obra')) {
    db.exec(`ALTER TABLE participantes ADD COLUMN trabaja_en_obra INTEGER NOT NULL DEFAULT 1;`);
    console.log('[SQLite] Columna "trabaja_en_obra" agregada a la tabla "participantes".');
  }

  if (!currentCols.has('ruc_empleador')) {
    db.exec(`ALTER TABLE participantes ADD COLUMN ruc_empleador TEXT NOT NULL DEFAULT '';`);
    db.exec(`UPDATE participantes SET ruc_empleador = ruc_empresa WHERE ruc_empleador = '' AND ruc_empresa IS NOT NULL;`);
    console.log('[SQLite] Columna "ruc_empleador" agregada a la tabla "participantes".');
  }

  if (!currentCols.has('no_conoce_ruc')) {
    db.exec(`ALTER TABLE participantes ADD COLUMN no_conoce_ruc INTEGER NOT NULL DEFAULT 0;`);
    console.log('[SQLite] Columna "no_conoce_ruc" agregada a la tabla "participantes".');
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_participantes_activo ON participantes (activo);`);

  console.log('[SQLite] Tabla "participantes" verificada y lista para recibir registros.');
}
