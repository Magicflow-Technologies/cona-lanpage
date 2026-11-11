import { Request, Response } from 'express';
import { IParticipanteRepository } from '../core/interfaces/IParticipanteRepository';
import {
  parseUserAgentOrigin,
  validateAndSanitizeParticipanteDTO
} from '../infrastructure/security/sanitizer';
import { AppError, DuplicateDocumentError } from '../core/errors/AppError';
import {
  generateCaptchaChallenge,
  verifyCaptchaChallenge,
  logAuditEvent
} from '../infrastructure/security/securityMiddleware';

/**
 * Controlador de Participantes.
 * Depende exclusivamente de la abstracción `IParticipanteRepository` (Inyección de Dependencias).
 */
export class ParticipanteController {
  constructor(private readonly repository: IParticipanteRepository) {}

  /**
   * GET /api/captcha
   * Genera un nuevo reto anti-bots (Captcha matemático firmado con HMAC).
   */
  public obtenerCaptcha = (_req: Request, res: Response): void => {
    const challenge = generateCaptchaChallenge();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(200).json({
      ok: true,
      question: challenge.question,
      token: challenge.token,
      a: challenge.a,
      b: challenge.b,
      operator: challenge.operator
    });
  };

  /**
   * GET /api/config/public
   * Devuelve configuración pública de analítica (Google Analytics 4 / Google Ads)
   * y registra la trazabilidad de visita a la Landing Page.
   */
  public obtenerConfigPublica = (req: Request, res: Response): void => {
    logAuditEvent(req, 'VISITA_LANDING', 'Ingreso a formulario de campaña CONA');
    res.status(200).json({
      ok: true,
      gaMeasurementId: (process.env.GA_MEASUREMENT_ID || '').trim(),
      googleAdsId: (process.env.GOOGLE_ADS_ID || '').trim(),
      googleAdsConversionLabel: (process.env.GOOGLE_ADS_CONVERSION_LABEL || '').trim()
    });
  };

  /**
   * POST /api/participantes
   * Registra un nuevo participante validando Honeypot, Captcha anti-bots, formato,
   * sanitizando contra XSS/SQLi y verificando unicidad de documento en `cona_campana.db`.
   */
  public registrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body || {};

      // 1. Verificación Anti-Bots: Campo trampa Honeypot (invisible para humanos)
      if (body.website_url && String(body.website_url).trim() !== '') {
        logAuditEvent(req, 'BOT_HONEYPOT_BLOCK', 'Campo honeypot completado por bot');
        res.status(400).json({
          ok: false,
          code: 'BOT_DETECTED',
          message: 'Solicitud bloqueada por el filtro de seguridad anti-bots.'
        });
        return;
      }

      // 2. Verificación Anti-Bots: Captcha firmado (si el cliente envía captcha_token o require_captcha)
      if (body.captcha_token !== undefined || body.captcha_answer !== undefined) {
        const isCaptchaValid = verifyCaptchaChallenge(
          String(body.captcha_token || ''),
          String(body.captcha_answer || '')
        );
        if (!isCaptchaValid) {
          logAuditEvent(req, 'CAPTCHA_FAIL', 'Respuesta de verificación anti-bots incorrecta');
          res.status(400).json({
            ok: false,
            code: 'INVALID_CAPTCHA',
            message: 'La verificación de seguridad contra bots (Captcha) es incorrecta o expiró. Inténtalo de nuevo.'
          });
          return;
        }
      }

      const fallbackOrigin = parseUserAgentOrigin(String(req.headers['user-agent'] || ''));
      const enrichedBody = {
        ...body,
        dispositivo: String(body.dispositivo || '').trim() || fallbackOrigin.dispositivo,
        navegador: String(body.navegador || '').trim() || fallbackOrigin.navegador
      };

      const dto = validateAndSanitizeParticipanteDTO(enrichedBody);

      // Verificación explícita anti-duplicados por tipo y número de documento
      const existente = await this.repository.buscarPorDocumento(
        dto.tipo_documento,
        dto.numero_documento
      );

      if (existente && existente.activo) {
        logAuditEvent(
          req,
          'REGISTRO_DUPLICADO',
          `Intento duplicado: ${dto.tipo_documento} ${dto.numero_documento}`
        );
        throw new DuplicateDocumentError(dto.numero_documento, dto.tipo_documento);
      }

      const creado = await this.repository.crear(dto);

      logAuditEvent(
        req,
        'REGISTRO_EXITOSO',
        `Participante registrado ID #${creado.id} (${creado.tipo_documento} ${creado.numero_documento})`
      );

      res.status(201).json({
        ok: true,
        code: 'PARTICIPANTE_REGISTRADO',
        message:
          'Tu información fue actualizada correctamente y ya estás participando en el sorteo de la campaña.',
        data: creado
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          ok: false,
          code: error.code,
          message: error.message
        });
        return;
      }

      console.error('[ParticipanteController.registrar] Error inesperado:', error);
      res.status(500).json({
        ok: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ocurrió un error interno al procesar tu solicitud. Inténtalo nuevamente.'
      });
    }
  };

  /**
   * GET /api/participantes/verificar?numero_documento=12345678
   * Permite verificar disponibilidad de documento de identidad.
   */
  public verificarDocumento = async (req: Request, res: Response): Promise<void> => {
    try {
      const numeroDocumento = String(
        req.query.numero_documento || req.query.dni || ''
      ).trim();
      const tipoDocumento = String(req.query.tipo_documento || 'DNI').trim();

      if (!numeroDocumento) {
        res.status(400).json({
          ok: false,
          code: 'MISSING_DOCUMENT',
          message: 'Debe proporcionar el número de documento a consultar.'
        });
        return;
      }

      const participante = await this.repository.buscarPorDocumento(
        tipoDocumento,
        numeroDocumento
      );
      const isActivo = Boolean(participante && participante.activo);
      const isEliminado = Boolean(participante && !participante.activo);

      res.status(200).json({
        ok: true,
        registrado: isActivo,
        eliminado: isEliminado,
        message: isActivo
          ? `El documento N.° ${numeroDocumento} ya se encuentra registrado y participando en el sorteo.`
          : isEliminado
          ? `El documento N.° ${numeroDocumento} se encontraba dado de baja y puede reactivarse completando el formulario.`
          : 'Documento disponible para actualizar datos.'
      });
    } catch (error) {
      console.error('[ParticipanteController.verificarDocumento] Error:', error);
      res.status(500).json({
        ok: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error al verificar documento.'
      });
    }
  };
}
