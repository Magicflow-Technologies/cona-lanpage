-- =============================================================================
-- CONA - Campaña de actualización de datos (cona_campana.db)
-- Script DDL ejecutado automáticamente al arrancar el servidor
-- =============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

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

CREATE INDEX IF NOT EXISTS idx_participantes_activo
    ON participantes (activo);

