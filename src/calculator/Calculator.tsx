import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import WorkspaceHeader from "../components/WorkspaceHeader";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { CalculatorSocket } from "./api";
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

const operations: { value: CalculatorOperation; label: string; symbol: string }[] = [
  { value: "add", label: "Addition", symbol: "+" },
  { value: "subtract", label: "Subtraction", symbol: "−" },
  { value: "multiply", label: "Multiplication", symbol: "×" },
  { value: "divide", label: "Division", symbol: "÷" },
];

type KeyConfig = {
  label: string;
  value: string;
  variant?: "number" | "operator" | "action" | "equals";
};

const keys: KeyConfig[] = [
  { label: "7", value: "7", variant: "number" },
  { label: "8", value: "8", variant: "number" },
  { label: "9", value: "9", variant: "number" },
  { label: "÷", value: "divide", variant: "operator" },
  { label: "4", value: "4", variant: "number" },
  { label: "5", value: "5", variant: "number" },
  { label: "6", value: "6", variant: "number" },
  { label: "×", value: "multiply", variant: "operator" },
  { label: "1", value: "1", variant: "number" },
  { label: "2", value: "2", variant: "number" },
  { label: "3", value: "3", variant: "number" },
  { label: "−", value: "subtract", variant: "operator" },
  { label: "0", value: "0", variant: "number" },
  { label: ".", value: ".", variant: "number" },
  { label: ",", value: ",", variant: "number" },
  { label: "+", value: "add", variant: "operator" },
];

export default function Calculator() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.accessToken);
  const { status, operation, result, error } = useAppSelector(
    (state) => state.calculator,
  );
  const socketRef = useRef<CalculatorSocket | null>(null);
  const [display, setDisplay] = useState("0");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = new CalculatorSocket(
      token,
      (message) => {
        if (message.type === "ready") {
          setIsPending(false);
          dispatch(connectionReady());
        } else if (message.type === "result") {
          setIsPending(false);
          dispatch(resultReceived(message.result));
          setDisplay(String(message.result));
        } else {
          setIsPending(false);
          dispatch(protocolError(message.message));
          setInputError(message.message);
        }
      },
      (message) => {
        setIsPending(false);
        dispatch(connectionError(message));
      },
      () => {
        setIsPending(false);
        dispatch(connectionClosed());
      },
    );

    socketRef.current = socket;
    dispatch(connectionStarted());
    socket.connect();

    return () => {
      const isCurrentSocket = socketRef.current === socket;
      socket.close();

      if (isCurrentSocket) {
        socketRef.current = null;
        setIsPending(false);
        dispatch(connectionClosed());
      }
    };
  }, [connectionAttempt, dispatch, token]);

  function handleKeyPress(key: KeyConfig) {
    setInputError(null);

    if (key.variant === "operator") {
      dispatch(operationChanged(key.value as CalculatorOperation));
      // Append operator marker as comma to separate operands for server
      if (display === "0" || display === "") {
        setDisplay("0,");
      } else if (display.endsWith(",")) {
        // Replace trailing comma
        setDisplay(display.slice(0, -1) + ",");
      } else {
        setDisplay(display + ",");
      }
      return;
    }

    if (key.value === ".") {
      // Add decimal to current number
      const parts = display.split(",");
      const current = parts[parts.length - 1];
      if (current.includes(".")) {
        return;
      }
      if (current === "" || current === "0") {
        parts[parts.length - 1] = "0.";
      } else {
        parts[parts.length - 1] = current + ".";
      }
      setDisplay(parts.join(","));
      return;
    }

    if (key.value === ",") {
      if (display.endsWith(",")) {
        return;
      }
      setDisplay(display + ",");
      return;
    }

    // Number
    if (display === "0") {
      setDisplay(key.value);
    } else {
      const parts = display.split(",");
      const current = parts[parts.length - 1];
      if (current === "0") {
        parts[parts.length - 1] = key.value;
      } else {
        parts[parts.length - 1] = current + key.value;
      }
      setDisplay(parts.join(","));
    }
  }

  function handleClear() {
    setDisplay("0");
    setInputError(null);
    dispatch(resultReceived(null as any));
  }

  function handleEquals(event?: FormEvent) {
    if (event) {
      event.preventDefault();
    }
    setInputError(null);

    if (isPending) {
      return;
    }

    // Build operand list from display
    const operandValues = display.split(",");

    if (operandValues.some((value) => value.trim() === "")) {
      setInputError("Enter valid operands separated by comma.");
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

    if (
      operation === "divide" &&
      operands.slice(1).some((operand) => operand === 0)
    ) {
      setInputError("Division by zero is not allowed.");
      return;
    }

    if (status !== "ready" || !socketRef.current?.send({ operation, numbers: operands })) {
      setInputError("The calculator is not ready.");
      return;
    }

    setIsPending(true);
  }

  const selectedOperation = operations.find((item) => item.value === operation);
  const connectionLabel =
    status === "ready"
      ? "Connected"
      : status === "connecting"
        ? "Connecting"
        : status === "connection-error"
          ? "Connection issue"
          : "Disconnected";

  return (
    <Stack spacing={2}>
      <WorkspaceHeader
        title="Calculator"
        description="Physical calculator interface powered by the authenticated WebSocket service."
        action={
          <Chip
            icon={status === "ready" ? <CheckCircleRoundedIcon /> : <LinkRoundedIcon />}
            color={status === "ready" ? "success" : status === "connection-error" ? "error" : "default"}
            variant="outlined"
            label={connectionLabel}
            sx={{ alignSelf: { xs: "flex-start", sm: "center" }, fontWeight: 600 }}
          />
        }
      />

      {(status === "connection-error" || status === "disconnected") && (
        <Button
          variant="text"
          startIcon={<ReplayRoundedIcon />}
          onClick={() => setConnectionAttempt((current) => current + 1)}
          sx={{ alignSelf: "flex-start" }}
        >
          Reconnect calculator
        </Button>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          pt: { xs: 0, md: 0.5 },
          pb: { xs: 1, md: 2 },
        }}
      >
        <Box
          sx={{
            width: { xs: "100%", sm: 320 },
            background: "linear-gradient(145deg, #1a1a1a 0%, #0f0f0f 100%)",
            borderRadius: { xs: "16px", sm: "24px" },
            padding: { xs: "12px", sm: "24px" },
            boxShadow: "0 40px 80px -40px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.08)",
            position: "relative",
            maxWidth: "calc(100vw - 24px)",
            mx: "auto",
          }}
        >
          <Box
            sx={{
              mb: 2,
              textAlign: "center",
              color: "rgba(255,255,255,0.6)",
              fontSize: { xs: "8px", sm: "11px" },
              letterSpacing: { xs: "0.2em", sm: "0.3em" },
              textTransform: "uppercase",
            }}
          >
            IDICORP CALCULATOR
          </Box>

          <Box
            sx={{
              background: "linear-gradient(180deg, #9ca3af 0%, #6b7280 100%)",
              borderRadius: { xs: "8px", sm: "12px" },
              padding: { xs: "8px 10px", sm: "12px 16px" },
              marginBottom: { xs: "10px", sm: "20px" },
              border: "2px solid #4b5563",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <Box
              sx={{
                background: "#1f2937",
                borderRadius: { xs: "6px", sm: "8px" },
                padding: { xs: "6px 8px", sm: "12px 16px" },
                minHeight: { xs: "48px", sm: "60px" },
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                fontFamily: "'Courier New', monospace",
                fontSize: { xs: "1.2rem", sm: "1.8rem", md: "2.2rem" },
                fontWeight: 700,
                color: "#10b981",
                letterSpacing: "0.05em",
                overflowX: "auto",
                whiteSpace: "nowrap",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
              }}
            >
              {isPending ? "CALC..." : display}
            </Box>
            <Box
              sx={{
                mt: 1,
                textAlign: "right",
                color: "rgba(31, 41, 55, 0.8)",
                fontSize: "10px",
                fontWeight: 600,
              }}
            >
              {selectedOperation?.label.toUpperCase()} • {status === "ready" ? "ONLINE" : "OFFLINE"}
            </Box>
          </Box>

          {inputError && (
            <Alert severity="warning" sx={{ mb: 2, py: 0.5, fontSize: "0.75rem" }}>
              {inputError}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2, py: 0.5, fontSize: "0.75rem" }}>
              {error}
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: { xs: "4px", sm: "10px" },
            }}
          >
            {keys.map((key) => (
              <Button
                key={key.label}
                onClick={() => handleKeyPress(key)}
                disabled={isPending || status !== "ready"}
                sx={{
                  aspectRatio: "1",
                  minHeight: { xs: 38, sm: 52 },
                  borderRadius: { xs: "8px", sm: "12px" },
                  fontSize: { xs: "1rem", sm: "1.4rem" },
                  fontWeight: 700,
                  background:
                    key.variant === "operator"
                      ? "linear-gradient(145deg, #f59e0b 0%, #d97706 100%)"
                      : key.variant === "action"
                        ? "linear-gradient(145deg, #6b7280 0%, #4b5563 100%)"
                        : "linear-gradient(145deg, #374151 0%, #1f2937 100%)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
                  transition: "all 0.1s ease",
                  padding: 0,
                  "&:hover": {
                    background:
                      key.variant === "operator"
                        ? "linear-gradient(145deg, #fbbf24 0%, #f59e0b 100%)"
                        : "linear-gradient(145deg, #4b5563 0%, #374151 100%)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 6px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                  },
                  "&:active": {
                    transform: "translateY(0px)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.2)",
                  },
                  "&:disabled": {
                    opacity: 0.4,
                    transform: "none",
                  },
                }}
              >
                {key.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: { xs: "4px", sm: "10px" }, mt: { xs: "4px", sm: "10px" } }}>
            <Button
              onClick={handleClear}
              disabled={isPending}
              sx={{
                height: { xs: 38, sm: 52 },
                borderRadius: { xs: "8px", sm: "12px" },
                fontSize: { xs: "0.9rem", sm: "1.1rem" },
                fontWeight: 700,
                background: "linear-gradient(145deg, #dc2626 0%, #b91c1c 100%)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
                "&:hover": {
                  background: "linear-gradient(145deg, #ef4444 0%, #dc2626 100%)",
                },
              }}
            >
              AC
            </Button>
            <Button
              onClick={handleEquals}
              disabled={isPending || status !== "ready"}
              sx={{
                height: { xs: 38, sm: 52 },
                borderRadius: { xs: "8px", sm: "12px" },
                fontSize: { xs: "1.2rem", sm: "1.6rem" },
                fontWeight: 800,
                background: "linear-gradient(145deg, #059669 0%, #047857 100%)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
                "&:hover": {
                  background: "linear-gradient(145deg, #10b981 0%, #059669 100%)",
                },
              }}
            >
              {isPending ? <CircularProgress size={20} color="inherit" /> : "="}
            </Button>
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}
