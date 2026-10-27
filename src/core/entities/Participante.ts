export interface HijoMenor {
  orden: number;
  edad: number;
  sexo: 'Masculino' | 'Femenino';
}

export type TipoDocumento = 'DNI' | 'Carnet de Extranjería';

export interface Participante {
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
  categoria: 'Peón' | 'Oficial' | 'Operario' | string;
  especialidad: string;
  hijos_menores: number;
  hijos_json: string;
  hijos_detalle: HijoMenor[];
  consentimiento_datos_personales: boolean;
  estado_sorteo: 'Participando' | 'Excluido';
  fecha_registro: string;
  // Propiedades de compatibilidad
  dni?: string;
  nombres_apellidos?: string;
}
