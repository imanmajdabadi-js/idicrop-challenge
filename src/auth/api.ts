import type { CaptchaResponse, LoginRequest, LoginResponse } from "./types";
import {
  getSafeHttpErrorMessage,
  getValidationResponseMessage,
} from "../apiErrors";

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
  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new ApiError("The server response could not be read.", response.status);
  }

  if (!text) {
    throw new ApiError("The server returned an empty response.", response.status);
  }

  try {
    return JSON.parse(text) as object;
  } catch {
    throw new ApiError("The server returned invalid JSON.", response.status);
  }
}

export async function fetchCaptcha(): Promise<CaptchaResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      credentials: "include",
    });
  } catch {
    throw new ApiError("Unable to connect to the authentication service.", 0);
  }

  if (!response.ok) {
    const fallback = "Unable to load the CAPTCHA.";
    throw new ApiError(
      response.status === 422
        ? await getValidationResponseMessage(
            response,
            {},
            "The CAPTCHA request was invalid. Please try again.",
          )
        : getSafeHttpErrorMessage(response.status, fallback),
      response.status,
    );
  }

  const body = await readResponse(response);
  if (
    !isRecord(body) ||
    typeof body.captcha !== "string" ||
    typeof body.salt !== "string"
  ) {
    throw new ApiError("The CAPTCHA response was malformed.", response.status);
  }

  return {
    captcha: body.captcha,
    salt: body.salt,
  };
}

export async function submitLogin(
  request: LoginRequest,
): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ApiError("Unable to connect to the authentication service.", 0);
  }

  if (!response.ok) {
    const fallback = "Login failed. Check your credentials and CAPTCHA answer.";
    throw new ApiError(
      response.status === 422
        ? await getValidationResponseMessage(
            response,
            {
              username: "username",
              password: "password",
              captcha_answer: "CAPTCHA answer",
              salt: "CAPTCHA",
            },
            "Login details are invalid. Check the required fields and try again.",
          )
        : getSafeHttpErrorMessage(response.status, fallback),
      response.status,
    );
  }

  const body = await readResponse(response);
  const tokenType = isRecord(body)
    ? Object.prototype.hasOwnProperty.call(body, "token_type")
      ? typeof body.token_type === "string"
        ? body.token_type
        : ""
      : "bearer"
    : "";

  if (
    !isRecord(body) ||
    typeof body.access_token !== "string" ||
    body.access_token.trim().length === 0 ||
    tokenType.trim().length === 0
  ) {
    throw new ApiError("The login response was malformed.", response.status);
  }

  return {
    access_token: body.access_token,
    token_type: tokenType,
  };
}
