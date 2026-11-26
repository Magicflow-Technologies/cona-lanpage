import dotenv from 'dotenv';
import { getSqliteConnection } from '../infrastructure/database/sqlite';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function migrate() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  console.log('Conectando a SQLite local...');
  const db = getSqliteConnection();
  const rows = db.prepare('SELECT * FROM participantes ORDER BY id ASC').all() as any[];

  console.log(`Se encontraron ${rows.length} registros en SQLite.`);

  if (rows.length === 0) {
    console.log('No hay registros que migrar.');
    return;
  }

  let exitosos = 0;
  let duplicados = 0;
  let fallidos = 0;

  for (const row of rows) {
    let parsedHijos: any = [];
    try {
      parsedHijos = JSON.parse(row.hijos_json || '[]');
    } catch {
      parsedHijos = [];
    }

    const payload = {
      tipo_documento: row.tipo_documento || 'DNI',
      numero_documento: row.numero_documento,
      nombres: row.nombres || '',
      apellidos: row.apellidos || '',
      fecha_nacimiento: row.fecha_nacimiento || '',
      celular: row.celular || '',
      correo: row.correo || '',
      direccion_domiciliaria: row.direccion_domiciliaria || row.direccion || '',
      direccion: row.direccion || '',
      departamento: row.departamento || '',
      provincia: row.provincia || '',
      distrito: row.distrito || '',
      ubigeo: row.ubigeo || '',
      categoria_laboral: row.categoria_laboral || row.categoria || '',
      categoria: row.categoria || row.categoria_laboral || '',
      especialidad_laboral: row.especialidad_laboral || row.especialidad || '',
      especialidad: row.especialidad || '',
      trabaja_en_obra: row.trabaja_en_obra ?? 1,
      ruc_empleador: row.ruc_empleador || row.ruc_empresa || '',
      ruc_empresa: row.ruc_empresa || '',
      no_conoce_ruc: row.no_conoce_ruc ?? 0,
      nombre_proyecto: row.nombre_proyecto || '',
      hijos_menores: row.hijos_menores || 0,
      hijos_json: parsedHijos,
      consentimiento_datos_personales: row.consentimiento_datos_personales ?? 1,
      estado_sorteo: row.estado_sorteo || 'Participando',
      dispositivo: row.dispositivo || 'No detectado',
      navegador: row.navegador || 'No detectado',
      fecha_registro: row.fecha_registro || new Date().toISOString(),
      activo: row.activo ?? 1,
      fecha_eliminacion: row.fecha_eliminacion || null
    };

    const { error } = await supabase.from('participantes').insert(payload);
    if (!error) {
      exitosos++;
    } else if (error.code === '23505' || error.message?.includes('duplicate key')) {
      duplicados++;
    } else {
      console.error(`Error en participante ${row.numero_documento}:`, error.message);
      fallidos++;
    }
  }

  console.log('============================================');
  console.log(`MIGRACIÓN COMPLETADA:`);
  console.log(`- Insertados exitosamente: ${exitosos}`);
  console.log(`- Ya existentes / duplicados: ${duplicados}`);
  console.log(`- Fallidos: ${fallidos}`);
  console.log('============================================');
}

migrate().catch(console.error);
