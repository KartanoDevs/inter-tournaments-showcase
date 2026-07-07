import { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../utils/errors";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      ...(err instanceof ValidationError && { errors: err.errors }),
    });
  }

  // Loguear errores inesperados
  console.error("🔥 Error Inesperado:", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // No filtrar detalles al frontend si estamos en producción
  const message =
    process.env.NODE_ENV === "production"
      ? "Error interno del servidor"
      : err.message;

  res.status(500).json({
    status: "error",
    message,
  });
};

// Wrapper para cazar errores en controladores asíncronos sin usar try/catch en cada ruta
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
