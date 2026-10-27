"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateDocumentError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
class DuplicateDocumentError extends AppError {
    constructor(numeroDocumento, tipoDocumento = 'Documento') {
        const label = tipoDocumento === 'Carnet de Extranjería' || tipoDocumento === 'Carnet de Extranjeria'
            ? 'Carnet de Extranjería'
            : tipoDocumento === 'DNI'
                ? 'DNI'
                : 'documento';
        super(`El ${label} N.° ${numeroDocumento} ya se encuentra registrado y participando en el sorteo de la campaña.`, 409, 'DUPLICATE_DOCUMENT');
        this.name = 'DuplicateDocumentError';
    }
}
exports.DuplicateDocumentError = DuplicateDocumentError;
//# sourceMappingURL=AppError.js.map