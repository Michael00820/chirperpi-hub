/**
 * Client-side Sentry configuration
 */

import * as Sentry from '@sentry/react';

export const initSentryClient = () => {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.debug('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENV || 'development',
    tracesSampleRate: import.meta.env.VITE_ENV === 'production' ? 0.1 : 0.5,
    release: import.meta.env.VITE_APP_VERSION || 'chirperpi-hub@latest',
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
};
