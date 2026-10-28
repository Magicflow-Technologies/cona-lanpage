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

      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
      const token = authService.generateToken(username);
      res.cookie('token', token, {
        httpOnly: true,
        secure: Boolean(isHttps),
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
   * Retorna los participantes activos (`activo = 1`) y el conteo de eliminados.
   */
  public listarParticipantes = async (req: Request, res: Response): Promise<void> => {
    try {
      const [todosActivos, eliminados] = await Promise.all([
        this.repository.obtenerTodos(),
        this.repository.obtenerEliminados()
      ]);
      const search = String(req.query.q || '')
        .trim()
        .toLowerCase();
      const fechaDesde = String(req.query.desde || '').trim();
      const fechaHasta = String(req.query.hasta || '').trim();

      const filtrados = this.filterRecords(todosActivos, search, fechaDesde, fechaHasta);

      res.status(200).json({
        ok: true,
        total: todosActivos.length,
        eliminadosCount: eliminados.length,
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
   * GET /api/admin/participantes/eliminados
   * Retorna la lista de registros en papelera (`activo = 0`).
   */
  public listarEliminados = async (req: Request, res: Response): Promise<void> => {
    try {
      const eliminados = await this.repository.obtenerEliminados();
      const search = String(req.query.q || '')
        .trim()
        .toLowerCase();
      const fechaDesde = String(req.query.desde || '').trim();
      const fechaHasta = String(req.query.hasta || '').trim();

      const filtrados = this.filterRecords(eliminados, search, fechaDesde, fechaHasta);

      res.status(200).json({
        ok: true,
        total: eliminados.length,
        filtrados: filtrados.length,
        data: filtrados
      });
    } catch (error) {
      console.error('[AdminController.listarEliminados] Error:', error);
      res.status(500).json({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'No se pudo obtener el listado de registros en papelera.'
      });
    }
  };

  /**
   * DELETE /api/admin/participantes/:id
   * Borrado lógico (Soft Delete): `UPDATE participantes SET activo = 0, fecha_eliminacion = datetime('now') WHERE id = ?`
   */
  public eliminarParticipante = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number.parseInt(String(req.params.id || ''), 10);
      if (Number.isNaN(id) || id <= 0) {
        res.status(400).json({
          ok: false,
          code: 'INVALID_ID',
          message: 'ID de participante inválido.'
        });
        return;
      }

      const deleted = await this.repository.eliminar(id);
      if (!deleted) {
        res.status(404).json({
          ok: false,
          code: 'NOT_FOUND',
          message: 'No se encontró el participante especificado.'
        });
        return;
      }

      res.status(200).json({
        ok: true,
        message: 'Registro enviado a papelera.'
      });
    } catch (error) {
      console.error('[AdminController.eliminarParticipante] Error:', error);
      res.status(500).json({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Error al enviar el registro a la papelera.'
      });
    }
  };

  /**
   * POST /api/admin/participantes/:id/restaurar
   * Valida `adminPassword` contra `ADMIN_PASSWORD` y ejecuta:
   * `UPDATE participantes SET activo = 1, fecha_eliminacion = NULL WHERE id = ?`
   */
  public restaurarParticipante = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number.parseInt(String(req.params.id || ''), 10);
      if (Number.isNaN(id) || id <= 0) {
        res.status(400).json({
          ok: false,
          code: 'INVALID_ID',
          message: 'ID de participante inválido.'
        });
        return;
      }

      const adminPassword = String(req.body?.adminPassword || '');
      const isPasswordValid = await authService.verifyAdminPassword(adminPassword);

      if (!isPasswordValid) {
        res.status(403).json({
          ok: false,
          error: 'Contraseña incorrecta para autorizar la restauración.',
          message: 'Contraseña incorrecta para autorizar la restauración.'
        });
        return;
      }

      const restored = await this.repository.restaurar(id);
      if (!restored) {
        res.status(404).json({
          ok: false,
          code: 'NOT_FOUND',
          message: 'No se encontró el registro especificado en la papelera.'
        });
        return;
      }

      res.status(200).json({
        ok: true,
        message: 'Registro restaurado exitosamente en el padrón activo.'
      });
    } catch (error) {
      console.error('[AdminController.restaurarParticipante] Error:', error);
      res.status(500).json({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Error al restaurar el registro.'
      });
    }
  };

  /**
   * GET /api/admin/exportar-excel (y alias /api/admin/export-excel)
   * Exporta por defecto únicamente los participantes activos (`WHERE activo = 1`).
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
