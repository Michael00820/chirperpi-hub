/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracing
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Use X-Request-ID header if provided, otherwise generate a new one
  req.id = req.headers['x-request-id'] as string || uuidv4();
  
  // Add request ID to response headers for client tracing
  res.setHeader('X-Request-ID', req.id);
  
  next();
};
