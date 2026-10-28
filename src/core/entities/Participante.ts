export interface HijoMenor {
  orden: number;
  edad: number;
  sexo: 'Masculino' | 'Femenino';
}

export type TipoDocumento =
  | 'DNI'
  | 'Carné de extranjería'
  | 'Carnet de Extranjería'
  | 'Pasaporte'
  | 'Permiso temporal de permanencia'
  | 'Otro documento';

export interface Participante {
  id: number;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  celular: string;
  correo: string;
  direccion_domiciliaria: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  categoria_laboral: string;
  categoria: string;
  especialidad_laboral: string;
  especialidad: string;
  trabaja_en_obra: boolean;
  ruc_empleador: string;
  ruc_empresa: string;
  no_conoce_ruc: boolean;
  nombre_proyecto: string;
  hijos_menores: number;
  hijos_json: string;
  hijos_detalle: HijoMenor[];
  consentimiento_datos_personales: boolean;
  estado_sorteo: 'Participando' | 'Excluido';
  fecha_registro: string;
  activo: boolean;
  fecha_eliminacion: string | null;
  // Propiedades de compatibilidad
  dni?: string;
  nombres_apellidos?: string;
}

