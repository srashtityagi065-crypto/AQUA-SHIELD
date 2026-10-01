const API_ROOT = process.env.NEXT_PUBLIC_AQUASHIELD_API_URL?.replace(/\/$/, "");

export class ApiUnavailableError extends Error {
  constructor(message = "AquaShield API is not configured.") {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { method: "GET", signal });
}

export async function apiPost<TBody, TResult>(path: string, body: TBody, signal?: AbortSignal): Promise<TResult> {
  return apiRequest<TResult>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

async function apiRequest<T>(path: string, init: RequestInit): Promise<T> {
  if (!API_ROOT) throw new ApiUnavailableError();
  const response = await fetch(`${API_ROOT}${path}`, { ...init, headers: { Accept: "application/json", ...init.headers } });
  if (!response.ok) throw new Error(`AquaShield API returned ${response.status}.`);
  return response.json() as Promise<T>;
}
