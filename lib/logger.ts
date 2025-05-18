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
  private readonly maxLogs = 1000;
  
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
  
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    const entry = this.formatMessage(level, message, context, error);
    
    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Console output with appropriate styling
    const consoleMessage = `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`;
    switch (level) {
      case 'debug':
        console.debug(consoleMessage, context || '', error || '');
        break;
      case 'info':
        console.info(consoleMessage, context || '', error || '');
        break;
      case 'warn':
        console.warn(consoleMessage, context || '', error || '');
        break;
      case 'error':
        console.error(consoleMessage, context || '', error || '');
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