import * as Sentry from '@sentry/node';
import { Request, Response, NextFunction } from 'express';

let sentryInitialized = false;

export const initSentry = () => {
  if (!process.env.SENTRY_DSN || sentryInitialized) {
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,
      beforeSend(event) {
        if (event.request?.url?.includes('/api/health')) {
          return null;
        }
        return event;
      }
    });

    sentryInitialized = true;
    console.info('Sentry initialized for error tracking');
  } catch (error) {
    console.error('Failed to initialize Sentry', error);
  }
};

export const sentryRequestHandler = () => {
  return (_req: Request, _res: Response, next: NextFunction) => next();
};

export const sentryErrorHandler = () => {
  return (err: Error, _req: Request, _res: Response, next: NextFunction) => next(err);
};

export const captureException = (error: Error, _req?: Request, _extra?: Record<string, any>) => {
  if (!sentryInitialized) {
    console.error('Error:', error);
    return;
  }
  Sentry.captureException(error);
};

export const captureMessage = (message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info') => {
  if (!sentryInitialized) return;
  Sentry.captureMessage(message, level);
};

export { Sentry };
