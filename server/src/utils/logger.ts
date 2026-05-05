/**
 * Structured logging utility for ChirperPi Hub
 * - Console output in development
 * - JSON structured logs in production
 * - Support for request ID tracking
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  /**
   * Get current timestamp in ISO format
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Format log entry based on environment
   */
  private formatLog(level: LogLevel, message: string, context?: LogContext): string | object {
    if (this.isDevelopment) {
      // Development: Human-readable console output
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      return `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}${contextStr}`;
    }

    // Production: JSON structured logs
    return {
      timestamp: this.getTimestamp(),
      level,
      message,
      ...context
    };
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    const formatted = this.formatLog('debug', message, context);
    console.debug(formatted);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    const formatted = this.formatLog('info', message, context);
    console.log(formatted);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    const formatted = this.formatLog('warn', message, context);
    console.warn(formatted);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | string, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    };

    const formatted = this.formatLog('error', message, errorContext);
    console.error(formatted);
  }
}

export const logger = new Logger();
