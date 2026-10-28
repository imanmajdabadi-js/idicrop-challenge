import { getSafeHttpErrorMessage } from "../apiErrors";

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
    throw new StreamingEchoError(
      getSafeHttpErrorMessage(
        response.status,
        response.status === 401
          ? "Your session has expired. Please sign in again."
          : "The streaming echo request failed.",
      ),
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
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      await reader.cancel().catch(() => undefined);
      throw error;
    }

    throw new StreamingEchoError("The streaming response was interrupted.");
  } finally {
    reader.releaseLock();
  }

  return { contentType };
}
