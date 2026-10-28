import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';
import { getSqliteConnection } from './infrastructure/database/sqlite';

dotenv.config();

export function createApp(): express.Application {
  const app = express();

  app.set('trust proxy', 1);

  // Inicializar base de datos y esquema SQLite al arrancar
  getSqliteConnection();

  // Cabeceras de Seguridad Web
  app.disable('x-powered-by');
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: true, limit: '256kb' }));
  app.use(cookieParser());

  // API REST Desacoplada
  app.use('/api', apiRoutes);

  // Archivos estáticos del Frontend (Landing Page & Admin Portal)
  const frontendDir = path.resolve(process.cwd(), 'frontend');
  app.use(
    express.static(frontendDir, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    })
  );

  // Ruta del Portal Administrativo (/admin)
  app.get('/admin', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(frontendDir, 'admin.html'));
  });

  // Ruta principal de la Landing Page de CONA (/)
  app.get('/', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(frontendDir, 'index.html'));
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const app = createApp();
  app.listen(port, () => {
    console.log('====================================================================');
    console.log(`🚀 CONA - Sistema de Actualización de Datos y Sorteo Activo`);
    console.log(`🌐 Landing Page Institucional : http://localhost:${port}/`);
    console.log(`🔐 Portal Administrativo      : http://localhost:${port}/admin`);
    console.log(`📡 API REST Endpoint          : http://localhost:${port}/api/participantes`);
    console.log('====================================================================');
  });
}
