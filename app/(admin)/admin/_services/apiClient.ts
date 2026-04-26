export class ApiError extends Error {
  constructor(public message: string, public status: number, public details?: any) {
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

      const data = await res.json();

      if (!res.ok) {
        throw new ApiError(
          data.error || "Error inesperado en el servidor",
          res.status,
          data.details || null
        );
      }

      return data;
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

  post<T>(url: string, body?: any, options?: RequestInit) {
    return this.fetcher<T>(url, { 
      ...options, 
      method: "POST", 
      body: body ? JSON.stringify(body) : undefined 
    });
  }

  patch<T>(url: string, body?: any, options?: RequestInit) {
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
