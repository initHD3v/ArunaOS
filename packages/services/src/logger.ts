export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEV_STYLES: Record<LogLevel, string> = {
  debug: 'color: #94a3b8',
  info: 'color: #3b82f6',
  warn: 'color: #eab308; font-weight: bold',
  error: 'color: #ef4444; font-weight: bold',
};

const CONSOLE_METHOD: Record<LogLevel, 'log' | 'info' | 'warn' | 'error'> = {
  debug: 'log',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

export class Logger {
  private level: LogLevel = 'debug';
  private buffer: LogEntry[] = [];
  private readonly maxBuffer = 100;

  constructor(private readonly isDev: boolean = process.env.NODE_ENV === 'development') {}

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(module: string, message: string, data?: unknown): void {
    this.log('debug', module, message, data);
  }

  info(module: string, message: string, data?: unknown): void {
    this.log('info', module, message, data);
  }

  warn(module: string, message: string, data?: unknown): void {
    this.log('warn', module, message, data);
  }

  error(module: string, message: string, data?: unknown): void {
    this.log('error', module, message, data);
  }

  private log(level: LogLevel, module: string, message: string, data?: unknown): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      module,
      message,
      data,
    };

    this.buffer.push(entry);
    if (this.buffer.length > this.maxBuffer) {
      this.buffer.shift();
    }

    if (this.isDev) {
      const style = DEV_STYLES[level];
      const prefix = `%c[${level.toUpperCase()}] [${module}]`;
      // eslint-disable-next-line no-console
      console[CONSOLE_METHOD[level]](prefix, style, message);
      if (data !== undefined) {
        // eslint-disable-next-line no-console
        console[CONSOLE_METHOD[level]]('  └─', data);
      }
    }
  }

  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  getSnapshot(): LogEntry[] {
    return this.buffer.filter((e) => LEVEL_ORDER[e.level] >= LEVEL_ORDER.warn);
  }
}
