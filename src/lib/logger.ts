/**
 * Winston-based logger utility for the application
 * Provides structured logging with different transports for development and production
 */

import winston from 'winston';
import path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Format for file output (JSON for easier parsing)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory path
const logsDir = path.join(process.cwd(), 'logs');

// Configure transports based on environment
const transports: winston.transport[] = [];

if (isTest) {
  // In test environment, only log errors to console
  transports.push(
    new winston.transports.Console({
      level: 'error',
      format: consoleFormat,
      silent: true, // Silent in tests unless explicitly needed
    })
  );
} else if (isDevelopment) {
  // In development, log to console with colors
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat,
    })
  );
} else {
  // In production, log to console and files
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the Winston logger instance
const winstonLogger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata()
  ),
  transports,
  exitOnError: false,
});

// Export a simplified interface
export interface LogContext {
  [key: string]: unknown;
}

export const logger = {
  info(message: string, context?: LogContext): void {
    winstonLogger.info(message, context);
  },

  warn(message: string, context?: LogContext): void {
    winstonLogger.warn(message, context);
  },

  error(message: string, context?: LogContext): void {
    winstonLogger.error(message, context);
  },

  debug(message: string, context?: LogContext): void {
    winstonLogger.debug(message, context);
  },

  // Helper method for logging HTTP requests
  http(message: string, context?: LogContext): void {
    winstonLogger.http(message, context);
  },
};
