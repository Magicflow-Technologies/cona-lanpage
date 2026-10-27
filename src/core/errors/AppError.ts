export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class DuplicateDocumentError extends AppError {
  constructor(numeroDocumento: string, tipoDocumento = 'Documento') {
    const label =
      tipoDocumento === 'Carnet de Extranjería' || tipoDocumento === 'Carnet de Extranjeria'
        ? 'Carnet de Extranjería'
        : tipoDocumento === 'DNI'
        ? 'DNI'
        : 'documento';
    super(
      `El ${label} N.° ${numeroDocumento} ya se encuentra registrado y participando en el sorteo de la campaña.`,
      409,
      'DUPLICATE_DOCUMENT'
    );
    this.name = 'DuplicateDocumentError';
  }
}
