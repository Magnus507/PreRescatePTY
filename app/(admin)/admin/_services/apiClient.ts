export class ApiError extends Error {
  constructor(public message: string, public status: number, public details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiClient {
  private async fetcher<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      // Read body as text first to avoid crash on empty/invalid JSON
      const text = await res.text();
      type ApiErrorPayload = { error?: string; message?: string; details?: unknown };
      let data: unknown = null;

      // Attempt JSON parse only if body is non-empty and content-type is JSON
      if (text.length > 0) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          try {
            data = JSON.parse(text);
          } catch {
            // Body is not valid JSON — keep data as null
            data = null;
          }
        }
      }

      if (!res.ok) {
        const errorPayload = data as ApiErrorPayload;
        throw new ApiError(
          errorPayload.error || errorPayload.message || res.statusText || "Error inesperado en el servidor",
          res.status,
          errorPayload.details || null
        );
      }

      // If response is OK but body was empty, return null cast to T
      if (data === null) {
        return null as unknown as T;
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      
      // Handle AbortError specifically
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`Request to ${url} was cancelled.`);
        throw error;
      }

      throw new ApiError(
        error instanceof Error ? error.message : "Error de conexión con el servidor",
        500
      );
    }
  }

  get<T>(url: string, options?: RequestInit) {
    return this.fetcher<T>(url, { ...options, method: "GET" });
  }

  post<T>(url: string, body?: unknown, options?: RequestInit) {
    return this.fetcher<T>(url, { 
      ...options, 
      method: "POST", 
      body: body ? JSON.stringify(body) : undefined 
    });
  }

  patch<T>(url: string, body?: unknown, options?: RequestInit) {
    return this.fetcher<T>(url, { 
      ...options, 
      method: "PATCH", 
      body: body ? JSON.stringify(body) : undefined 
    });
  }

  delete<T>(url: string, options?: RequestInit) {
    return this.fetcher<T>(url, { ...options, method: "DELETE" });
  }
}

export const adminClient = new ApiClient();
