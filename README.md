# CONA — Campaña de Actualización de Datos y Portal Administrativo

Solución Fullstack en **TypeScript**, diseñada bajo **Arquitectura Limpia (Clean Architecture)**, **Patrón Repositorio (Repository Pattern)** y estándares de **Seguridad Web** (Sentencias Preparadas contra SQLi, Sanitización XSS, Hashing `bcrypt` y sesiones JWT en Cookies `HttpOnly`).

Replica con fidelidad absoluta la estructura HTML5 semántica, identidad visual institucional, logotipo en Base64 y textos legales de la landing page de CONA (`https://dg-cona.github.io/prueba_formulario/`).

---

## 📁 Estructura Modular del Proyecto

```text
Cona/
├── backend/
│   ├── database/
│   │   ├── schema.sql                             # Script DDL de creación de tablas e índices SQLite
│   │   └── cona_participantes.sqlite              # Base de datos SQLite generada automáticamente
│   └── src/                                       # Re-exportaciones modulares de las capas del backend
├── frontend/
│   ├── index.html                                 # Réplica fiel de la Landing Page de CONA
│   ├── admin.html                                 # Portal Administrativo (/admin)
│   ├── tsconfig.json                              # Configuración TypeScript del cliente (DOM / ES2020)
│   ├── src/
│   │   ├── types.ts                               # Contratos y tipos del cliente
│   │   ├── carousel.ts                            # Controlador TS del carrusel (auto-play, hover, dots, swipe, Canvas fallback)
│   │   ├── form.ts                                # Validación en tiempo real + anunciador accesible aria-live
│   │   ├── main.ts                                # Punto de entrada de la Landing Page
│   │   └── admin.ts                               # Controlador TS del Portal Administrativo y exportación Excel
│   └── dist/                                      # Módulos JS compilados desde TypeScript
├── src/
│   ├── core/
│   │   ├── entities/
│   │   │   └── Participante.ts                    # Entidad de dominio Participante
│   │   ├── dtos/
│   │   │   └── ParticipanteDTO.ts                 # Objeto de transferencia de datos (DTO)
│   │   ├── interfaces/
│   │   │   └── IParticipanteRepository.ts         # Contrato abstracto desacoplado de persistencia
│   │   └── errors/
│   │       └── AppError.ts                        # Errores de negocio tipados (incluyendo HTTP 409)
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── schema.sql                         # Script DDL SQLite
│   │   │   ├── sqlite.ts                          # Gestor de conexión SQLite con modo WAL
│   │   │   └── initDb.ts                          # Script CLI de inicialización de base de datos
│   │   ├── repositories/
│   │   │   ├── SqliteParticipanteRepository.ts    # Adaptador SQLite con Prepared Statements (?)
│   │   │   └── SupabaseParticipanteRepository.ts  # Adaptador alternativo para intercambio transparente
│   │   ├── security/
│   │   │   ├── sanitizer.ts                       # Limpieza y escape de caracteres contra XSS + validación RFC
│   │   │   └── auth.ts                            # Autenticación bcrypt (cost 12) + Cookie JWT HttpOnly
│   │   └── excel/
│   │       └── ExcelExporter.ts                   # Generador de reportes .xlsx con estilos y auto-ajuste
│   ├── controllers/
│   │   ├── ParticipanteController.ts              # Controlador desacoplado de registro y verificación
│   │   └── AdminController.ts                     # Controlador administrativo y descarga Excel
│   ├── routes/
│   │   └── api.ts                                 # Enrutador REST (/api/*)
│   ├── scripts/
│   │   └── verifySystem.ts                        # Suite de pruebas E2E automatizadas
│   ├── container.ts                               # Contenedor de Inyección de Dependencias (IoC)
│   └── server.ts                                  # Servidor HTTP Express con cabeceras de seguridad
├── .env                                           # Variables de entorno activas
├── .env.example                                   # Plantilla de variables de entorno
├── package.json                                   # Scripts y dependencias del proyecto
└── tsconfig.json                                  # Configuración TypeScript del Backend
```

---

## 🚀 Instrucciones para Levantar el Entorno de Desarrollo

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno (`.env`)
El proyecto incluye un archivo `.env` preconfigurado para desarrollo local:
```env
PORT=3000
NODE_ENV=development
ADMIN_USER=admin
ADMIN_PASSWORD=ConaAdmin2026!
ADMIN_PASSWORD_HASH=
JWT_SECRET=cona_institucional_jwt_secret_key_2026_seguridad_web
DB_ADAPTER=sqlite
DB_PATH=./backend/database/cona_participantes.sqlite
```

### 3. Inicializar la Base de Datos SQLite
```bash
npm run init:db
```

### 4. Compilar TypeScript y levantar el servidor
```bash
npm run dev
```
El servidor quedará activo en:
- **Landing Page Institucional:** `http://localhost:3000/`
- **Portal Administrativo:** `http://localhost:3000/admin`
- **Endpoint API de Registro:** `POST http://localhost:3000/api/participantes`

---

## 🧪 Guía de Pruebas

### A. Ejecutar la suite automatizada de verificación (E2E)
```bash
npm run test:e2e
```
Este comando compila el frontend y el backend y verifica automáticamente:
1. Estructura semántica HTML5 fiel a la página de CONA.
2. Registro de participante (`HTTP 201 Created`) y neutralización de payloads XSS (`<script>`).
3. Regla de unicidad anti-duplicados (`HTTP 409 Conflict`) al intentar registrar el mismo documento dos veces.
4. Autenticación en `/api/admin/login` validada con `bcrypt` y emisión de token JWT en Cookie `HttpOnly`.
5. Búsqueda rápida por DNI y filtros de fecha en `/api/admin/participantes`.
6. Generación y descarga del reporte `.xlsx` en `/api/admin/export-excel`.

### B. Probar el Registro y Anti-duplicados desde el Navegador
1. Abre `http://localhost:3000/`.
2. Completa el formulario con un DNI de 8 dígitos (ej. `45892310`), nombres, celular de 9 dígitos, correo RFC válido, dirección y marca la casilla obligatoria de aceptación de términos.
3. Haz clic en **"Actualizar datos y participar"** — verás la notificación accesible (`role="status" aria-live="polite"`) confirmando tu participación en el sorteo.
4. Intenta registrar nuevamente el mismo número de documento: el servidor responderá con **HTTP 409** y la interfaz mostrará amablemente que dicho documento ya se encuentra registrado y participando en el sorteo.

### C. Probar el Portal Administrativo (`/admin`) y Exportación a Excel
1. Haz clic en el botón **"Acceso Admin"** en la cabecera o pie de página (o navega a `http://localhost:3000/admin`).
2. Ingresa con las credenciales definidas en `.env`:
   - **Usuario:** `admin`
   - **Contraseña:** `ConaAdmin2026!`
3. Utiliza el buscador rápido por DNI o los selectores de fecha (*Fecha desde* / *Fecha hasta*) para filtrar participantes en tiempo real.
4. Haz clic en **"⬇ Exportar a Excel (.xlsx)"** para descargar el libro Excel con cabeceras estilizadas, filtros automáticos y columnas auto-ajustadas.

---

## 🔌 Cómo Cambiar de Base de Datos (MySQL, PostgreSQL o Supabase)

Gracias al patrón `IParticipanteRepository`, ni `ParticipanteController` ni el frontend conocen qué motor de base de datos se utiliza:
1. Crea una nueva clase en `src/infrastructure/repositories/` que implemente `IParticipanteRepository` (puedes tomar como base `SupabaseParticipanteRepository.ts`).
2. Registra la instancia en `src/container.ts` (o cambia `DB_ADAPTER=supabase` en `.env`).

# cona-lanpage
