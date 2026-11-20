const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const TOKEN_KEY = 'access_token';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  // Token expired / tidak valid -> buang token, lempar ke /login.
  // (Cek `token` supaya salah password di halaman login tidak ikut redirect.)
  if (res.status === 401 && token) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/login';
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // ValidationPipe NestJS mengirim `message` berupa array string
    const msg = Array.isArray(data?.message)
      ? data.message.join(', ')
      : (data?.message ?? 'Terjadi kesalahan');
    throw new ApiError(res.status, msg);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
