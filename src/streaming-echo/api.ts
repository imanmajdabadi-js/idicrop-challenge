const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "https://ts.idicorp.ir"
).replace(/\/+$/, "");

export class StreamingEchoError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "StreamingEchoError";
    this.status = status;
  }
}

export type StreamingEchoResult = {
  contentType: string;
};

export async function streamEcho(
  token: string,
  text: string,
  signal: AbortSignal,
  onChunk: (chunk: string) => void,
): Promise<StreamingEchoResult> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/echo/stream`, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain; charset=UTF-8",
      },
      body: text,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new StreamingEchoError("The streaming echo request failed.");
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new StreamingEchoError(
        "Your session has expired. Please sign in again.",
        response.status,
      );
    }

    if (response.status === 503) {
      throw new StreamingEchoError(
        "The streaming echo service is unavailable.",
        response.status,
      );
    }

    throw new StreamingEchoError(
      `The streaming echo request failed with status ${response.status}.`,
      response.status,
    );
  }

  const contentType =
    response.headers.get("Content-Type") ?? "application/octet-stream";

  if (!response.body) {
    return { contentType };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  try {
    let finished = false;

    while (!finished) {
      const readResult = await reader.read();
      finished = readResult.done;

      if (readResult.value) {
        onChunk(decoder.decode(readResult.value, { stream: !finished }));
      }
    }

    const remainingText = decoder.decode();
    if (remainingText) {
      onChunk(remainingText);
    }
  } finally {
    reader.releaseLock();
  }

  return { contentType };
}
