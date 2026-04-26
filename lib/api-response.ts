import { NextResponse } from "next/server";
import { logger } from "./logger";

export interface ApiResponseOptions {
  status?: number;
  details?: unknown;
}

export class ApiResponse {
  /**
   * Success response wrapper.
   */
  static success(data: unknown = {}, options: ApiResponseOptions = {}) {
    const dataObj = typeof data === 'object' && data !== null ? data : { data };
    return NextResponse.json(
      {
        ...dataObj,
        timestamp: new Date().toISOString(),
      },
      { status: options.status || 200 }
    );
  }

  /**
   * Error response wrapper.
   */
  static error(message: string, options: ApiResponseOptions = {}) {
    return NextResponse.json(
      {
        error: message,
        details: options.details || null,
        timestamp: new Date().toISOString(),
      },
      { status: options.status || 400 }
    );
  }

  /**
   * Not authorized helper.
   */
  static unauthorized() {
    return this.error("No autorizado", { status: 401 });
  }

  /**
   * Not found helper.
   */
  static notFound(message = "Recurso no encontrado") {
    return this.error(message, { status: 404 });
  }

  /**
   * Internal server error helper.
   */
  static serverError(error: unknown) {
    logger.error("[API_ERROR]", error instanceof Error ? error.message : String(error));
    return this.error("Error interno del servidor", { 
      status: 500,
      details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}
