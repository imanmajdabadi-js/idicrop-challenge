const AUTH_TOKEN_KEY = "idicorp_auth_token";

export function getStoredToken(): string | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return null;
    }
    const value = window.sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return;
    }
    window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Ignore storage failures.
  }
}

export function clearStoredToken(): void {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return;
    }
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
}
