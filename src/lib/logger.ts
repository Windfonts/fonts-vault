/**
 * Winston-based logger utility for the application
 * Provides structured logging with different transports for development and production
 */

import path from 'path';
import winston from 'winston';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const configuredLogLevel = process.env.LOG_LEVEL;
const defaultLogLevel = isDevelopment ? 'debug' : 'info';
const logLevel = (configuredLogLevel && configuredLogLevel.trim()) || defaultLogLevel;

const safeStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, val) => {
    if (val instanceof Error) {
      return {
        name: val.name,
        message: val.message,
        stack: val.stack,
      };
    }
    if (typeof val === 'bigint') {
      return val.toString();
    }
    if (typeof val === 'string') {
      return val.replace(/\n/g, '\\n');
    }
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    return val;
  });
};

const normalizeMeta = winston.format((info) => {
  const anyInfo = info as unknown as winston.Logform.TransformableInfo & {
    metadata?: Record<string, unknown>;
  };
  if (anyInfo.metadata && typeof anyInfo.metadata === 'object') {
    Object.assign(anyInfo, anyInfo.metadata);
    delete anyInfo.metadata;
  }
  return anyInfo;
});

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  normalizeMeta(),
  isDevelopment ? winston.format.colorize({ all: true }) : winston.format.uncolorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const upperLevel = typeof level === 'string' ? level.toUpperCase() : String(level);
    const metaObj: Record<string, unknown> = { ...meta };
    if (stack && (upperLevel === 'ERROR' || isDevelopment)) {
      metaObj.stack = stack;
    }
    const metaStr = Object.keys(metaObj).length ? ` ${safeStringify(metaObj)}` : '';
    return `[${timestamp}] ${upperLevel} ${message}${metaStr}`;
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
      level: logLevel,
      format: consoleFormat,
    })
  );
} else {
  // In production, log to console and files
  transports.push(
    new winston.transports.Console({
      level: logLevel,
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
  level: logLevel,
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
