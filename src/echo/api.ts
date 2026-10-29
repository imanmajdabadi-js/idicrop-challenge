import type { EchoMessage } from "./types";

const echoUrl =
  import.meta.env.VITE_ECHO_WS_URL ?? "wss://ts.idicorp.ir/ws/echo";

type MessageRecord = {
  type?: string;
};

function isRecord(value: object): value is MessageRecord {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function parseMessage(data: string, awaitingReady: boolean): EchoMessage {
  if (!awaitingReady) {
    return { type: "text", text: data };
  }

  if (data === "ready") {
    return { type: "ready" };
  }

  try {
    const parsed: object = JSON.parse(data) as object;

    if (isRecord(parsed) && parsed.type === "ready") {
      return { type: "ready" };
    }
  } catch {
    return { type: "text", text: data };
  }

  return { type: "text", text: data };
}

export class EchoSocket {
  private socket: WebSocket | null = null;
  private connectionGeneration = 0;
  private readyReceived = false;

  constructor(
    private readonly token: string= '',
    private readonly onMessage: (message: EchoMessage) => void,
    private readonly onError: (message: string) => void,
    private readonly onClose: () => void,
  ) {}

  connect(): void {
    const generation = this.connectionGeneration + 1;
    this.connectionGeneration = generation;
    this.readyReceived = false;
    const socket = new WebSocket(echoUrl + `?token=${encodeURIComponent(this.token)}`);
    this.socket = socket;

    // socket.onopen = () => {
    //   if (!this.isCurrent(socket, generation)) {
    //     return;
    //   }
    // };
    socket.onmessage = (event: MessageEvent<string>) => {
      if (!this.isCurrent(socket, generation)) {
        return;
      }

      if (typeof event.data !== "string") {
        this.onError("The echo server sent a non-text message.");
        return;
      }

      try {
        const message = parseMessage(event.data, !this.readyReceived);
        if (message.type === "ready") {
          this.readyReceived = true;
        }
        this.onMessage(message);
      } catch (error) {
        this.onError(
          error instanceof Error
            ? error.message
            : "The echo server sent an invalid message.",
        );
      }
    };
    socket.onerror = () => {
      if (this.isCurrent(socket, generation)) {
        this.onError("The echo connection failed.");
      }
    };
    socket.onclose = () => {
      if (this.isCurrent(socket, generation)) {
        this.onClose();
      }
    };
  }

  send(text: string): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(text);
    return true;
  }

  close(): void {
    this.connectionGeneration += 1;
    this.socket?.close();
    this.socket = null;
  }

  private isCurrent(socket: WebSocket, generation: number): boolean {
    return this.socket === socket && this.connectionGeneration === generation;
  }
}
