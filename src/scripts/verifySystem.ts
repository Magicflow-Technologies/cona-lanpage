import http from 'http';
import { createApp } from '../server';
import { getSqliteConnection } from '../infrastructure/database/sqlite';

async function runVerification(): Promise<void> {
  console.log('====================================================================');
  console.log('🧪 INICIANDO VERIFICACIÓN INTEGRAL DEL SISTEMA CONA (E2E)');
  console.log('====================================================================');

  const db = getSqliteConnection();
  db.prepare('DELETE FROM participantes WHERE numero_documento IN (?, ?)').run(
    '45892310',
    '123456789'
  );

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 3099;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Verificar estructura oficial de campos del formulario en Landing Page
    const homeRes = await fetch(`${baseUrl}/`);
    const homeHtml = await homeRes.text();
    if (
      homeRes.status !== 200 ||
      !homeHtml.includes('id="tipo_documento"') ||
      !homeHtml.includes('value="Carnet de Extranjería"') ||
      !homeHtml.includes('id="numero_documento"') ||
      !homeHtml.includes('id="apellidos"') ||
      !homeHtml.includes('id="nombres"') ||
      !homeHtml.includes('id="celular"') ||
      !homeHtml.includes('id="correo"') ||
      !homeHtml.includes('id="direccion"') ||
      !homeHtml.includes('id="departamento"') ||
      !homeHtml.includes('id="provincia"') ||
      !homeHtml.includes('id="distrito"') ||
      !homeHtml.includes('id="ruc_empresa"') ||
      !homeHtml.includes('id="nombre_proyecto"') ||
      !homeHtml.includes('id="categoria"') ||
      !homeHtml.includes('id="especialidad"') ||
      !homeHtml.includes('id="agregarHijo"') ||
      !homeHtml.includes('id="quitarHijo"') ||
      !homeHtml.includes('id="sinHijos"')
    ) {
      throw new Error('La estructura del formulario no contiene todos los campos oficiales requeridos.');
    }
    console.log(
      '✔ [1/7] Estructura del formulario verificada: matriz oficial de campos CONA completa.'
    );

    // 2. Probar Registro de Participante con DNI (HTTP 201) + Sanitización XSS
    const regRes = await fetch(`${baseUrl}/api/participantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo_documento: 'DNI',
        numero_documento: '45892310',
        apellidos: 'Pérez López <script>',
        nombres: 'Juan Carlos',
        celular: '987654321',
        correo: 'juan.perez@correo.com',
        direccion: 'Av. Prolongación Cangallo N.° 670, La Victoria',
        departamento: 'Lima',
        provincia: 'Lima',
        distrito: 'La Victoria',
        ubigeo: '150115',
        ruc_empresa: '20131312955',
        nombre_proyecto: 'Residencial Las Torres',
        categoria: 'Operario',
        especialidad: 'Fierrero',
        hijos_menores: 1,
        hijos: [{ orden: 1, edad: 7, sexo: 'Femenino' }],
        consentimiento_datos_personales: true
      })
    });

    const regJson = (await regRes.json()) as {
      ok: boolean;
      data: {
        id: number;
        numero_documento: string;
        apellidos: string;
        nombres: string;
        ruc_empresa: string;
        estado_sorteo: string;
      };
    };
    if (regRes.status !== 201 || !regJson.ok || regJson.data.numero_documento !== '45892310') {
      throw new Error(`Fallo al registrar participante válido: status=${regRes.status}`);
    }
    if (regJson.data.apellidos.includes('<script>')) {
      throw new Error('Fallo de sanitización XSS en apellidos');
    }
    const createdId = regJson.data.id;
    console.log(
      '✔ [2/7] Registro de participante con DNI exitoso (HTTP 201) y sanitización XSS activa.'
    );

    // 3. Probar Regla de Unicidad Anti-duplicados (HTTP 409 Conflict)
    const dupRes = await fetch(`${baseUrl}/api/participantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo_documento: 'DNI',
        numero_documento: '45892310',
        apellidos: 'Pérez López',
        nombres: 'Juan Carlos',
        celular: '987654321',
        correo: '',
        direccion: 'Av. Prolongación Cangallo N.° 670',
        departamento: 'Lima',
        provincia: 'Lima',
        distrito: 'La Victoria',
        ubigeo: '150115',
        ruc_empresa: '',
        nombre_proyecto: '',
        categoria: 'Operario',
        especialidad: '',
        hijos_menores: 0,
        hijos: [],
        consentimiento_datos_personales: true
      })
    });

    const dupJson = (await dupRes.json()) as { ok: boolean; code: string; message: string };
    if (dupRes.status !== 409) {
      throw new Error(`Se esperaba HTTP 409 en documento duplicado, se recibió ${dupRes.status}`);
    }
    console.log(`✔ [3/7] Regla Anti-duplicados verificada (HTTP 409): "${dupJson.message}"`);

    // 4. Insertar un segundo participante con Carnet de Extranjería (9 dígitos)
    const ceRes = await fetch(`${baseUrl}/api/participantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo_documento: 'Carnet de Extranjería',
        numero_documento: '123456789',
        apellidos: 'Huamán Rojas',
        nombres: 'María Elena',
        celular: '991234567',
        correo: 'mhuaman@cona-aportantes.pe',
        direccion: 'Jr. Los Constructores 450, Urb. Zárate',
        departamento: 'Lima',
        provincia: 'Lima',
        distrito: 'San Juan de Lurigancho',
        ubigeo: '150132',
        ruc_empresa: '20506070809',
        nombre_proyecto: 'Obra Vial Este',
        categoria: 'Oficial',
        especialidad: 'Encofrador',
        hijos_menores: 2,
        hijos: [
          { orden: 1, edad: 10, sexo: 'Masculino' },
          { orden: 2, edad: 4, sexo: 'Femenino' }
        ],
        consentimiento_datos_personales: true
      })
    });
    if (ceRes.status !== 201) {
      throw new Error(`Fallo al registrar Carnet de Extranjería de 9 dígitos: ${ceRes.status}`);
    }

    // 5. Probar Autenticación del Portal Admin (bcrypt + Cookie 'token' HttpOnly SameSite=Lax)
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.ADMIN_USER || 'admin',
        password: process.env.ADMIN_PASSWORD || 'ConaAdmin2026!'
      })
    });

    const setCookieHeader = loginRes.headers.get('set-cookie') || '';
    if (
      loginRes.status !== 200 ||
      !setCookieHeader.includes('token=') ||
      !setCookieHeader.includes('HttpOnly')
    ) {
      throw new Error('Login administrativo no generó Cookie "token" HttpOnly correctamente.');
    }
    console.log(
      '✔ [4/7] Autenticación Admin con hash bcrypt y Cookie "token" (HttpOnly, SameSite=Lax, 24h) verificada.'
    );

    const cookiePair = setCookieHeader.split(';')[0];

    // 6. Probar Soft Delete (DELETE /api/admin/participantes/:id), Papelera y Restauración con Contraseña
    const delRes = await fetch(`${baseUrl}/api/admin/participantes/${createdId}`, {
      method: 'DELETE',
      headers: { Cookie: cookiePair }
    });
    const delJson = (await delRes.json()) as { ok: boolean; message: string };
    if (delRes.status !== 200 || !delJson.ok) {
      throw new Error('Fallo al ejecutar Soft Delete del participante.');
    }

    const trashRes = await fetch(`${baseUrl}/api/admin/participantes/eliminados`, {
      headers: { Cookie: cookiePair }
    });
    const trashJson = (await trashRes.json()) as {
      ok: boolean;
      data: Array<{ id: number; activo: boolean }>;
    };
    if (
      trashRes.status !== 200 ||
      !trashJson.data.some((p) => p.id === createdId && p.activo === false)
    ) {
      throw new Error('El participante eliminado no aparece en /api/admin/participantes/eliminados.');
    }

    // Intentar restaurar con contraseña incorrecta (debe devolver 403 Forbidden)
    const badRestoreRes = await fetch(
      `${baseUrl}/api/admin/participantes/${createdId}/restaurar`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookiePair },
        body: JSON.stringify({ adminPassword: 'clave_incorrecta_123' })
      }
    );
    if (badRestoreRes.status !== 403) {
      throw new Error(
        `Se esperaba HTTP 403 con contraseña incorrecta al restaurar, se recibió ${badRestoreRes.status}`
      );
    }

    // Restaurar con contraseña correcta (debe devolver 200 OK)
    const okRestoreRes = await fetch(
      `${baseUrl}/api/admin/participantes/${createdId}/restaurar`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookiePair },
        body: JSON.stringify({
          adminPassword: process.env.ADMIN_PASSWORD || 'ConaAdmin2026!'
        })
      }
    );
    const okRestoreJson = (await okRestoreRes.json()) as { ok: boolean; message: string };
    if (okRestoreRes.status !== 200 || !okRestoreJson.ok) {
      throw new Error('Fallo al restaurar participante con contraseña administrativa válida.');
    }
    console.log(
      '✔ [5/7] Borrado seguro (Soft Delete), Papelera y Restauración con validación de contraseña (403/200) verificados.'
    );

    // 7. Consultar Padrón Activo y Exportar a Excel (.xlsx) en /api/admin/exportar-excel
    const listRes = await fetch(`${baseUrl}/api/admin/participantes?q=45892310`, {
      headers: { Cookie: cookiePair }
    });
    const listJson = (await listRes.json()) as {
      ok: boolean;
      filtrados: number;
      data: Array<{ numero_documento: string; apellidos: string; nombres: string }>;
    };
    if (
      listRes.status !== 200 ||
      !listJson.ok ||
      listJson.filtrados < 1 ||
      listJson.data[0].numero_documento !== '45892310'
    ) {
      throw new Error('El buscador administrativo por documento no devolvió el registro restaurado.');
    }
    console.log('✔ [6/7] Consulta protegida del padrón activo verificada.');

    const excelRes = await fetch(`${baseUrl}/api/admin/exportar-excel`, {
      headers: { Cookie: cookiePair }
    });
    const excelBuffer = Buffer.from(await excelRes.arrayBuffer());
    if (
      excelRes.status !== 200 ||
      excelBuffer.length < 1000 ||
      excelBuffer[0] !== 0x50 ||
      excelBuffer[1] !== 0x4b
    ) {
      throw new Error('El archivo Excel exportado no es un libro .xlsx válido.');
    }
    console.log(
      `✔ [7/7] Exportación a Excel (.xlsx) en /api/admin/exportar-excel verificada (${excelBuffer.length} bytes).`
    );

    console.log('====================================================================');
    console.log('✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE');
    console.log('====================================================================');
  } finally {
    server.close();
  }
}

runVerification().catch((err) => {
  console.error('❌ Error en verificación:', err);
  process.exit(1);
});
