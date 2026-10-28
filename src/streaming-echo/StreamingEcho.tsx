import { FormEvent, useEffect, useRef, useState } from "react";
import { useAppSelector } from "../store/hooks";
import { streamEcho } from "./api";

type StreamStatus = "idle" | "submitting" | "streaming" | "success" | "cancelled" | "error";

export default function StreamingEcho() {
  const token = useAppSelector((state) => state.auth.accessToken);
  const [text, setText] = useState("");
  const [responseText, setResponseText] = useState("");
  const [contentType, setContentType] = useState<string | null>(null);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      requestId.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  function cancelRequest() {
    if (!controllerRef.current) {
      return;
    }

    requestId.current += 1;
    controllerRef.current.abort();
    controllerRef.current = null;
    setStatus("cancelled");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!text.trim()) {
      setError("Enter text before submitting.");
      setStatus("error");
      return;
    }

    if (!token) {
      setError("You must be signed in to use streaming echo.");
      setStatus("error");
      return;
    }

    requestId.current += 1;
    const currentRequestId = requestId.current;
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setResponseText("");
    setContentType(null);
    setError(null);
    setStatus("submitting");

    try {
      const result = await streamEcho(
        token,
        text,
        controller.signal,
        (chunk) => {
          if (requestId.current !== currentRequestId) {
            return;
          }

          setResponseText((current) => current + chunk);
          setStatus("streaming");
        },
      );

      if (requestId.current !== currentRequestId) {
        return;
      }

      setContentType(result.contentType);
      setStatus("success");
      controllerRef.current = null;
    } catch (requestError) {
      if (requestId.current !== currentRequestId) {
        return;
      }

      controllerRef.current = null;
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        setStatus("cancelled");
        return;
      }

      setStatus("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The streaming echo request failed.",
      );
    }
  }

  const isActive = status === "submitting" || status === "streaming";

  return (
    <section aria-labelledby="streaming-echo-heading">
      <h2 id="streaming-echo-heading">Streaming Echo</h2>
      <p>Status: {status}</p>
      <form onSubmit={handleSubmit}>
        <label>
          Text
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={isActive}
          />
        </label>
        <button type="submit" disabled={isActive}>
          Submit
        </button>
        {isActive && (
          <button type="button" onClick={cancelRequest}>
            Cancel stream
          </button>
        )}
      </form>
      {isActive && <p role="status">Streaming response...</p>}
      {error && <p role="alert">{error}</p>}
      <p>Response content type: {contentType ?? "Not available"}</p>
      <output aria-live="polite">{responseText}</output>
    </section>
  );
}
