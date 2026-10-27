import { Request, Response } from 'express';
import { IParticipanteRepository } from '../core/interfaces/IParticipanteRepository';
import { Participante } from '../core/entities/Participante';
import {
  authService,
  AUTH_COOKIE_NAME,
  LEGACY_AUTH_COOKIE_NAME,
  extractAdminToken
} from '../infrastructure/security/auth';
import { ExcelExporter } from '../infrastructure/excel/ExcelExporter';

export class AdminController {
  constructor(private readonly repository: IParticipanteRepository) {}

  /**
   * POST /api/admin/login
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const username = String(req.body?.username || '').trim();
      const password = String(req.body?.password || '');

      if (!username || !password) {
        res.status(400).json({
          ok: false,
          code: 'MISSING_CREDENTIALS',
          message: 'Ingresa usuario y contraseña.'
        });
        return;
      }

      const isValid = await authService.verifyCredentials(username, password);
      if (!isValid) {
        res.status(401).json({
          ok: false,
          code: 'INVALID_CREDENTIALS',
          message: 'Credenciales administrativas incorrectas.'
        });
        return;
      }

      const token = authService.generateToken(username);
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // false en desarrollo HTTP local
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      });

      res.status(200).json({
        ok: true,
        message: 'Sesión administrativa iniciada correctamente.',
        user: { username, role: 'admin' }
      });
    } catch (error) {
      console.error('[AdminController.login] Error:', error);
      res.status(500).json({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Error interno al procesar el inicio de sesión.'
      });
    }
  };

  /**
   * POST /api/admin/logout
   */
  public logout = (_req: Request, res: Response): void => {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    res.clearCookie(LEGACY_AUTH_COOKIE_NAME, { path: '/' });
    res.status(200).json({
      ok: true,
      message: 'Sesión cerrada correctamente.'
    });
  };

  /**
   * GET /api/admin/session
   */
  public session = (req: Request, res: Response): void => {
    const token = extractAdminToken(req);
    if (!token) {
      res.status(200).json({ ok: true, authenticated: false });
      return;
    }

    const payload = authService.verifyToken(token);
    if (!payload) {
      res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
      res.clearCookie(LEGACY_AUTH_COOKIE_NAME, { path: '/' });
      res.status(200).json({ ok: true, authenticated: false });
      return;
    }

    res.status(200).json({
      ok: true,
      authenticated: true,
      user: { username: payload.username, role: payload.role }
    });
  };

  private filterRecords(
    todos: Participante[],
    search: string,
    fechaDesde: string,
    fechaHasta: string
  ): Participante[] {
    return todos.filter((p) => {
      if (search) {
        const haystack = [
          p.numero_documento,
          p.tipo_documento,
          p.apellidos,
          p.nombres,
          p.nombres_apellidos || '',
          p.correo,
          p.celular,
          p.direccion,
          p.ruc_empresa,
          p.nombre_proyecto,
          p.categoria,
          p.especialidad,
          p.departamento,
          p.provincia,
          p.distrito
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(search)) {
          return false;
        }
      }

      if (fechaDesde) {
        const regDate = (p.fecha_registro || '').slice(0, 10);
        if (regDate < fechaDesde) return false;
      }

      if (fechaHasta) {
        const regDate = (p.fecha_registro || '').slice(0, 10);
        if (regDate > fechaHasta) return false;
      }

      return true;
    });
  }

  /**
   * GET /api/admin/participantes
   */
  public listarParticipantes = async (req: Request, res: Response): Promise<void> => {
    try {
      const todos = await this.repository.obtenerTodos();
      const search = String(req.query.q || '')
        .trim()
        .toLowerCase();
      const fechaDesde = String(req.query.desde || '').trim();
      const fechaHasta = String(req.query.hasta || '').trim();

      const filtrados = this.filterRecords(todos, search, fechaDesde, fechaHasta);

      res.status(200).json({
        ok: true,
        total: todos.length,
        filtrados: filtrados.length,
        data: filtrados
      });
    } catch (error) {
      console.error('[AdminController.listarParticipantes] Error:', error);
      res.status(500).json({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'No se pudo obtener el listado de participantes.'
      });
    }
  };

  /**
   * GET /api/admin/exportar-excel (y alias /api/admin/export-excel)
   */
  public exportarExcel = async (req: Request, res: Response): Promise<void> => {
    try {
      const todos = await this.repository.obtenerTodos();
      const search = String(req.query.q || '')
        .trim()
        .toLowerCase();
      const fechaDesde = String(req.query.desde || '').trim();
      const fechaHasta = String(req.query.hasta || '').trim();

      const registrosExportar = this.filterRecords(todos, search, fechaDesde, fechaHasta);

      const buffer = await ExcelExporter.buildParticipantesWorkbook(registrosExportar);
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `CONA_Participantes_Sorteo_${stamp}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(Buffer.from(buffer));
    } catch (error) {
      console.error('[AdminController.exportarExcel] Error:', error);
      res.status(500).json({
        ok: false,
        code: 'EXCEL_EXPORT_ERROR',
        message: 'Error al generar el archivo Excel.'
      });
    }
  };
}
