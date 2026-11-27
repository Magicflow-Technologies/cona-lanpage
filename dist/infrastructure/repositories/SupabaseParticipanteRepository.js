"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseParticipanteRepository = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const AppError_1 = require("../../core/errors/AppError");
/**
 * Adaptador de Persistencia para Supabase (PostgreSQL).
 * Implementa IParticipanteRepository con soporte para borrado lógico (Soft Delete).
 */
class SupabaseParticipanteRepository {
    client = null;
    supabaseUrl;
    supabaseKey;
    constructor() {
        this.supabaseUrl = (process.env.SUPABASE_URL || '').trim();
        this.supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_KEY ||
            process.env.SUPABASE_ANON_KEY ||
            '').trim();
    }
    getClient() {
        if (this.client) {
            return this.client;
        }
        if (!this.supabaseUrl || !this.supabaseKey) {
            throw new AppError_1.AppError('Faltan variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno (.env).', 500, 'SUPABASE_CONFIG_MISSING');
        }
        const schema = (process.env.SUPABASE_SCHEMA || 'cona').trim();
        this.client = (0, supabase_js_1.createClient)(this.supabaseUrl, this.supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            },
            db: {
                schema
            }
        });
        return this.client;
    }
    mapRowToEntity(row) {
        let parsedHijos = [];
        if (Array.isArray(row.hijos_json)) {
            parsedHijos = row.hijos_json;
        }
        else if (typeof row.hijos_json === 'string') {
            try {
                parsedHijos = JSON.parse(row.hijos_json);
            }
            catch {
                parsedHijos = [];
            }
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
        const apellidos = row.apellidos || '';
        const nombres = row.nombres || '';
        const nombresApellidos = `${nombres} ${apellidos}`.trim();
        const direccionDom = row.direccion_domiciliaria || row.direccion || '';
        const catLaboral = row.categoria_laboral || row.categoria || 'Operario';
        const espLaboral = row.especialidad_laboral || row.especialidad || '';
        const rucEmp = row.ruc_empleador || row.ruc_empresa || '';
        const trabajaEnObra = row.trabaja_en_obra === undefined ? true : Boolean(row.trabaja_en_obra);
        const noConoceRuc = row.no_conoce_ruc === undefined ? false : Boolean(row.no_conoce_ruc);
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
            hijos_json: typeof row.hijos_json === 'string' ? row.hijos_json : JSON.stringify(parsedHijos),
            hijos_detalle: parsedHijos,
            consentimiento_datos_personales: Boolean(row.consentimiento_datos_personales),
            estado_sorteo: row.estado_sorteo || 'Participando',
            dispositivo: row.dispositivo || 'No detectado',
            navegador: row.navegador || 'No detectado',
            fecha_registro: row.fecha_registro,
            activo: row.activo === undefined ? true : (row.activo === 1 || row.activo === true),
            fecha_eliminacion: row.fecha_eliminacion ?? null,
            dni: row.numero_documento,
            nombres_apellidos: nombresApellidos
        };
    }
    async crear(data) {
        const supabase = this.getClient();
        const insertPayload = {
            tipo_documento: data.tipo_documento || 'DNI',
            numero_documento: data.numero_documento,
            nombres: data.nombres,
            apellidos: data.apellidos,
            fecha_nacimiento: data.fecha_nacimiento || '',
            celular: data.celular,
            correo: data.correo || '',
            direccion_domiciliaria: data.direccion || '',
            direccion: data.direccion || '',
            departamento: data.departamento,
            provincia: data.provincia,
            distrito: data.distrito,
            ubigeo: data.ubigeo || '',
            categoria_laboral: data.categoria,
            categoria: data.categoria,
            especialidad_laboral: data.especialidad || '',
            especialidad: data.especialidad || '',
            trabaja_en_obra: data.trabaja_en_obra ? 1 : 0,
            ruc_empleador: data.ruc_empresa || '',
            ruc_empresa: data.ruc_empresa || '',
            no_conoce_ruc: data.no_conoce_ruc ? 1 : 0,
            nombre_proyecto: data.nombre_proyecto || '',
            hijos_menores: data.hijos_menores || 0,
            hijos_json: data.hijos_detalle || [],
            consentimiento_datos_personales: data.consentimiento_datos_personales ? 1 : 0,
            estado_sorteo: 'Participando',
            dispositivo: data.dispositivo || 'No detectado',
            navegador: data.navegador || 'No detectado',
            activo: 1,
            fecha_eliminacion: null
        };
        const { data: inserted, error } = await supabase
            .from('participantes')
            .insert(insertPayload)
            .select()
            .single();
        if (error) {
            if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
                throw new AppError_1.DuplicateDocumentError(data.numero_documento);
            }
            console.error('[Supabase.crear] Error:', error);
            throw new AppError_1.AppError(`Error al registrar en Supabase: ${error.message}`, 500);
        }
        return this.mapRowToEntity(inserted);
    }
    async buscarPorDni(numeroDocumento) {
        const supabase = this.getClient();
        const { data, error } = await supabase
            .from('participantes')
            .select('*')
            .eq('numero_documento', numeroDocumento)
            .limit(1)
            .maybeSingle();
        if (error || !data) {
            return null;
        }
        return this.mapRowToEntity(data);
    }
    async buscarPorDocumento(tipoDoc, numDoc) {
        const supabase = this.getClient();
        const { data, error } = await supabase
            .from('participantes')
            .select('*')
            .eq('tipo_documento', tipoDoc)
            .eq('numero_documento', numDoc)
            .limit(1)
            .maybeSingle();
        if (error || !data) {
            return this.buscarPorDni(numDoc);
        }
        return this.mapRowToEntity(data);
    }
    async obtenerTodos() {
        const supabase = this.getClient();
        const { data, error } = await supabase
            .from('participantes')
            .select('*')
            .or('activo.eq.1,activo.is.null')
            .order('id', { ascending: false });
        if (error || !data) {
            console.error('[Supabase.obtenerTodos] Error:', error);
            return [];
        }
        return data.map((r) => this.mapRowToEntity(r));
    }
    async obtenerEliminados() {
        const supabase = this.getClient();
        const { data, error } = await supabase
            .from('participantes')
            .select('*')
            .eq('activo', 0)
            .order('fecha_eliminacion', { ascending: false });
        if (error || !data) {
            console.error('[Supabase.obtenerEliminados] Error:', error);
            return [];
        }
        return data.map((r) => this.mapRowToEntity(r));
    }
    async eliminar(id) {
        const supabase = this.getClient();
        const { error } = await supabase
            .from('participantes')
            .update({
            activo: 0,
            fecha_eliminacion: new Date().toISOString()
        })
            .eq('id', id);
        if (error) {
            console.error('[Supabase.eliminar] Error:', error);
            return false;
        }
        return true;
    }
    async restaurar(id) {
        const supabase = this.getClient();
        const { error } = await supabase
            .from('participantes')
            .update({
            activo: 1,
            fecha_eliminacion: null
        })
            .eq('id', id);
        if (error) {
            console.error('[Supabase.restaurar] Error:', error);
            return false;
        }
        return true;
    }
}
exports.SupabaseParticipanteRepository = SupabaseParticipanteRepository;
//# sourceMappingURL=SupabaseParticipanteRepository.js.map