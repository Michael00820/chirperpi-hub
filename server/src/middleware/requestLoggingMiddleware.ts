/**
 * Request logging middleware
 * Logs all HTTP requests with method, URL, status, and response time
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override res.send to capture response details
  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log the request
    const logContext = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode,
      responseTime,
      userId: req.user?.userId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    };

    // Log as info for successful requests (2xx), warn for client errors (4xx), error for server errors (5xx)
    if (statusCode >= 500) {
      logger.error(`${req.method} ${req.path} - ${statusCode}`, undefined, logContext);
    } else if (statusCode >= 400) {
      logger.warn(`${req.method} ${req.path} - ${statusCode}`, logContext);
    } else {
      logger.info(`${req.method} ${req.path} - ${statusCode}`, logContext);
    }

    return originalSend.call(this, data);
  };

  next();
};
