export interface HijoFormItem {
  orden: number;
  edad: number;
  sexo: 'Masculino' | 'Femenino';
}

export type TipoDocumento = 'DNI' | 'Carnet de Extranjería';

export interface ParticipantePayload {
  tipo_documento: TipoDocumento;
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
  categoria: 'Peón' | 'Oficial' | 'Operario' | string;
  especialidad: string;
  hijos_menores: number;
  sin_hijos: boolean;
  hijos: HijoFormItem[];
  hijos_json: string;
  consentimiento_datos_personales: boolean;
  version_consentimiento: string;
  fecha_registro: string;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  code?: string;
  message: string;
  data?: T;
}

export interface ParticipanteRecord {
  id: number;
  tipo_documento: TipoDocumento;
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
  hijos_json?: string;
  hijos_detalle?: HijoFormItem[];
  consentimiento_datos_personales: boolean;
  estado_sorteo: string;
  fecha_registro: string;
  dni?: string;
  nombres_apellidos?: string;
}
