import type {
  CalculatorRequest,
  CalculatorServerMessage,
} from "./types";

const calculatorUrl =
  import.meta.env.VITE_CALCULATOR_WS_URL ??
  "wss://ts.idicorp.ir/ws/calculator";

type MessageRecord = {
  type?: string;
  result?: number;
  message?: string;
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

  throw new Error("The calculator sent an unsupported message.");
}

export class CalculatorSocket {
  private socket: WebSocket | null = null;
  private tokenTimeout: ReturnType<typeof setTimeout> | null = null;
  private reportedError = false;
  private connectionGeneration = 0;

  constructor(
    private readonly token: string,
    private readonly onMessage: (message: CalculatorServerMessage) => void,
    private readonly onError: (message: string) => void,
    private readonly onClose: () => void,
  ) {}

  connect(): void {
    const generation = this.connectionGeneration + 1;
    this.connectionGeneration = generation;
    this.reportedError = false;
    const socket = new WebSocket(calculatorUrl);
    this.socket = socket;
    socket.onopen = () => {
      if (!this.isCurrent(socket, generation)) {
        return;
      }
      this.sendToken();
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      if (!this.isCurrent(socket, generation)) {
        return;
      }
      try {
        this.onMessage(parseServerMessage(event.data));
      } catch (error) {
        this.onError(
          error instanceof Error
            ? error.message
            : "The calculator sent an invalid message.",
        );
      }
    };
    socket.onerror = () => {
      if (!this.isCurrent(socket, generation)) {
        return;
      }
      this.reportedError = true;
      this.onError("The calculator connection failed.");
    };
    socket.onclose = () => {
      if (!this.isCurrent(socket, generation)) {
        return;
      }
      this.clearTokenTimeout();
      if (!this.reportedError) {
        this.onClose();
      }
    };
    this.tokenTimeout = setTimeout(() => {
      if (
        this.isCurrent(socket, generation) &&
        socket.readyState !== WebSocket.OPEN
      ) {
        this.reportedError = true;
        this.onError("The calculator connection timed out.");
        this.close();
      }
    }, 1000);
  }

  send(request: CalculatorRequest): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(JSON.stringify(request));
    return true;
  }

  close(): void {
    this.connectionGeneration += 1;
    this.clearTokenTimeout();
    this.socket?.close();
    this.socket = null;
  }

  private sendToken(): void {
    this.clearTokenTimeout();

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ token: this.token }));
    }
  }

  private isCurrent(socket: WebSocket, generation: number): boolean {
    return this.socket === socket && this.connectionGeneration === generation;
  }

  private clearTokenTimeout(): void {
    if (this.tokenTimeout) {
      clearTimeout(this.tokenTimeout);
      this.tokenTimeout = null;
    }
  }
}
