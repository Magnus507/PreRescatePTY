/**
 * Unified Logger for PreRescatePTY
 * Provides a consistent way to log messages while allowing for easy 
 * integration with external logging services in the future.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  public info(message: string, ...args: unknown[]): void {
    console.info(this.formatMessage('info', message), ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage('warn', message), ...args);
  }

  public error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage('error', message), ...args);
  }

  public debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }
}

export const logger = Logger.getInstance();
