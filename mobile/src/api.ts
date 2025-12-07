const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Token storage keys
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// Token management
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

// Types
export interface UserRegister {
  username: string;
  password: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserResponse {
  id: number;
  username: string;
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// API Error handling
class ApiError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// Refresh token logic
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data = await res.json();
    if (data.access_token) {
      setTokens(data.access_token, data.refresh_token || refreshToken);
      return true;
    }
    
    clearTokens();
    return false;
  } catch {
    clearTokens();
    return false;
  }
}

// Authenticated fetch with auto-refresh
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  let response = await fetch(url, { ...options, headers });

  // If 401, try to refresh token and retry
  if (response.status === 401) {
    if (isRefreshing) {
      await refreshPromise;
    } else {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
      const success = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (!success) {
        throw new ApiError(401, "Session expired");
      }
    }

    // Retry with new token
    const newToken = getAccessToken();
    if (newToken) {
      response = await fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
      });
    }
  }

  return response;
}

// Auth API calls
export async function register(data: UserRegister): Promise<UserResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<UserResponse>(res);
}

export async function loginApi(data: UserLogin): Promise<Token> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Token>(res);
}

export async function checkAuth(): Promise<UserResponse> {
  const res = await authFetch(`${API_BASE}/check_auth`);
  return handleResponse<UserResponse>(res);
}

export async function getHistory(): Promise<unknown> {
  const res = await authFetch(`${API_BASE}/history`, {
    method: "GET",
  });
  return handleResponse<unknown>(res);
}

export async function saveHistory(items: string[]): Promise<void> {
  const res = await authFetch(`${API_BASE}/history/save-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || "Не удалось сохранить историю");
  }
}

export { API_BASE };
