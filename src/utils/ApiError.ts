/**
 * Classe d'erreur personnalisée pour l'API.
 * Permet de centraliser la gestion des erreurs HTTP.
 */
class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintient la stack-trace correcte (V8)
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export default ApiError;
