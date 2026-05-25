export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `Request failed (${status})`);
    this.name = "ApiError";
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Your session expired. Please sign in again.";
    if (err.status === 403) return "You are not allowed to perform this action.";
    if (err.status === 502 || err.status === 503 || err.status === 504) {
      const b = err.body;
      if (typeof b === "object" && b && "message" in b) {
        const m = (b as { message: unknown }).message;
        if (typeof m === "string" && m.length > 0 && m.length < 220) {
          return `${m} Ensure user-service and product-service are reachable from transaction-service.`;
        }
      }
      return "Service is temporarily unavailable. Check that the API gateway and backend services (transaction, user, product) are running.";
    }
    const b = err.body;
    if (typeof b === "object" && b && "message" in b) {
      const m = (b as { message: unknown }).message;
      if (Array.isArray(m) && m.length > 0) return m.join(", ");
      if (typeof m === "string" && m.length > 0 && m.length < 180) return m;
    }
    return "Request failed. Please try again.";
  }
  if (err instanceof Error) return "Something went wrong. Please try again.";
  return "Something went wrong";
}
