/**
 * Unified Logger for PreRescatePTY.
 * All structured arguments and message strings pass through the same
 * telemetry redactor before reaching console output.
 */

import {
  redactTelemetryString,
  sanitizeTelemetry,
} from "@/lib/security/telemetry";

type LogLevel = "info" | "warn" | "error" | "debug";

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
    return `[${timestamp}] [${level.toUpperCase()}] ${redactTelemetryString(message)}`;
  }

  private sanitizeArgs(args: unknown[]): unknown[] {
    return args.map((arg) => sanitizeTelemetry(arg));
  }

  public info(message: string, ...args: unknown[]): void {
    console.info(this.formatMessage("info", message), ...this.sanitizeArgs(args));
  }

  public warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage("warn", message), ...this.sanitizeArgs(args));
  }

  public error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage("error", message), ...this.sanitizeArgs(args));
  }

  public debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatMessage("debug", message), ...this.sanitizeArgs(args));
    }
  }
}

export const logger = Logger.getInstance();
