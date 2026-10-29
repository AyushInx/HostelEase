import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod Validation Errors
  if (err instanceof ZodError || err.name === 'ZodError') {
    const issues = (err.issues && err.issues.length ? err.issues : err.errors) || [];
    const formattedErrors = issues.map((e: any) => ({
      path: (e.path || []).join('.'),
      message: e.message,
    }));
    const errorMsg = formattedErrors.length > 0
      ? `Validation failed: ${formattedErrors.map((e: any) => e.message).join('; ')}`
      : 'Validation failed';
    res.status(400).json({
      success: false,
      error: errorMsg,
      details: formattedErrors,
    });
    return;
  }

  // 2. Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    res.status(409).json({
      success: false,
      error: `Duplicate value error: ${field} '${err.keyValue?.[field]}' already exists.`,
    });
    return;
  }

  // 3. Mongoose Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: `Invalid resource identifier format for '${err.path}'.`,
    });
    return;
  }

  // 4. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e: any) => e.message);
    res.status(400).json({
      success: false,
      error: 'Model validation failed',
      details: messages,
    });
    return;
  }

  // 5. Custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // 6. Generic unhandled error
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred. Please try again later.',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
