import { ParticipanteDTO } from '../../core/dtos/ParticipanteDTO';
import { HijoMenor, TipoDocumento } from '../../core/entities/Participante';
import { AppError } from '../../core/errors/AppError';

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;'
};

/**
 * Escapa caracteres especiales HTML para prevenir ataques Cross-Site Scripting (XSS).
 */
export function escapeHtml(raw: string): string {
  return raw.replace(/[&<>"'/`]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Limpia espacios extremos, elimina caracteres de control invisibles,
 * normaliza espacios múltiples y escapa caracteres peligrosos contra XSS.
 */
export function sanitizeString(value: unknown, maxLength = 250): string {
  if (typeof value !== 'string') {
    return '';
  }
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);

  return escapeHtml(cleaned);
}

/**
 * Sanitiza correo electrónico preservando caracteres válidos RFC 5322 pero eliminando espacios.
 */
export function sanitizeEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().slice(0, 150);
}

/**
 * Expresión regular estándar RFC 5322 para validación de correo electrónico.
 */
export const RFC_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function parseBooleanField(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') {
    const normalized = val.trim().toLowerCase();
    return ['true', '1', 'sí', 'si', 'on', 'yes'].includes(normalized);
  }
  return false;
}

const VALID_CATEGORIES = new Set(['Peón', 'Peon', 'Oficial', 'Operario']);

/**
 * Valida y sanitiza la carga útil según la matriz oficial de datos de la campaña CONA:
 * 1. Documento de Identidad:
 *    - tipo_documento: 'DNI' | 'Carnet de Extranjería' *
 *    - numero_documento: 8 dígitos (DNI) o 9 dígitos (Carnet de Extranjería) *
 * 2. Identificación Personal:
 *    - apellidos *
 *    - nombres *
 * 3. Contacto y Residencia:
 *    - celular (9 dígitos) *
 *    - correo (opcional, RFC válido)
 *    - direccion (obligatorio) *
 *    - departamento, provincia, distrito *
 * 4. Datos Laborales:
 *    - ruc_empresa (opcional, 11 dígitos numéricos si se llena)
 *    - nombre_proyecto (opcional)
 *    - categoria ('Peón' | 'Oficial' | 'Operario') *
 *    - especialidad (opcional)
 * 5. Hijos menores + Consentimiento *
 */
export function validateAndSanitizeParticipanteDTO(raw: Record<string, unknown>): ParticipanteDTO {
  // 1. Documento de Identidad
  const rawTipoDoc = String(raw.tipo_documento ?? 'DNI').trim();
  let tipo_documento: TipoDocumento;

  if (
    rawTipoDoc === 'Carné de extranjería' ||
    rawTipoDoc === 'Carnet de Extranjería' ||
    rawTipoDoc === 'Carnet de Extranjeria' ||
    rawTipoDoc === 'CE'
  ) {
    tipo_documento = 'Carné de extranjería';
  } else if (rawTipoDoc === 'Pasaporte') {
    tipo_documento = 'Pasaporte';
  } else if (
    rawTipoDoc === 'Permiso temporal de permanencia' ||
    rawTipoDoc === 'PTP'
  ) {
    tipo_documento = 'Permiso temporal de permanencia';
  } else if (rawTipoDoc === 'Otro documento') {
    tipo_documento = 'Otro documento';
  } else if (rawTipoDoc === 'DNI') {
    tipo_documento = 'DNI';
  } else {
    throw new AppError(
      'Selecciona un tipo de documento válido (DNI, Carné de extranjería, Pasaporte, Permiso temporal de permanencia u Otro documento).',
      400,
      'INVALID_DOCUMENT_TYPE'
    );
  }

  let numero_documento = String(raw.numero_documento ?? raw.dni ?? '').trim();

  if (tipo_documento === 'DNI') {
    numero_documento = numero_documento.replace(/\D/g, '');
    if (!/^[0-9]{8}$/.test(numero_documento)) {
      throw new AppError(
        'Ingresa exactamente 8 dígitos numéricos para el DNI.',
        400,
        'INVALID_DNI_FORMAT'
      );
    }
  } else if (tipo_documento === 'Carné de extranjería' || (tipo_documento as string) === 'Carnet de Extranjería') {
    numero_documento = numero_documento.replace(/\D/g, '');
    if (!/^[0-9]{9}$/.test(numero_documento)) {
      throw new AppError(
        'Ingresa exactamente 9 dígitos numéricos para el Carné de extranjería.',
        400,
        'INVALID_CE_FORMAT'
      );
    }
  } else {
    numero_documento = sanitizeString(numero_documento, 30);
    if (numero_documento.length < 4 || numero_documento.length > 25) {
      throw new AppError(
        'Ingresa un número de documento válido para el tipo seleccionado (entre 4 y 25 caracteres).',
        400,
        'INVALID_DOCUMENT_NUMBER'
      );
    }
  }

  // 2. Identificación Personal (Apellidos y Nombres independientes)
  const nombres = sanitizeString(raw.nombres ?? raw.nombre, 100);
  if (nombres.length < 2) {
    throw new AppError('Ingresa tus nombres (mínimo 2 caracteres).', 400, 'INVALID_FIRSTNAME');
  }

  const apellidos = sanitizeString(raw.apellidos, 100);
  if (apellidos.length < 2) {
    throw new AppError('Ingresa tus apellidos (mínimo 2 caracteres).', 400, 'INVALID_LASTNAME');
  }

  // Fecha de nacimiento (AAAA-MM-DD)
  let fecha_nacimiento = String(raw.fecha_nacimiento ?? '').trim();
  if (!fecha_nacimiento) {
    fecha_nacimiento = '1990-01-01'; // Fallback prudente para retrocompatibilidad
  } else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_nacimiento)) {
      throw new AppError(
        'Ingresa una fecha de nacimiento válida (AAAA-MM-DD).',
        400,
        'INVALID_BIRTHDATE'
      );
    }
  }

  // 3. Contacto y Residencia
  const celular = String(raw.celular ?? '')
    .replace(/\D/g, '')
    .trim();
  if (!/^[0-9]{9}$/.test(celular)) {
    throw new AppError(
      'Ingresa exactamente 9 dígitos numéricos para el teléfono celular.',
      400,
      'INVALID_PHONE'
    );
  }

  const correo = sanitizeEmail(raw.correo);
  if (correo && !RFC_EMAIL_REGEX.test(correo)) {
    throw new AppError(
      'Si ingresas un correo electrónico, debe tener un formato válido.',
      400,
      'INVALID_EMAIL'
    );
  }

  const direccion = sanitizeString(raw.direccion_domiciliaria ?? raw.direccion, 200);
  if (direccion.length < 3) {
    throw new AppError(
      'Ingresa tu dirección domiciliaria completa.',
      400,
      'REQUIRED_ADDRESS'
    );
  }

  const departamento = sanitizeString(raw.departamento, 60);
  const provincia = sanitizeString(raw.provincia, 60);
  const distrito = sanitizeString(raw.distrito, 60);
  if (!departamento || !provincia || !distrito) {
    throw new AppError(
      'Selecciona departamento, provincia y distrito.',
      400,
      'INCOMPLETE_LOCATION'
    );
  }

  const ubigeo = String(raw.ubigeo || '')
    .replace(/\D/g, '')
    .slice(0, 6);

  // 4. Información Laboral
  const rawCategoria = String(raw.categoria_laboral ?? raw.categoria ?? '').trim();
  if (!rawCategoria || !VALID_CATEGORIES.has(rawCategoria)) {
    throw new AppError(
      'Selecciona una categoría laboral válida (Peón, Oficial u Operario).',
      400,
      'REQUIRED_CATEGORY'
    );
  }
  const categoria = rawCategoria === 'Peon' ? 'Peón' : sanitizeString(rawCategoria, 40);
  const categoria_laboral = categoria;

  const especialidad = sanitizeString(raw.especialidad_laboral ?? raw.especialidad, 120);
  const especialidad_laboral = especialidad;

  // Pregunta: ¿Actualmente trabajas en una obra de construcción civil?
  const trabaja_en_obra = raw.trabaja_en_obra !== undefined
    ? parseBooleanField(raw.trabaja_en_obra)
    : true;

  let ruc_empleador = '';
  let no_conoce_ruc = false;
  let nombre_proyecto = '';

  if (trabaja_en_obra) {
    no_conoce_ruc = parseBooleanField(raw.no_conoce_ruc ?? false);
    const rawRuc = String(raw.ruc_empleador ?? raw.ruc_empresa ?? '')
      .replace(/\D/g, '')
      .trim();

    if (!no_conoce_ruc && rawRuc.length > 0) {
      if (!/^[0-9]{11}$/.test(rawRuc)) {
        throw new AppError(
          'Si ingresas el RUC del empleador, debe tener exactamente 11 dígitos numéricos.',
          400,
          'INVALID_RUC'
        );
      }
      ruc_empleador = rawRuc;
    } else if (!no_conoce_ruc && raw.ruc_empleador !== undefined && String(raw.ruc_empleador).trim() === '') {
      // Opcional o justificado si no conoce RUC
      ruc_empleador = '';
    } else {
      ruc_empleador = rawRuc;
    }

    nombre_proyecto = sanitizeString(raw.nombre_proyecto, 150);
  }

  const ruc_empresa = ruc_empleador;

  // 5. Hijos menores de edad
  let rawHijosArray: unknown[] = [];
  if (Array.isArray(raw.hijos)) {
    rawHijosArray = raw.hijos;
  } else if (typeof raw.hijos_json === 'string' && raw.hijos_json.trim()) {
    try {
      const parsed = JSON.parse(raw.hijos_json);
      if (Array.isArray(parsed)) {
        rawHijosArray = parsed;
      }
    } catch {
      rawHijosArray = [];
    }
  }

  const hijos_detalle: HijoMenor[] = [];
  for (let i = 0; i < Math.min(rawHijosArray.length, 20); i++) {
    const item = rawHijosArray[i] as Record<string, unknown>;
    const edadNum = Number.parseInt(String(item?.edad ?? ''), 10);
    if (Number.isNaN(edadNum) || edadNum < 0 || edadNum > 17) {
      throw new AppError(
        `Indica una edad válida (0 a 17 años) para el hijo(a) ${i + 1}.`,
        400,
        'INVALID_CHILD_AGE'
      );
    }
    const sexoRaw = String(item?.sexo ?? '').trim();
    if (sexoRaw !== 'Masculino' && sexoRaw !== 'Femenino') {
      throw new AppError(
        `Selecciona el sexo para el hijo(a) ${i + 1}.`,
        400,
        'INVALID_CHILD_SEX'
      );
    }
    hijos_detalle.push({ orden: i + 1, edad: edadNum, sexo: sexoRaw });
  }

  const hijos_menores = Math.max(
    0,
    Math.min(
      20,
      raw.hijos_menores !== undefined
        ? Number.parseInt(String(raw.hijos_menores), 10) || 0
        : hijos_detalle.length
    )
  );

  const consentimiento_datos_personales = parseBooleanField(
    raw.consentimiento_datos_personales ?? raw.acepta_terminos
  );
  if (!consentimiento_datos_personales) {
    throw new AppError(
      'Debes autorizar el tratamiento de tus datos personales para participar.',
      400,
      'CONSENT_REQUIRED'
    );
  }

  return {
    tipo_documento,
    numero_documento,
    nombres,
    apellidos,
    fecha_nacimiento,
    celular,
    correo: correo ? escapeHtml(correo) : '',
    direccion_domiciliaria: direccion,
    direccion,
    departamento,
    provincia,
    distrito,
    ubigeo,
    categoria_laboral,
    categoria,
    especialidad_laboral: especialidad,
    especialidad,
    trabaja_en_obra,
    ruc_empleador,
    ruc_empresa,
    no_conoce_ruc,
    nombre_proyecto,
    hijos_menores,
    hijos_json: JSON.stringify(hijos_detalle),
    hijos_detalle,
    consentimiento_datos_personales
  };
}

