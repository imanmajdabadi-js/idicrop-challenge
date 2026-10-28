export type CalculatorOperation = "add" | "subtract" | "multiply" | "divide";

export type CalculatorStatus =
  | "disconnected"
  | "connecting"
  | "ready"
  | "connection-error";

export type CalculatorRequest = {
  operation: CalculatorOperation;
  numbers: number[];
};

export type CalculatorServerMessage =
  | { type: "ready" }
  | { type: "result"; result: number }
  | { type: "error"; message: string };
