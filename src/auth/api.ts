import type { CaptchaResponse, LoginRequest, LoginResponse } from "./types";

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "https://ts.idicorp.ir"
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isRecord(value: object): value is Record<string, string> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

async function readResponse(response: Response): Promise<object> {
  const text = await response.text();

  if (!text) {
    throw new ApiError("The server returned an empty response.", response.status);
  }

  try {
    return JSON.parse(text) as object;
  } catch {
    throw new ApiError("The server returned invalid JSON.", response.status);
  }
}

function getErrorMessage(body: object, fallback: string): string {
  if (isRecord(body) && typeof body.message === "string") {
    return body.message;
  }

  if (isRecord(body) && typeof body.detail === "string") {
    return body.detail;
  }

  return fallback;
}

export async function fetchCaptcha(): Promise<CaptchaResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    credentials: "include",
  });
  const body = await readResponse(response);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(body, "Unable to load the CAPTCHA."),
      response.status,
    );
  }

  if (
    !isRecord(body) ||
    typeof body.captcha_image !== "string" ||
    typeof body.salt !== "string"
  ) {
    throw new ApiError("The CAPTCHA response was malformed.", response.status);
  }

  return {
    captcha_image: body.captcha_image,
    salt: body.salt,
  };
}

export async function submitLogin(
  request: LoginRequest,
): Promise<LoginResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const body = await readResponse(response);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(body, "Login failed. Check your credentials and CAPTCHA answer."),
      response.status,
    );
  }

  if (!isRecord(body) || typeof body.access_token !== "string") {
    throw new ApiError("The login response was malformed.", response.status);
  }

  return {
    access_token: body.access_token,
  };
}
