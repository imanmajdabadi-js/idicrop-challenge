import { FormEvent, useEffect, useRef, useState } from "react";
import { EchoSocket } from "./api";
import type { EchoStatus } from "./types";

export default function Echo() {
  const socketRef = useRef<EchoSocket | null>(null);
  const connectionGeneration = useRef(0);
  const [status, setStatus] = useState<EchoStatus>("disconnected");
  const [messages, setMessages] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function disconnect() {
    connectionGeneration.current += 1;
    socketRef.current?.close();
    socketRef.current = null;
    setStatus("disconnected");
  }

  function connect() {
    disconnect();
    const generation = connectionGeneration.current + 1;
    connectionGeneration.current = generation;
    setStatus("connecting");
    setError(null);

    const socket = new EchoSocket(
      (message) => {
        if (connectionGeneration.current !== generation) {
          return;
        }

        if (message.type === "ready") {
          setStatus("ready");
          setError(null);
        } else {
          setMessages((current) => [...current, message.text]);
        }
      },
      (message) => {
        if (connectionGeneration.current !== generation) {
          return;
        }

        setStatus("error");
        setError(message);
      },
      () => {
        if (connectionGeneration.current === generation) {
          setStatus("disconnected");
        }
      },
    );

    socketRef.current = socket;
    socket.connect();
  }

  useEffect(() => {
    return () => {
      connectionGeneration.current += 1;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedText = text.trim();

    if (!trimmedText) {
      setError("Enter a message before sending.");
      return;
    }

    if (status !== "ready" || !socketRef.current?.send(trimmedText)) {
      setError("The echo connection is not ready.");
      return;
    }

    setMessages((current) => [...current, `You: ${trimmedText}`]);
    setText("");
    setError(null);
  }

  return (
    <section aria-labelledby="echo-heading">
      <h2 id="echo-heading">Text Echo</h2>
      <p>Status: {status}</p>
      <button type="button" onClick={connect} disabled={status === "connecting"}>
        {status === "error" ? "Reconnect" : "Connect"}
      </button>
      <button
        type="button"
        onClick={disconnect}
        disabled={status === "disconnected"}
      >
        Disconnect
      </button>
      <form onSubmit={handleSubmit}>
        <label>
          Message
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <button type="submit" disabled={status !== "ready"}>
          Send
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <ul aria-live="polite">
        {messages.map((message, index) => (
          <li key={`${index}-${message}`}>{message}</li>
        ))}
      </ul>
    </section>
  );
}
