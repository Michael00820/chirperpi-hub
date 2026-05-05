import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { captureException } from '../sentry';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error with request context
  logger.error('Unhandled error', err, {
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.user?.userId
  });

  // Capture in Sentry if initialized
  captureException(err, req, {
    errorType: err.name,
    message: err.message
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message,
      requestId: req.id
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      requestId: req.id
    });
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal Server Error',
    requestId: req.id,
    ...(process.env.NODE_ENV !== 'production' && {
      message: err.message,
      stack: err.stack
    })
  });
};