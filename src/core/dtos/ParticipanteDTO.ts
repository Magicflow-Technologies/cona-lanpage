import { HijoMenor, TipoDocumento } from '../entities/Participante';

export interface ParticipanteDTO {
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
  hijos_json: string;
  hijos_detalle: HijoMenor[];
  consentimiento_datos_personales: boolean;
}
