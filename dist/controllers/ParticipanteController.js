"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParticipanteController = void 0;
const sanitizer_1 = require("../infrastructure/security/sanitizer");
const AppError_1 = require("../core/errors/AppError");
/**
 * Controlador de Participantes.
 * Depende exclusivamente de la abstracción `IParticipanteRepository` (Inyección de Dependencias).
 */
class ParticipanteController {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    /**
     * POST /api/participantes
     * Registra un nuevo participante validando formato, sanitizando contra XSS
     * y verificando unicidad de documento en `cona_campana.db` (HTTP 409 en caso de duplicado).
     */
    registrar = async (req, res) => {
        try {
            const dto = (0, sanitizer_1.validateAndSanitizeParticipanteDTO)(req.body || {});
            // Verificación explícita anti-duplicados por tipo y número de documento
            const existente = await this.repository.buscarPorDocumento(dto.tipo_documento, dto.numero_documento);
            if (existente) {
                throw new AppError_1.DuplicateDocumentError(dto.numero_documento, dto.tipo_documento);
            }
            const creado = await this.repository.crear(dto);
            res.status(201).json({
                ok: true,
                code: 'PARTICIPANTE_REGISTRADO',
                message: 'Tu información fue actualizada correctamente y ya estás participando en el sorteo de la campaña.',
                data: creado
            });
        }
        catch (error) {
            if (error instanceof AppError_1.AppError) {
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
    verificarDocumento = async (req, res) => {
        try {
            const numeroDocumento = String(req.query.numero_documento || req.query.dni || '').trim();
            const tipoDocumento = String(req.query.tipo_documento || 'DNI').trim();
            if (!numeroDocumento) {
                res.status(400).json({
                    ok: false,
                    code: 'MISSING_DOCUMENT',
                    message: 'Debe proporcionar el número de documento a consultar.'
                });
                return;
            }
            const participante = await this.repository.buscarPorDocumento(tipoDocumento, numeroDocumento);
            res.status(200).json({
                ok: true,
                registrado: Boolean(participante),
                message: participante
                    ? `El documento N.° ${numeroDocumento} ya se encuentra registrado y participando en el sorteo.`
                    : 'Documento disponible para actualizar datos.'
            });
        }
        catch (error) {
            console.error('[ParticipanteController.verificarDocumento] Error:', error);
            res.status(500).json({
                ok: false,
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Error al verificar documento.'
            });
        }
    };
}
exports.ParticipanteController = ParticipanteController;
//# sourceMappingURL=ParticipanteController.js.map