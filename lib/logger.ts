import { ENV, LOG_CONFIG, removeSensitiveData } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  
  private constructor() {}
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };
  }
  
  private sanitizeError(error: Error): Partial<Error> {
    if (ENV.isProd) {
      return {
        message: error.message,
        name: error.name
      };
    }
    return error;
  }
  
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    // Skip debug logs in production
    if (ENV.isProd && level === 'debug') return;
    
    // Skip all logs in test unless explicitly enabled
    if (ENV.isTest && !LOG_CONFIG.enableTestLogs) return;

    // Always remove sensitive data, regardless of environment
    const filteredContext = context ? removeSensitiveData(context) as Record<string, unknown> : undefined;
    const sanitizedError = error ? this.sanitizeError(error) : undefined;
    
    const entry = this.formatMessage(level, message, filteredContext, sanitizedError as Error);
    
    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > LOG_CONFIG.maxMemoryLogs) {
      this.logs.shift();
    }
    
    // Console output with appropriate styling
    const consoleMessage = `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`;
    switch (level) {
      case 'debug':
        console.debug(consoleMessage, filteredContext || '', sanitizedError || '');
        break;
      case 'info':
        console.info(consoleMessage, filteredContext || '', sanitizedError || '');
        break;
      case 'warn':
        console.warn(consoleMessage, filteredContext || '', sanitizedError || '');
        break;
      case 'error':
        console.error(consoleMessage, filteredContext || '', sanitizedError || '');
        break;
    }
  }
  
  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }
  
  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }
  
  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }
  
  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('error', message, context, error);
  }
  
  getLogs(level?: LogLevel, limit = 100): LogEntry[] {
    let filtered = this.logs;
    if (level) {
      filtered = this.logs.filter(log => log.level === level);
    }
    return filtered.slice(-limit);
  }
  
  clearLogs() {
    this.logs = [];
  }
}

export const logger = Logger.getInstance(); 