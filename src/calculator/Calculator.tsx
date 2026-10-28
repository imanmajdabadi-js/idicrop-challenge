import { FormEvent, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  CalculatorSocket,
} from "./api";
import {
  connectionClosed,
  connectionError,
  connectionReady,
  connectionStarted,
  operationChanged,
  protocolError,
  resultReceived,
} from "./slice";
import type { CalculatorOperation } from "./types";

const operations: CalculatorOperation[] = [
  "add",
  "subtract",
  "multiply",
  "divide",
];

export default function Calculator() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.accessToken);
  const { status, operation, result, error } = useAppSelector(
    (state) => state.calculator,
  );
  const socketRef = useRef<CalculatorSocket | null>(null);
  const [operandText, setOperandText] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = new CalculatorSocket(
      token,
      (message) => {
        if (message.type === "ready") {
          dispatch(connectionReady());
        } else if (message.type === "result") {
          dispatch(resultReceived(message.result));
        } else {
          dispatch(protocolError(message.message));
        }
      },
      (message) => dispatch(connectionError(message)),
      () => dispatch(connectionClosed()),
    );

    socketRef.current = socket;
    dispatch(connectionStarted());
    socket.connect();

    return () => {
      const isCurrentSocket = socketRef.current === socket;
      socket.close();

      if (isCurrentSocket) {
        socketRef.current = null;
        dispatch(connectionClosed());
      }
    };
  }, [dispatch, token]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInputError(null);

    const operandValues = operandText.split(",");

    if (operandValues.some((value) => value.trim() === "")) {
      setInputError("Each operand must contain a number.");
      return;
    }

    const operands = operandValues.map((value) => Number(value.trim()));

    if (
      operands.length < 1 ||
      operands.length > 100 ||
      operands.some(
        (operand) => !Number.isFinite(operand) || Math.abs(operand) > 1e12,
      )
    ) {
      setInputError(
        "Enter 1 to 100 finite numbers, each with an absolute value of at most 1e12.",
      );
      return;
    }

    if (operation === "divide" && operands.some((operand) => operand === 0)) {
      setInputError("Division by zero is not allowed.");
      return;
    }

    if (status !== "ready" || !socketRef.current?.send({ operation, operands })) {
      setInputError("The calculator is not ready.");
    }
  }

  return (
    <section aria-labelledby="calculator-heading">
      <h2 id="calculator-heading">Calculator</h2>
      <p>Status: {status}</p>
      <form onSubmit={handleSubmit}>
        <label>
          Operation
          <select
            value={operation}
            onChange={(event) =>
              dispatch(
                operationChanged(event.target.value as CalculatorOperation),
              )
            }
          >
            {operations.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Operands
          <input
            required
            value={operandText}
            placeholder="1, 2, 3"
            onChange={(event) => setOperandText(event.target.value)}
          />
        </label>
        <button type="submit" disabled={status !== "ready"}>
          Calculate
        </button>
      </form>
      {inputError && <p role="alert">{inputError}</p>}
      {error && <p role="alert">{error}</p>}
      {result !== null && <p role="status">Result: {result}</p>}
    </section>
  );
}
