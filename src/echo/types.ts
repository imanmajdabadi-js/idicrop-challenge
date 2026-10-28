export type EchoStatus =
  | "disconnected"
  | "connecting"
  | "ready"
  | "error";

export type EchoMessage =
  | { type: "ready" }
  | { type: "text"; text: string };
