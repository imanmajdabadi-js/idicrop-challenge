import type {
  CalculatorRequest,
  CalculatorServerMessage,
} from "./types";

const calculatorUrl =
  import.meta.env.VITE_CALCULATOR_WS_URL ??
  "wss://ts.idicorp.ir/ws/calculator";
const CONNECTION_TIMEOUT_MS = 1000;
const READINESS_TIMEOUT_MS = 5000;
// Bound the UI wait for a calculation without implying a server response-time guarantee.
const OPERATION_TIMEOUT_MS = 15_000;

type MessageRecord = {
  type?: string;
  result?: number;
  message?: string;
  error?: string;
};

function isRecord(value: object): value is MessageRecord {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function parseServerMessage(data: string): CalculatorServerMessage {
  let parsed: object;

  try {
    parsed = JSON.parse(data) as object;
  } catch {
    throw new Error("The calculator sent invalid JSON.");
  }

  if (!isRecord(parsed) || typeof parsed.type !== "string") {
    throw new Error("The calculator sent a malformed message.");
  }

  if (parsed.type === "ready") {
    return { type: "ready" };
  }

  if (
    parsed.type === "result" &&
    typeof parsed.result === "number" &&
    Number.isFinite(parsed.result)
  ) {
    return { type: "result", result: parsed.result };
  }

  if (parsed.type === "error" && typeof parsed.message === "string") {
    return { type: "error", message: parsed.message };
  }

  if (typeof parsed.error === "string") {
    return { type: "error", message: parsed.error };
  }

  throw new Error("The calculator sent an unsupported message.");
}

export class CalculatorSocket {
  private socket: WebSocket | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private readinessTimeout: ReturnType<typeof setTimeout> | null = null;
  private operationTimeout: ReturnType<typeof setTimeout> | null = null;
  private reportedError = false;
  private connectionGeneration = 0;
  private readyReceived = false;

  constructor(
    private readonly token: string,
    private readonly onMessage: (message: CalculatorServerMessage) => void,
    private readonly onError: (message: string) => void,
    private readonly onClose: () => void,
  ) {}

  connect(): void {
    const generation = this.connectionGeneration + 1;
    this.connectionGeneration = generation;
    this.clearTimeouts();
    this.socket?.close();
    this.reportedError = false;
    this.readyReceived = false;
    const socket = new WebSocket(calculatorUrl);
    this.socket = socket;
    socket.onopen = () => {
      if (!this.isCurrent(socket, generation)) {
        return;
      }
      this.clearConnectionTimeout();
      this.sendToken();
      this.readinessTimeout = setTimeout(() => {
        if (this.isCurrent(socket, generation) && !this.readyReceived) {
          this.reportedError = true;
          this.onError("The calculator did not become ready in time.");
          this.close();
        }
      }, READINESS_TIMEOUT_MS);
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      if (!this.isCurrent(socket, generation)) {
        return;
      }
      try {
        const message = parseServerMessage(event.data);
        if (message.type === "ready") {
          this.readyReceived = true;
          this.clearReadinessTimeout();
        }
        if (message.type === "result" || message.type === "error") {
          this.clearOperationTimeout();
        }
        this.onMessage(message);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The calculator sent an invalid message.";
        this.reportedError = true;
        this.close();
        this.onError(message);
      }
    };
    socket.onerror = () => {
      if (!this.isCurrent(socket, generation)) {
        return;
      }
      this.reportedError = true;
      this.clearTimeouts();
      this.onError("The calculator connection failed.");
    };
    socket.onclose = () => {
      if (!this.isCurrent(socket, generation)) {
        return;
      }
      this.clearTimeouts();
      if (!this.reportedError) {
        this.onClose();
      }
    };
    this.connectionTimeout = setTimeout(() => {
      if (
        this.isCurrent(socket, generation) &&
        socket.readyState !== WebSocket.OPEN
      ) {
        this.reportedError = true;
        this.onError("The calculator connection timed out.");
        this.close();
      }
    }, CONNECTION_TIMEOUT_MS);
  }

  send(request: CalculatorRequest): boolean {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.clearOperationTimeout();
    try {
      socket.send(JSON.stringify(request));
    } catch {
      return false;
    }

    const generation = this.connectionGeneration;
    // Calculation messages have no documented correlation ID, so a timeout invalidates the socket.
    this.operationTimeout = setTimeout(() => {
      if (!this.isCurrent(socket, generation)) {
        return;
      }

      this.close();
      this.onError(
        "The calculation response timed out. The connection was closed; reconnect to try again.",
      );
    }, OPERATION_TIMEOUT_MS);
    return true;
  }

  close(): void {
    this.connectionGeneration += 1;
    this.clearTimeouts();
    this.socket?.close();
    this.socket = null;
  }

  private sendToken(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ token: this.token }));
    }
  }

  private isCurrent(socket: WebSocket, generation: number): boolean {
    return this.socket === socket && this.connectionGeneration === generation;
  }

  private clearTimeouts(): void {
    this.clearConnectionTimeout();
    this.clearReadinessTimeout();
    this.clearOperationTimeout();
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private clearReadinessTimeout(): void {
    if (this.readinessTimeout) {
      clearTimeout(this.readinessTimeout);
      this.readinessTimeout = null;
    }
  }

  private clearOperationTimeout(): void {
    if (this.operationTimeout) {
      clearTimeout(this.operationTimeout);
      this.operationTimeout = null;
    }
  }
}
