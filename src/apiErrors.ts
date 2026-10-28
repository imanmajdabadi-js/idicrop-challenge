type JsonRecord = Record<string, object | string | number | boolean | null>;

export function getSafeHttpErrorMessage(status: number, fallback: string): string {
  switch (status) {
    case 400:
      return "The request was not accepted. Check the submitted information and try again.";
    case 401:
      return fallback;
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource could not be found.";
    case 409:
      return "The request conflicts with the current server state. Refresh and try again.";
    case 413:
      return "The submitted content is too large.";
    case 415:
      return "The server does not support this request format.";
    case 422:
      return fallback;
    case 429:
      return "Too many requests. Wait a moment before trying again.";
    case 500:
      return "The server encountered an error. Please try again later.";
    case 501:
      return "The server does not support this operation.";
    case 502:
      return "A required service is temporarily unavailable.";
    case 503:
      return "The service is temporarily unavailable. Please try again later.";
    case 504:
      return "The service took too long to respond. Check the current state before retrying.";
    default:
      return fallback;
  }
}

export async function getValidationResponseMessage(
  response: Response,
  fieldLabels: Record<string, string>,
  fallback: string,
): Promise<string> {
  try {
    const text = await response.text();
    if (!text) {
      return fallback;
    }

    let body: object;
    try {
      body = JSON.parse(text) as object;
    } catch {
      return fallback;
    }

    return getValidationErrorMessage(body, fieldLabels, fallback);
  } catch {
    return fallback;
  }
}

function isRecord(value: object): value is JsonRecord {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function getValidationErrorMessage(
  body: object,
  fieldLabels: Record<string, string>,
  fallback: string,
): string {
  if (!isRecord(body) || !Array.isArray(body.detail)) {
    return fallback;
  }

  const fields = new Set<string>();

  for (const entry of body.detail as object[]) {
    if (!isRecord(entry) || !Array.isArray(entry.loc)) {
      continue;
    }

    for (const part of entry.loc as object[]) {
      if (
        typeof part === "string" &&
        Object.prototype.hasOwnProperty.call(fieldLabels, part)
      ) {
        const label = fieldLabels[part];
        if (label) {
          fields.add(label);
        }
      }
    }
  }

  return fields.size > 0
    ? `Check ${Array.from(fields).join(", ")} and try again.`
    : fallback;
}
