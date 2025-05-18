import { ENV, LOG_CONFIG, removeSensitiveData } from '../lib/config';

// Color Palette - Easy to modify these base colors
const PALETTE = {
  // Base colors
  PASTEL_CYAN: '\x1b[38;2;173;216;230m',    // Light blue
  PASTEL_BLUE: '\x1b[38;2;173;216;255m',    // Slightly brighter blue
  PASTEL_YELLOW: '\x1b[38;2;255;223;186m',  // Warm yellow
  PASTEL_RED: '\x1b[38;2;255;182;193m',     // Soft red
  PASTEL_GREEN: '\x1b[38;2;152;251;152m',   // Mint green
  MINT_GREEN: '\x1b[38;2;144;238;144m',     // Lighter mint
  PEACH: '\x1b[38;2;255;218;185m',         // Warm peach
  STEEL_BLUE: '\x1b[38;2;176;196;222m',    // Light steel blue
  SUCCESS_GREEN: '\x1b[38;2;144;238;144m',  // Bright green
  METRIC_PINK: '\x1b[38;2;255;182;193m',    // Soft pink

  // Modifiers
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
} as const;

// Semantic color mapping - Easy to reassign colors to different purposes
const COLORS = {
  // Log levels
  DEBUG: PALETTE.PASTEL_CYAN,
  INFO: PALETTE.PASTEL_BLUE,
  WARN: PALETTE.PASTEL_YELLOW,
  ERROR: PALETTE.PASTEL_RED,
  
  // UI elements
  LABEL: PALETTE.PASTEL_GREEN,
  VALUE: PALETTE.MINT_GREEN,
  COST: PALETTE.PEACH,
  MODEL: PALETTE.STEEL_BLUE,
  SUCCESS: PALETTE.SUCCESS_GREEN,
  METRIC: PALETTE.METRIC_PINK,
  
  // Modifiers
  RESET: PALETTE.RESET,
  BOLD: PALETTE.BOLD,
  DIM: PALETTE.DIM,
} as const;

// Shared formatting utilities
const format = {
  colorize: (text: string, color: string) => `${color}${text}${COLORS.RESET}`,
  bold: (text: string) => `${COLORS.BOLD}${text}${COLORS.RESET}`,
  dim: (text: string) => `${COLORS.DIM}${text}${COLORS.RESET}`,
  
  // Value formatting
  money: (amount: number) => format.colorize(`$${amount.toFixed(4)}`, COLORS.COST),
  number: (num: number) => format.colorize(num.toLocaleString(), COLORS.VALUE),
  model: (name: string) => format.colorize(name, COLORS.MODEL),
  success: (text: string) => format.colorize(format.bold(text), COLORS.SUCCESS),
  metric: (name: string, value: number | string) => 
    `${format.colorize(name, COLORS.METRIC)}: ${format.number(typeof value === 'number' ? value : parseInt(value.toString(), 10) || 0)}`,
  
  // Layout helpers
  label: (text: string) => format.bold(format.colorize(text.padEnd(20), COLORS.LABEL)),
  timestamp: () => format.dim(new Date().toISOString()),

  // Special formatters for common patterns
  breakdown: (data: Record<string, number>) => {
    const entries = Object.entries(data);
    return entries.map(([key, value]) => format.metric(key, value)).join(', ');
  },

  successBlock: (message: string, metrics?: Record<string, unknown>) => {
    const lines = [format.success(message)];
    
    if (metrics) {
      Object.entries(metrics).forEach(([category, data]) => {
        if (typeof data === 'number') {
          lines.push(`  ${format.metric(category, data)}`);
        } else if (typeof data === 'object' && data !== null) {
          lines.push(`  ${format.colorize(category, COLORS.LABEL)}:`);
          Object.entries(data as Record<string, number>).forEach(([key, value]) => {
            lines.push(`    ${format.metric(key, value)}`);
          });
        }
      });
    }

    return lines.join('\n');
  }
} as const;

// Simple logger without memory storage
class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: keyof typeof COLORS, message: string, meta?: unknown): void {
    // Skip debug logs in production
    if (ENV.isProd && level === 'DEBUG') return;
    
    // Skip all logs in test unless explicitly enabled
    if (ENV.isTest && !LOG_CONFIG.enableTestLogs) return;

    const timestamp = format.timestamp();
    const levelStr = format.colorize(format.bold(level), COLORS[level]);
    let output = `${timestamp} ${levelStr}: ${message}`;

    if (meta) {
      // Always remove sensitive data, regardless of environment
      const filteredMeta = removeSensitiveData(meta);

      // Check if meta contains a pre-formatted message
      if (typeof filteredMeta === 'object' && filteredMeta !== null && 'message' in filteredMeta) {
        output = `${timestamp} ${levelStr}: ${(filteredMeta as { message: string }).message}`;
      } else if (filteredMeta) {
        output += '\n' + format.dim(JSON.stringify(filteredMeta, null, 2));
      }
    }

    console[level.toLowerCase() as 'debug' | 'info' | 'warn' | 'error'](output);
  }

  public debug(message: string, meta?: unknown): void {
    this.log('DEBUG', message, meta);
  }

  public info(message: string, meta?: unknown): void {
    this.log('INFO', message, meta);
  }

  public warn(message: string, meta?: unknown): void {
    this.log('WARN', message, meta);
  }

  public error(message: string, error?: Error, meta?: unknown): void {
    const errorMeta = error ? {
      error: {
        message: error.message,
        name: error.name,
        stack: ENV.isProd ? undefined : error.stack
      },
      ...(meta || {})
    } : meta;

    this.log('ERROR', message, errorMeta);
  }
}

// Token tracking with improved formatting
class TokenTracker {
  private static instance: TokenTracker;
  private totalCost: number = 0;
  private modelUsage: Map<string, { 
    totalTokens: number;
    cost: number;
    calls: number;
  }> = new Map();

  private constructor() {}

  public static getInstance(): TokenTracker {
    if (!TokenTracker.instance) {
      TokenTracker.instance = new TokenTracker();
    }
    return TokenTracker.instance;
  }

  public trackUsage(model: string, pricing: { prompt: number; completion: number }, usage: { 
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }): void {
    // Calculate costs
    const promptCost = (usage.prompt_tokens / 1000) * pricing.prompt;
    const completionCost = (usage.completion_tokens / 1000) * pricing.completion;
    const totalCost = promptCost + completionCost;
    
    // Update total cost
    this.totalCost += totalCost;

    // Update model-specific usage
    const modelStats = this.modelUsage.get(model) || { totalTokens: 0, cost: 0, calls: 0 };
    modelStats.totalTokens += usage.total_tokens;
    modelStats.cost += totalCost;
    modelStats.calls += 1;
    this.modelUsage.set(model, modelStats);

    // Only log detailed usage in development
    if (ENV.isDev) {
      const timestamp = format.timestamp();
      const header = format.colorize(format.bold('TOKEN USAGE'), COLORS.INFO);
      
      console.log([
        `${timestamp} ${header}`,
        `${format.label('Model')}${format.model(model)}`,
        `${format.label('Tokens')}${format.number(usage.total_tokens)} (${format.number(usage.prompt_tokens)} prompt, ${format.number(usage.completion_tokens)} completion)`,
        `${format.label('Cost')}${format.money(totalCost)}`,
        `${format.label('Model Stats')}${format.number(modelStats.calls)} calls, ${format.number(modelStats.totalTokens)} tokens, ${format.money(modelStats.cost)}`
      ].join('\n'));
    }
  }

  public getTotalCost(): number {
    return this.totalCost;
  }

  public getModelStats(): Map<string, { totalTokens: number; cost: number; calls: number }> {
    return new Map(this.modelUsage);
  }
}

export const logger = Logger.getInstance();
export const tokenTracker = TokenTracker.getInstance();
export { format }; 