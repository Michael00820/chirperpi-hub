import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger';

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
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
      release: process.env.SENTRY_RELEASE || 'chirperpi-hub@latest',
      integrations: [
        new ProfilingIntegration(),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection()
      ],
      beforeSend(event) {
        // Filter out health check requests from Sentry
        if (event.request?.url?.includes('/api/health')) {
          return null;
        }
        return event;
      }
    });

    sentryInitialized = true;
    logger.info('Sentry initialized for error tracking');
  } catch (error) {
    logger.error('Failed to initialize Sentry', error);
  }
};

/**
 * Express middleware to capture errors and attach request context to Sentry
 */
export const sentryRequestHandler = () => {
  return Sentry.Handlers.requestHandler();
};

/**
 * Express error handler for Sentry
 * Should be placed after all other middlewares but before errorHandler
 */
export const sentryErrorHandler = () => {
  return Sentry.Handlers.errorHandler();
};

/**
 * Capture exception with request context
 */
export const captureException = (error: Error, req?: Request, extra?: Record<string, any>) => {
  if (!sentryInitialized) {
    logger.error('Error not captured by Sentry', error);
    return;
  }

  Sentry.captureException(error, {
    tags: {
      requestId: req?.id,
      method: req?.method,
      path: req?.path
    },
    extra: {
      ...extra,
      ip: req?.ip,
      userId: req?.user?.userId
    }
  });
};

/**
 * Capture message with severity
 */
export const captureMessage = (message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info') => {
  if (!sentryInitialized) return;
  Sentry.captureMessage(message, level);
};

export { Sentry };
